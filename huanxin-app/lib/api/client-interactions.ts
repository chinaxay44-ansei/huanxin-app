import { supabase } from '@/lib/supabase/client'

// 评论接口
export interface Comment {
  id: string
  content: string
  image_url: string | null
  user_id: string
  work_id: string
  parent_id: string | null
  likes_count: number
  created_at: string
  updated_at: string
  user: {
    id: string
    nickname: string
    avatar_url: string | null
  }
  replies?: Comment[]
}

// 点赞接口
export interface Like {
  id: string
  user_id: string
  work_id: string
  created_at: string
}

// 分享接口
export interface Share {
  id: string
  user_id: string
  work_id: string
  platform: string | null
  created_at: string
}

// 获取作品评论列表
export async function getWorkComments(
  workId: string,
  page: number = 1,
  limit: number = 20
): Promise<{ data: Comment[]; hasMore: boolean; error: string | null }> {
  try {
    const offset = (page - 1) * limit

    const { data: comments, error } = await supabase
      .from('comments')
      .select(`
        id,
        content,
        image_url,
        user_id,
        work_id,
        parent_id,
        likes_count,
        created_at,
        updated_at,
        user_profiles!inner(
          id,
          nickname,
          avatar_url
        )
      `)
      .eq('work_id', workId)
      .is('parent_id', null) // 只获取顶级评论
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      return { data: [], hasMore: false, error: error.message }
    }

    // 格式化评论数据
    const formattedComments: Comment[] = comments.map(comment => ({
      id: comment.id,
      content: comment.content,
      image_url: comment.image_url,
      user_id: comment.user_id,
      work_id: comment.work_id,
      parent_id: comment.parent_id,
      likes_count: comment.likes_count,
      created_at: comment.created_at,
      updated_at: comment.updated_at,
      user: {
        id: comment.user_profiles.id,
        nickname: comment.user_profiles.nickname,
        avatar_url: comment.user_profiles.avatar_url
      }
    }))

    // 获取每个评论的回复
    for (const comment of formattedComments) {
      const { data: replies } = await supabase
        .from('comments')
        .select(`
          id,
          content,
          image_url,
          user_id,
          work_id,
          parent_id,
          likes_count,
          created_at,
          updated_at,
          user_profiles!inner(
            id,
            nickname,
            avatar_url
          )
        `)
        .eq('parent_id', comment.id)
        .order('created_at', { ascending: true })
        .limit(3) // 只显示前3个回复

      if (replies) {
        comment.replies = replies.map(reply => ({
          id: reply.id,
          content: reply.content,
          image_url: reply.image_url,
          user_id: reply.user_id,
          work_id: reply.work_id,
          parent_id: reply.parent_id,
          likes_count: reply.likes_count,
          created_at: reply.created_at,
          updated_at: reply.updated_at,
          user: {
            id: reply.user_profiles.id,
            nickname: reply.user_profiles.nickname,
            avatar_url: reply.user_profiles.avatar_url
          }
        }))
      }
    }

    const hasMore = comments.length === limit

    return { data: formattedComments, hasMore, error: null }
  } catch (error) {
    return { data: [], hasMore: false, error: error instanceof Error ? error.message : '获取评论失败' }
  }
}

// 添加评论
export async function addComment(
  workId: string,
  userId: string,
  content: string,
  imageUrl?: string,
  parentId?: string
): Promise<{ data: Comment | null; error: string | null }> {
  try {
    const { data: comment, error } = await supabase
      .from('comments')
      .insert({
        work_id: workId,
        user_id: userId,
        content,
        image_url: imageUrl || null,
        parent_id: parentId || null
      })
      .select(`
        id,
        content,
        image_url,
        user_id,
        work_id,
        parent_id,
        likes_count,
        created_at,
        updated_at,
        user_profiles!inner(
          id,
          nickname,
          avatar_url
        )
      `)
      .single()

    if (error) {
      return { data: null, error: error.message }
    }

    // 更新作品评论数
    await supabase.rpc('increment_comments_count', { work_id: workId })

    const formattedComment: Comment = {
      id: comment.id,
      content: comment.content,
      image_url: comment.image_url,
      user_id: comment.user_id,
      work_id: comment.work_id,
      parent_id: comment.parent_id,
      likes_count: comment.likes_count,
      created_at: comment.created_at,
      updated_at: comment.updated_at,
      user: {
        id: comment.user_profiles.id,
        nickname: comment.user_profiles.nickname,
        avatar_url: comment.user_profiles.avatar_url
      }
    }

    return { data: formattedComment, error: null }
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : '添加评论失败' }
  }
}

