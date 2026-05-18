import { supabase } from '@/lib/supabase/client'
import { shuffleArray } from '@/lib/utils/shuffle'

// 视频接口
export interface Video {
  id: string
  title: string
  description: string | null
  media_url: string
  thumbnail_url: string | null
  duration: number | null
  tags: string[]
  likes_count: number
  comments_count: number
  shares_count: number
  views_count: number
  created_at: string
  user_id: string
  user: {
    id: string
    nickname: string
    avatar_url: string | null
  }
}

// 视频评论接口
export interface VideoComment {
  id: string
  content: string
  created_at: string
  user_id: string
  video_id: string
  parent_id: string | null
  likes_count: number
  user: {
    id: string
    nickname: string
    avatar_url: string | null
  }
  replies?: VideoComment[]
}

// 获取视频列表
export async function getVideosList(
  page: number = 1,
  limit: number = 10,
  category?: string,
  userId?: string
): Promise<{ data: Video[]; hasMore: boolean; error: string | null }> {
  try {
    const offset = (page - 1) * limit

    let query = supabase
      .from('works')
      .select(
        `id,title,description,media_url,thumbnail_url,duration,tags,likes_count,comments_count,shares_count,views_count,created_at,user_id`
      )
      .eq('type', 'video')
      .eq('status', 'published')

    if (category) {
      query = query.eq('category', category)
    }

    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data: works, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      return { data: [], hasMore: false, error: error.message }
    }

    const userIds = [...new Set((works || []).map(w => w.user_id))]
    let usersMap: Record<string, { id: string; nickname: string; avatar_url: string | null }> = {}

    if (userIds.length > 0) {
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id,nickname,avatar_url')
        .in('id', userIds)

      if (!usersError && users) {
        usersMap = Object.fromEntries(users.map(u => [u.id, u]))
      }
    }

    const raw: Video[] = (works || []).map(w => ({
      ...w,
      user: usersMap[w.user_id] || { id: w.user_id, nickname: '未知用户', avatar_url: null }
    }))
    const nowMs = Date.now()
    const videos = raw.map(v => {
      const t = new Date(v.created_at).getTime()
      const hours = Math.max(0, (nowMs - t) / (1000 * 60 * 60))
      const boost = hours <= 24 ? 0.15 : (hours <= 24 * 7 ? 0.07 : 0)
      return { v, s: Math.random() + boost }
    }).sort((a, b) => b.s - a.s).map(x => x.v)
    const hasMore = videos.length === limit
    return { data: videos, hasMore, error: null }
  } catch (error) {
    return { data: [], hasMore: false, error: error instanceof Error ? error.message : '获取视频列表失败' }
  }
}

// 获取热门视频
export async function getTrendingVideos(
  page: number = 1,
  limit: number = 10,
  timeRange: 'day' | 'week' | 'month' = 'week'
): Promise<{ data: Video[]; hasMore: boolean; error: string | null }> {
  try {
    const offset = (page - 1) * limit
    
    // 计算时间范围
    const now = new Date()
    let startDate: Date
    
    switch (timeRange) {
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        break
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
    }

    const { data: works, error } = await supabase
      .from('works')
      .select('id,title,description,media_url,thumbnail_url,duration,tags,likes_count,comments_count,shares_count,views_count,created_at,user_id')
      .eq('type', 'video')
      .eq('status', 'published')
      .gte('created_at', startDate.toISOString())
      .order('likes_count', { ascending: false })
      .order('views_count', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      return { data: [], hasMore: false, error: error.message }
    }

    if (error) {
      return { data: [], hasMore: false, error: error.message }
    }

    const userIds = [...new Set((works || []).map(w => w.user_id))]
    let usersMap: Record<string, { id: string; nickname: string; avatar_url: string | null }> = {}

    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('id,nickname,avatar_url')
        .in('id', userIds)
      usersMap = Object.fromEntries((users || []).map(u => [u.id, u]))
    }

    const raw: Video[] = (works || []).map(w => ({
      ...w,
      user: usersMap[w.user_id] || { id: w.user_id, nickname: '未知用户', avatar_url: null }
    }))
    const nowMs = Date.now()
    const videos = raw.map(v => {
      const t = new Date(v.created_at).getTime()
      const hours = Math.max(0, (nowMs - t) / (1000 * 60 * 60))
      const boost = hours <= 24 ? 0.15 : (hours <= 24 * 7 ? 0.07 : 0)
      return { v, s: Math.random() + boost }
    }).sort((a, b) => b.s - a.s).map(x => x.v)
    const hasMore = videos.length === limit
    return { data: videos, hasMore, error: null }
  } catch (error) {
    return { data: [], hasMore: false, error: error instanceof Error ? error.message : '获取热门视频失败' }
  }
}

// 获取视频详情
export async function getVideoDetail(
  videoId: string,
  userId?: string
): Promise<{ data: Video | null; error: string | null }> {
  try {
    const { data: w, error } = await supabase
      .from('works')
      .select('id,title,description,media_url,thumbnail_url,duration,tags,likes_count,comments_count,shares_count,views_count,created_at,user_id')
      .eq('id', videoId)
      .eq('type', 'video')
      .single()

    if (error) {
      return { data: null, error: error.message }
    }

    let userObj: { id: string; nickname: string; avatar_url: string | null } | undefined
    if (w?.user_id) {
      const { data: u } = await supabase
        .from('users')
        .select('id,nickname,avatar_url')
        .eq('id', w.user_id)
        .single()
      userObj = u || { id: w.user_id, nickname: '未知用户', avatar_url: null }
    }

    // 增加观看次数
    if (userId && w && userId !== w.user_id) {
      await supabase
        .from('works')
        .update({ views_count: (w.views_count || 0) + 1 })
        .eq('id', videoId)
      w.views_count = (w.views_count || 0) + 1
    }

    const video: Video = { ...w, user: userObj! }
    return { data: video, error: null }
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : '获取视频详情失败' }
  }
}

// 获取视频评论
export async function getVideoComments(
  videoId: string,
  page: number = 1,
  limit: number = 20
): Promise<{ data: VideoComment[]; hasMore: boolean; error: string | null }> {
  try {
    const offset = (page - 1) * limit

    const { data: baseComments, error } = await supabase
      .from('comments')
      .select('id,content,created_at,user_id,work_id,parent_id,likes_count')
      .eq('work_id', videoId)
      .is('parent_id', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      return { data: [], hasMore: false, error: error.message }
    }

    const topUserIds = [...new Set((baseComments || []).map(c => c.user_id))]
    const { data: usersTop } = await supabase
      .from('users')
      .select('id,nickname,avatar_url')
      .in('id', topUserIds)
    const usersTopMap = Object.fromEntries((usersTop || []).map(u => [u.id, u]))

    // 获取每个评论的回复
    const commentsWithReplies = await Promise.all(
      (baseComments || []).map(async (comment) => {
        const { data: repliesBase } = await supabase
          .from('comments')
          .select('id,content,created_at,user_id,work_id,parent_id,likes_count')
          .eq('parent_id', comment.id)
          .order('created_at', { ascending: true })
          .limit(3)

        const replyUserIds = [...new Set((repliesBase || []).map(r => r.user_id))]
        const { data: replyUsers } = await supabase
          .from('users')
          .select('id,nickname,avatar_url')
          .in('id', replyUserIds)
        const replyUsersMap = Object.fromEntries((replyUsers || []).map(u => [u.id, u]))

        const replies: VideoComment[] = (repliesBase || []).map(r => ({
          id: r.id,
          content: r.content,
          created_at: r.created_at,
          user_id: r.user_id,
          video_id: r.work_id,
          parent_id: r.parent_id,
          likes_count: r.likes_count || 0,
          user: replyUsersMap[r.user_id] || { id: r.user_id, nickname: '未知用户', avatar_url: null }
        }))

        return {
          id: comment.id,
          content: comment.content,
          created_at: comment.created_at,
          user_id: comment.user_id,
          video_id: comment.work_id,
          parent_id: comment.parent_id,
          likes_count: comment.likes_count || 0,
          user: usersTopMap[comment.user_id] || { id: comment.user_id, nickname: '未知用户', avatar_url: null },
          replies
        }
      })
    )

    const hasMore = (baseComments || []).length === limit

    return { data: commentsWithReplies, hasMore, error: null }
  } catch (error) {
    return { data: [], hasMore: false, error: error instanceof Error ? error.message : '获取视频评论失败' }
  }
}

// 添加视频评论
export async function addVideoComment(
  videoId: string,
  userId: string,
  content: string,
  parentId?: string
): Promise<{ data: VideoComment | null; error: string | null }> {
  try {
    const { data: comment, error } = await supabase
      .from('comments')
      .insert({
        work_id: videoId,
        user_id: userId,
        content,
        parent_id: parentId || null
      })
      .select('id,content,created_at,user_id,work_id,parent_id,likes_count')
      .single()

    if (error) {
      return { data: null, error: error.message }
    }

    // 更新视频评论数
    const { error: updateError } = await supabase.rpc('increment_comments_count', {
      work_id: videoId
    })

    if (updateError) {
      console.error('Failed to update comments count:', updateError)
    }

    const { data: u } = await supabase
      .from('users')
      .select('id,nickname,avatar_url')
      .eq('id', comment.user_id)
      .single()

    return {
      data: {
        id: comment.id,
        content: comment.content,
        created_at: comment.created_at,
        user_id: comment.user_id,
        video_id: comment.work_id,
        parent_id: comment.parent_id,
        likes_count: comment.likes_count || 0,
        user: u || { id: comment.user_id, nickname: '未知用户', avatar_url: null },
        replies: []
      },
      error: null
    }
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : '添加评论失败' }
  }
}