// 删除评论
export async function deleteComment(
  commentId: string,
  userId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    // 先检查评论是否属于当前用户
    const { data: comment, error: fetchError } = await supabase
      .from('comments')
      .select('user_id, work_id')
      .eq('id', commentId)
      .maybeSingle()

    if (fetchError && fetchError.code !== 'PGRST116') {
      return { success: false, error: fetchError.message }
    }

    if (!comment) {
      return { success: false, error: '评论不存在' }
    }

    if (comment.user_id !== userId) {
      return { success: false, error: '无权删除此评论' }
    }

    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId)

    if (error) {
      return { success: false, error: error.message }
    }

    // 更新作品评论数
    await supabase.rpc('decrement_comments_count', { work_id: comment.work_id })

    return { success: true, error: null }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : '删除评论失败' }
  }
}

// 检查是否已点赞
export async function checkLikeStatus(
  userId: string,
  workId: string
): Promise<{ isLiked: boolean; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('likes')
      .select('id')
      .eq('user_id', userId)
      .eq('work_id', workId)
      .maybeSingle()

    if (error && error.code !== 'PGRST116') {
      return { isLiked: false, error: error.message }
    }

    return { isLiked: !!data, error: null }
  } catch (error) {
    return { isLiked: false, error: error instanceof Error ? error.message : '检查点赞状态失败' }
  }
}

// 点赞作品
export async function likeWork(
  _userId: string,
  workId: string
): Promise<{ success: boolean; error: string | null; likes_count?: number }> {
  try {
    const res = await fetch('/api/social/like', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ work_id: workId })
    })
    const data = await res.json().catch(() => null)
    if (!res.ok || !data?.success) {
      return { success: false, error: data?.message || '点赞失败' }
    }
    return { success: true, error: null, likes_count: data?.data?.likes_count }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : '点赞失败' }
  }
}

// 检查评论是否已点赞
export async function checkCommentLikeStatus(
  userId: string,
  commentId: string
): Promise<{ isLiked: boolean; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('comment_likes')
      .select('id')
      .eq('user_id', userId)
      .eq('comment_id', commentId)
      .maybeSingle()

    if (error && error.code !== 'PGRST116') {
      return { isLiked: false, error: error.message }
    }

    return { isLiked: !!data, error: null }
  } catch (error) {
    return { isLiked: false, error: error instanceof Error ? error.message : '检查评论点赞状态失败' }
  }
}

// 点赞评论
export async function likeComment(
  userId: string,
  commentId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase
      .from('comment_likes')
      .insert({
        user_id: userId,
        comment_id: commentId
      })

    if (error) {
      return { success: false, error: error.message }
    }

    // 依赖触发器同步 comments.likes_count
    return { success: true, error: null }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : '评论点赞失败' }
  }
}

// 取消点赞评论
export async function unlikeComment(
  userId: string,
  commentId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase
      .from('comment_likes')
      .delete()
      .eq('user_id', userId)
      .eq('comment_id', commentId)

    if (error) {
      return { success: false, error: error.message }
    }

    // 依赖触发器同步 comments.likes_count
    return { success: true, error: null }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : '取消评论点赞失败' }
  }
}