// 搜索视频
export async function searchVideos(
  query: string,
  page: number = 1,
  limit: number = 20,
  category?: string
): Promise<{ data: Video[]; hasMore: boolean; error: string | null }> {
  try {
    const offset = (page - 1) * limit
    
    let supabaseQuery = supabase
      .from('works')
      .select('id,title,description,media_url,thumbnail_url,duration,tags,likes_count,comments_count,shares_count,views_count,created_at,user_id')
      .eq('type', 'video')
      .eq('status', 'published')

    // 添加搜索条件
    if (query) {
      supabaseQuery = supabaseQuery.or(`title.ilike.%${query}%,description.ilike.%${query}%,tags.cs.{${query}}`)
    }

    // 添加分类过滤
    if (category) {
      supabaseQuery = supabaseQuery.eq('category', category)
    }

    const { data: works, error } = await supabaseQuery
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      return { data: [], hasMore: false, error: error.message }
    }

    const userIds = [...new Set((works || []).map(w => w.user_id))]
    const { data: users } = await supabase
      .from('users')
      .select('id,nickname,avatar_url')
      .in('id', userIds)
    const usersMap = Object.fromEntries((users || []).map(u => [u.id, u]))

    const videos: Video[] = (works || []).map(w => ({
      ...w,
      user: usersMap[w.user_id] || { id: w.user_id, nickname: '未知用户', avatar_url: null }
    }))

    const hasMore = videos.length === limit

    return { data: videos, hasMore, error: null }
  } catch (error) {
    return { data: [], hasMore: false, error: error instanceof Error ? error.message : '搜索视频失败' }
  }
}

// 获取推荐视频（基于用户喜好）
export async function getRecommendedVideos(
  userId: string,
  page: number = 1,
  limit: number = 10
): Promise<{ data: Video[]; hasMore: boolean; error: string | null }> {
  try {
    const offset = (page - 1) * limit

    // 简单的推荐算法：基于用户点赞的作品类别和标签
    const { data: userLikes } = await supabase
      .from('likes')
      .select('work_id')
      .eq('user_id', userId)
      .limit(50)

    let categories: string[] = []
    let tags: string[] = []

    const likedWorkIds = (userLikes || []).map(l => l.work_id)
    if (likedWorkIds.length > 0) {
      const { data: likedWorks } = await supabase
        .from('works')
        .select('id,category,tags')
        .in('id', likedWorkIds)

      (likedWorks || []).forEach(w => {
        if (w.category) categories.push(w.category)
        if (w.tags) tags.push(...w.tags)
      })
    }

    // 去重
    categories = [...new Set(categories)]
    tags = [...new Set(tags)]

    let query = supabase
      .from('works')
      .select('id,title,description,media_url,thumbnail_url,duration,tags,likes_count,comments_count,shares_count,views_count,created_at,user_id')
      .eq('type', 'video')
      .eq('status', 'published')
      .neq('user_id', userId)

    // 如果有用户偏好数据，添加推荐条件
    if (categories.length > 0 || tags.length > 0) {
      const conditions = []
      if (categories.length > 0) {
        conditions.push(`category.in.(${categories.join(',')})`)
      }
      if (tags.length > 0) {
        conditions.push(`tags.ov.{${tags.join(',')}}`)
      }
      query = query.or(conditions.join(','))
    }

    const fetchEnd = Math.max(limit + offset - 1, limit - 1)
    const { data: works, error } = await query
      .order('likes_count', { ascending: false })
      .order('created_at', { ascending: false })
      .range(0, fetchEnd)

    if (error) {
      return { data: [], hasMore: false, error: error.message }
    }

    const randomizedWorks = shuffleArray(works || [])
    const slicedWorks = randomizedWorks.slice(offset, offset + limit)

    const userIds = [...new Set(slicedWorks.map(w => w.user_id))]
    const { data: users } = await supabase
      .from('users')
      .select('id,nickname,avatar_url')
      .in('id', userIds)
    const usersMap = Object.fromEntries((users || []).map(u => [u.id, u]))

    const videos: Video[] = slicedWorks.map(w => ({
      ...w,
      user: usersMap[w.user_id] || { id: w.user_id, nickname: '未知用户', avatar_url: null }
    }))

    const hasMore = videos.length === limit

    return { data: videos, hasMore, error: null }
  } catch (error) {
    return { data: [], hasMore: false, error: error instanceof Error ? error.message : '获取推荐视频失败' }
  }
}