// 取消点赞
export async function unlikeWork(
  _userId: string,
  workId: string
): Promise<{ success: boolean; error: string | null; likes_count?: number }> {
  try {
    const res = await fetch('/api/social/like', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ work_id: workId })
    })
    const data = await res.json().catch(() => null)
    if (!res.ok || !data?.success) {
      return { success: false, error: data?.message || '取消点赞失败' }
    }
    return { success: true, error: null, likes_count: data?.data?.likes_count }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : '取消点赞失败' }
  }
}

// 分享作品
export async function shareWork(
  userId: string,
  workId: string,
  platform?: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase
      .from('shares')
      .insert({
        user_id: userId,
        work_id: workId,
        platform: platform || null
      })

    if (error) {
      return { success: false, error: error.message }
    }

    // 更新作品分享数
    await supabase.rpc('increment_shares_count', { work_id: workId })

    return { success: true, error: null }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : '分享失败' }
  }
}

// 获取热门搜索词
export async function getTrendingSearches(
  limit: number = 10
): Promise<{ data: string[]; error: string | null }> {
  try {
    // 从数据库 trending_searches 表获取关键词，按排序与搜索量降序
    const { data, error } = await supabase
      .from('trending_searches')
      .select('keyword')
      .eq('is_active', true)
      .order('sort_order', { ascending: false })
      .order('search_count', { ascending: false })
      .limit(limit)

    if (error) {
      return { data: [], error: error.message }
    }

    const keywords = (data || []).map((row: { keyword: string }) => row.keyword)
    return { data: keywords, error: null }
  } catch (error) {
    return { data: [], error: error instanceof Error ? error.message : '获取热门搜索失败' }
  }
}

// 搜索作品
export async function searchWorks(
  query: string,
  page: number = 1,
  limit: number = 20
): Promise<{ data: any[]; hasMore: boolean; error: string | null }> {
  try {
    const offset = (page - 1) * limit

    const { data: works, error } = await supabase
      .from('works')
      .select(`
        id,
        title,
        description,
        media_url,
        thumbnail_url,
        type,
        tags,
        likes_count,
        comments_count,
        shares_count,
        views_count,
        created_at,
        user_id,
        users!inner(
          id,
          nickname,
          avatar_url
        )
      `)
      .eq('status', 'published')
      .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      return { data: [], hasMore: false, error: error.message }
    }

    // 格式化数据
    const formattedWorks = works.map(work => ({
      id: work.id,
      title: work.title,
      description: work.description,
      media_url: work.media_url,
      thumbnail_url: work.thumbnail_url,
      media_type: work.type,
      tags: work.tags,
      likes_count: work.likes_count,
      comments_count: work.comments_count,
      shares_count: work.shares_count,
      views_count: work.views_count,
      created_at: work.created_at,
      user: {
        id: work.user_id,
        nickname: work.users.nickname,
        avatar_url: work.users.avatar_url
      }
    }))

    const hasMore = works.length === limit

    return { data: formattedWorks, hasMore, error: null }
  } catch (error) {
    return { data: [], hasMore: false, error: error instanceof Error ? error.message : '搜索失败' }
  }
}

// 搜索用户
export async function searchUsers(
  query: string,
  page: number = 1,
  limit: number = 20
): Promise<{ data: any[]; hasMore: boolean; error: string | null }> {
  try {
    const offset = (page - 1) * limit

    const { data: users, error } = await supabase
      .from('users')
      .select('id, nickname, avatar_url, bio, followers_count, following_count, likes_received_count')
      .or(`nickname.ilike.%${query}%,bio.ilike.%${query}%`)
      .order('followers_count', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      return { data: [], hasMore: false, error: error.message }
    }

    const formatted = (users || []).map(u => ({
      id: u.id,
      nickname: u.nickname,
      avatar_url: u.avatar_url,
      bio: u.bio,
      followers_count: u.followers_count,
      following_count: u.following_count,
      likes_count: u.likes_received_count
    }))
    const hasMore = (users || []).length === limit

    return { data: formatted, hasMore, error: null }
  } catch (error) {
    return { data: [], hasMore: false, error: error instanceof Error ? error.message : '搜索用户失败' }
  }
}
