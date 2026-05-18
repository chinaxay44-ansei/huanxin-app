import { createServiceClient } from '@/lib/supabase/server'
import { Database } from '@/lib/types/database'

type Follow = Database['public']['Tables']['follows']['Row']
type Like = Database['public']['Tables']['likes']['Row']
type Comment = Database['public']['Tables']['comments']['Row']
type CommentLike = Database['public']['Tables']['comment_likes']['Row']
type Share = Database['public']['Tables']['shares']['Row']

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

async function refreshWorkLikesCount(supabase: ReturnType<typeof createServiceClient>, workId: string): Promise<number | undefined> {
  try {
    const { count, error } = await supabase
      .from('likes')
      .select('*', { count: 'exact', head: true })
      .eq('work_id', workId)
    if (error) throw error
    const next = count ?? 0
    const { error: updateError } = await supabase
      .from('works')
      .update({ likes_count: next })
      .eq('id', workId)
    if (updateError) throw updateError
    return next
  } catch (err) {
    console.error('更新作品点赞数失败:', err)
    return undefined
  }
}

export interface CreateCommentRequest {
  work_id: string
  content: string
  parent_id?: string
}

export interface CommentWithReplies extends Comment {
  user: {
    id: string
    nickname: string
    avatar_url?: string
  }
  reply_to_user?: {
    id: string
    nickname: string
    avatar_url?: string
  }
  likes_count: number
  replies_count: number
  is_liked?: boolean
  replies?: CommentWithReplies[]
}

// 关注用户
export async function followUser(followerId: string, followingId: string): Promise<ApiResponse> {
  try {
    const supabase = createServiceClient()
    
    // 检查是否已经关注
    const { data: existingFollow, error: followCheckError } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', followerId)
      .eq('following_id', followingId)
      .maybeSingle()
    if (followCheckError && followCheckError.code !== 'PGRST116') {
      console.error('检查关注关系失败:', followCheckError)
      return {
        success: false,
        error: 'FOLLOW_CHECK_FAILED',
        message: '检查关注状态失败'
      }
    }
    
    if (existingFollow) {
      return {
        success: false,
        error: 'ALREADY_FOLLOWING',
        message: '已经关注了该用户'
      }
    }
    
    // 不能关注自己
    if (followerId === followingId) {
      return {
        success: false,
        error: 'CANNOT_FOLLOW_SELF',
        message: '不能关注自己'
      }
    }
    
    // 检查被关注用户是否存在
    const { data: targetUser, error: targetUserError } = await supabase
      .from('users')
      .select('id')
      .eq('id', followingId)
      .maybeSingle()
    
    if (!targetUser) {
      if (targetUserError && targetUserError.code !== 'PGRST116') {
        console.error('查询用户失败:', targetUserError)
      }
      return {
        success: false,
        error: 'USER_NOT_FOUND',
        message: '用户不存在'
      }
    }
    
    // 创建关注记录
    const { error } = await supabase
      .from('follows')
      .insert({
        follower_id: followerId,
        following_id: followingId
      })
    
    if (error) {
      console.error('关注用户失败:', error)
      return {
        success: false,
        error: 'FOLLOW_FAILED',
        message: '关注失败'
      }
    }
    // 关注后自动创建会话（单向好友聊天）
    try {
      await createPrivateConversation(followerId, followingId)
    } catch (e) {}
    
    return {
      success: true,
      message: '关注成功'
    }
  } catch (error) {
    console.error('关注用户服务错误:', error)
    return {
      success: false,
      error: 'INTERNAL_ERROR',
      message: '服务器内部错误'
    }
  }
}

// 取消关注用户
export async function unfollowUser(followerId: string, followingId: string): Promise<ApiResponse> {
  try {
    const supabase = createServiceClient()
    
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', followerId)
      .eq('following_id', followingId)
    
    if (error) {
      console.error('取消关注失败:', error)
      return {
        success: false,
        error: 'UNFOLLOW_FAILED',
        message: '取消关注失败'
      }
    }
    
    return {
      success: true,
      message: '取消关注成功'
    }
  } catch (error) {
    console.error('取消关注服务错误:', error)
    return {
      success: false,
      error: 'INTERNAL_ERROR',
      message: '服务器内部错误'
    }
  }
}

export async function ensureOfficialMutualFollow(userId: string): Promise<ApiResponse> {
  try {
    const supabase = createServiceClient()
    const officialId = '00000000-0000-0000-0000-000000000001'
    if (userId === officialId) return { success: true }
    const { data: f1 } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', userId)
      .eq('following_id', officialId)
      .maybeSingle()
    if (!f1) {
      await supabase.from('follows').insert({ follower_id: userId, following_id: officialId })
    }
    const { data: f2 } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', officialId)
      .eq('following_id', userId)
      .maybeSingle()
    if (!f2) {
      await supabase.from('follows').insert({ follower_id: officialId, following_id: userId })
    }
    return { success: true }
  } catch (e) {
    return { success: false, error: 'INTERNAL_ERROR' }
  }
}

// 点赞作品
export async function likeWork(userId: string, workId: string): Promise<ApiResponse> {
  try {
    const supabase = createServiceClient()
    
    // 检查是否已经点赞
    const { data: existingLike, error: likeCheckError } = await supabase
      .from('likes')
      .select('id')
      .eq('user_id', userId)
      .eq('work_id', workId)
      .maybeSingle()
    
    if (existingLike) {
      return {
        success: false,
        error: 'ALREADY_LIKED',
        message: '已经点赞了该作品'
      }
    }
    if (likeCheckError && likeCheckError.code !== 'PGRST116') {
      console.error('查询点赞状态失败:', likeCheckError)
      return {
        success: false,
        error: 'LIKE_CHECK_FAILED',
        message: '点赞失败'
      }
    }
    
    // 检查作品是否存在
    const { data: work, error: workError } = await supabase
      .from('works')
      .select('id')
      .eq('id', workId)
      .maybeSingle()
    
    if (!work) {
      if (workError && workError.code !== 'PGRST116') {
        console.error('查询作品失败:', workError)
      }
      return {
        success: false,
        error: 'WORK_NOT_FOUND',
        message: '作品不存在'
      }
    }
    
    // 创建点赞记录
    const { error } = await supabase
      .from('likes')
      .insert({
        user_id: userId,
        work_id: workId
      })
    
    if (error) {
      console.error('点赞作品失败:', error)
      return {
        success: false,
        error: 'LIKE_FAILED',
        message: '点赞失败'
      }
    }
    const likesCount = await refreshWorkLikesCount(supabase, workId)
    
    return {
      success: true,
      data: {
        likes_count: likesCount
      },
      message: '点赞成功'
    }
  } catch (error) {
    console.error('点赞作品服务错误:', error)
    return {
      success: false,
      error: 'INTERNAL_ERROR',
      message: '服务器内部错误'
    }
  }
}

// 取消点赞作品
export async function unlikeWork(userId: string, workId: string): Promise<ApiResponse> {
  try {
    const supabase = createServiceClient()
    
    const { error } = await supabase
      .from('likes')
      .delete()
      .eq('user_id', userId)
      .eq('work_id', workId)
    
    if (error) {
      console.error('取消点赞失败:', error)
      return {
        success: false,
        error: 'UNLIKE_FAILED',
        message: '取消点赞失败'
      }
    }
    const likesCount = await refreshWorkLikesCount(supabase, workId)
    
    return {
      success: true,
      data: {
        likes_count: likesCount
      },
      message: '取消点赞成功'
    }
  } catch (error) {
    console.error('取消点赞服务错误:', error)
    return {
      success: false,
      error: 'INTERNAL_ERROR',
      message: '服务器内部错误'
    }
  }
}

// 创建评论（支持一级/二级，返回附带用户信息的结构）
// 触发器 comment_set_defaults 会自动设置 root_id
export async function createComment(userId: string, commentData: CreateCommentRequest): Promise<ApiResponse<CommentWithReplies>> {
  try {
    const supabase = createServiceClient()
    
    const { data: work, error: workError } = await supabase.from('works').select('id').eq('id', commentData.work_id).maybeSingle()
    
    if (!work) {
      if (workError && workError.code !== 'PGRST116') {
        console.error('查询作品失败:', workError)
      }
      return {
        success: false,
        error: 'WORK_NOT_FOUND',
        message: '作品不存在'
      }
    }
    
    // 如果是回复评论，检查父评论是否存在
    if (commentData.parent_id) {
      const { data: parentComment, error: parentError } = await supabase
        .from('comments')
        .select('id, work_id')
        .eq('id', commentData.parent_id)
        .maybeSingle()
      
      if (!parentComment) {
        if (parentError && parentError.code !== 'PGRST116') {
          console.error('查询父评论失败:', parentError)
        }
        return {
          success: false,
          error: 'PARENT_COMMENT_NOT_FOUND',
          message: '父评论不存在'
        }
      }
      
      // 确保父评论属于同一个作品
      if (parentComment.work_id !== commentData.work_id) {
        return {
          success: false,
          error: 'INVALID_PARENT_COMMENT',
          message: '父评论不属于该作品'
        }
      }
    }
    
    // 触发器会自动处理 root_id 和 reply_to_user_id
    const { data, error } = await supabase
      .from('comments')
      .insert({
        user_id: userId,
        work_id: commentData.work_id,
        content: commentData.content,
        parent_id: commentData.parent_id || null
      })
      .select('*')
      .single()
    
    if (error) {
      console.error('创建评论失败:', error)
      return {
        success: false,
        error: 'CREATE_COMMENT_FAILED',
        message: error.message || '评论失败'
      }
    }
    
    const { data: userRow } = await supabase
      .from('users')
      .select('id,nickname,avatar_url')
      .eq('id', userId)
      .maybeSingle()

    let replyToUser: { id: string; nickname: string; avatar_url?: string } | undefined
    if (data.reply_to_user_id) {
      const { data: replyUser } = await supabase
        .from('users')
        .select('id,nickname,avatar_url')
        .eq('id', data.reply_to_user_id)
        .maybeSingle()
      if (replyUser) {
        replyToUser = {
          id: replyUser.id,
          nickname: replyUser.nickname || '用户',
          avatar_url: replyUser.avatar_url || undefined
        }
      } else {
        replyToUser = {
          id: data.reply_to_user_id,
          nickname: '用户'
        }
      }
    }

    return {
      success: true,
      data: {
        ...data,
        likes_count: data?.likes_count || 0,
        replies_count: data?.replies_count || 0,
        is_liked: false,
        user: {
          id: userRow?.id || userId,
          nickname: userRow?.nickname || '新用户',
          avatar_url: userRow?.avatar_url || undefined
        },
        replies: [],
        reply_to_user: replyToUser
      } as any,
      message: '评论成功'
    }
  } catch (error) {
    console.error('创建评论服务错误:', error)
    return {
      success: false,
      error: 'INTERNAL_ERROR',
      message: '服务器内部错误'
    }
  }
}

// 获取作品评论列表（带热门/最新排序，附带最多2条预览回复）
export async function getWorkComments(
  workId: string,
  userId?: string,
  limit = 20,
  offset = 0,
  sort: 'hot' | 'latest' = 'hot'
): Promise<ApiResponse<{
  comments: Array<CommentWithReplies & { replies_preview?: CommentWithReplies[] }>
  total: number
}>> {
  try {
    const supabase = createServiceClient()
    
    const baseQuery = supabase
      .from('comments')
      .select('*', { count: 'exact' })
      .eq('work_id', workId)
      .is('parent_id', null)
      .eq('status', 'published')
      .is('deleted_at', null)
    const ordered =
      sort === 'hot'
        ? baseQuery.order('likes_count', { ascending: false }).order('replies_count', { ascending: false }).order('created_at', { ascending: false })
        : baseQuery.order('created_at', { ascending: false })

    const { data: comments, error, count } = await ordered.range(offset, offset + limit - 1)
    
    if (error) {
      console.error('获取评论列表失败:', error)
      return {
        success: false,
        error: 'FETCH_COMMENTS_FAILED',
        message: '获取评论列表失败'
      }
    }
    
    if (!comments || comments.length === 0) {
      return {
        success: true,
        data: {
          comments: [],
          total: count || 0
        }
      }
    }
    
    const commentIds = comments.map(c => c.id)
    const { data: repliesRaw } = commentIds.length
      ? await supabase
          .from('comments')
          .select('*')
          .in('parent_id', commentIds)
          .eq('status', 'published')
          .is('deleted_at', null)
          .order('created_at', { ascending: true })
      : { data: [] as Comment[] }

    const userIds = Array.from(
      new Set([
        ...comments.map(c => c.user_id),
        ...repliesRaw.map(r => r.user_id),
        ...repliesRaw.map(r => r.reply_to_user_id).filter(Boolean) as string[],
        ...comments.map(c => c.reply_to_user_id).filter(Boolean) as string[]
      ])
    )
    const { data: users } = userIds.length
      ? await supabase.from('users').select('id,nickname,avatar_url').in('id', userIds)
      : { data: [] as any[] }
    const userMap = Object.fromEntries((users || []).map(u => [u.id, u]))

    const allCommentIds = [...commentIds, ...(repliesRaw || []).map(r => r.id)]
    const likedSet = new Set<string>()
    if (userId && allCommentIds.length) {
      const { data: likedRows } = await supabase
        .from('comment_likes')
        .select('comment_id')
        .eq('user_id', userId)
        .in('comment_id', allCommentIds)
      ;(likedRows || []).forEach(row => likedSet.add(row.comment_id))
    }

    const repliesByParent = (repliesRaw || []).reduce<Record<string, Comment[]>>((acc, reply) => {
      const key = reply.parent_id || ''
      if (!acc[key]) acc[key] = []
      acc[key].push(reply)
      return acc
    }, {})

    const mapRow = (row: Comment): CommentWithReplies => ({
      ...row,
      likes_count: row.likes_count ?? 0,
      replies_count: row.replies_count ?? 0,
      is_liked: likedSet.has(row.id),
      user: {
        id: row.user_id,
        nickname: userMap[row.user_id]?.nickname || '用户',
        avatar_url: userMap[row.user_id]?.avatar_url || undefined
      },
      reply_to_user: row.reply_to_user_id
        ? {
            id: row.reply_to_user_id,
            nickname: userMap[row.reply_to_user_id]?.nickname || '用户',
            avatar_url: userMap[row.reply_to_user_id]?.avatar_url || undefined
          }
        : undefined
    })

    const formattedComments = comments.map(comment => {
      const replies = (repliesByParent[comment.id] || []).slice(0, 2).map(mapRow)
      return {
        ...mapRow(comment),
        replies_preview: replies
      }
    })

    return {
      success: true,
      data: {
        comments: formattedComments,
        total: count || 0
      }
    }
  } catch (error) {
    console.error('获取评论列表服务错误:', error)
    return {
      success: false,
      error: 'INTERNAL_ERROR',
      message: '服务器内部错误'
    }
  }
}

// 获取评论回复列表（按时间正序）
export async function getCommentReplies(commentId: string, userId?: string, limit = 10, offset = 0): Promise<ApiResponse<{
  replies: CommentWithReplies[]
  total: number
}>> {
  try {
    const supabase = createServiceClient()
    
    const { data: replies, error, count } = await supabase
      .from('comments')
      .select('*', { count: 'exact' })
      .eq('parent_id', commentId)
      .eq('status', 'published')
      .is('deleted_at', null)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1)
    
    if (error) {
      console.error('获取评论回复失败:', error)
      return {
        success: false,
        error: 'FETCH_REPLIES_FAILED',
        message: '获取评论回复失败'
      }
    }
    
    if (!replies || replies.length === 0) {
      return {
        success: true,
        data: {
          replies: [],
          total: count || 0
        }
      }
    }
    
    const userIds = Array.from(
      new Set([
        ...replies.map(r => r.user_id),
        ...replies.map(r => r.reply_to_user_id).filter(Boolean) as string[]
      ])
    )
    const { data: users } = userIds.length
      ? await supabase.from('users').select('id,nickname,avatar_url').in('id', userIds)
      : { data: [] as any[] }
    const userMap = Object.fromEntries((users || []).map(u => [u.id, u]))

    const likedSet = new Set<string>()
    if (userId && replies.length) {
      const { data: likedRows } = await supabase
        .from('comment_likes')
        .select('comment_id')
        .eq('user_id', userId)
        .in('comment_id', replies.map(r => r.id))
      ;(likedRows || []).forEach(row => likedSet.add(row.comment_id))
    }

    const formattedReplies: CommentWithReplies[] = replies.map(reply => ({
      ...reply,
      likes_count: reply.likes_count ?? 0,
      replies_count: reply.replies_count ?? 0,
      is_liked: likedSet.has(reply.id),
      user: {
        id: reply.user_id,
        nickname: userMap[reply.user_id]?.nickname || '用户',
        avatar_url: userMap[reply.user_id]?.avatar_url || undefined
      },
      reply_to_user: reply.reply_to_user_id
        ? {
            id: reply.reply_to_user_id,
            nickname: userMap[reply.reply_to_user_id]?.nickname || '用户',
            avatar_url: userMap[reply.reply_to_user_id]?.avatar_url || undefined
          }
        : undefined
    }))
    
    return {
      success: true,
      data: {
        replies: formattedReplies,
        total: count || 0
      }
    }
  } catch (error) {
    console.error('获取评论回复服务错误:', error)
    return {
      success: false,
      error: 'INTERNAL_ERROR',
      message: '服务器内部错误'
    }
  }
}

// 点赞评论
export async function likeComment(userId: string, commentId: string): Promise<ApiResponse<{ likes_count: number }>> {
  try {
    const supabase = createServiceClient()
    
    // 检查评论是否存在
    const { data: comment, error: commentError } = await supabase.from('comments').select('id').eq('id', commentId).maybeSingle()
    if (!comment) {
      if (commentError && commentError.code !== 'PGRST116') {
        console.error('查询评论失败:', commentError)
      }
      return {
        success: false,
        error: 'COMMENT_NOT_FOUND',
        message: '评论不存在'
      }
    }
    
    const { error } = await supabase.from('comment_likes').insert({ user_id: userId, comment_id: commentId })
    if (error && error.code !== '23505') {
      console.error('点赞评论失败:', error)
      return { success: false, error: 'LIKE_COMMENT_FAILED', message: '点赞失败' }
    }

    const { data: updated } = await supabase.from('comments').select('likes_count').eq('id', commentId).maybeSingle()
    
    return {
      success: true,
      data: { likes_count: updated?.likes_count ?? 0 },
      message: '点赞成功'
    }
  } catch (error) {
    console.error('点赞评论服务错误:', error)
    return {
      success: false,
      error: 'INTERNAL_ERROR',
      message: '服务器内部错误'
    }
  }
}

// 取消点赞评论
export async function unlikeComment(userId: string, commentId: string): Promise<ApiResponse<{ likes_count: number }>> {
  try {
    const supabase = createServiceClient()
    
    const { error } = await supabase.from('comment_likes').delete().eq('user_id', userId).eq('comment_id', commentId)
    if (error) {
      console.error('取消点赞评论失败:', error)
      return {
        success: false,
        error: 'UNLIKE_COMMENT_FAILED',
        message: '取消点赞失败'
      }
    }

    const { data: updated } = await supabase.from('comments').select('likes_count').eq('id', commentId).maybeSingle()
    
    return {
      success: true,
      data: { likes_count: updated?.likes_count ?? 0 },
      message: '取消点赞成功'
    }
  } catch (error) {
    console.error('取消点赞评论服务错误:', error)
    return {
      success: false,
      error: 'INTERNAL_ERROR',
      message: '服务器内部错误'
    }
  }
}

// 分享作品
export async function shareWork(userId: string, workId: string, platform?: string): Promise<ApiResponse> {
  try {
    const supabase = createServiceClient()
    
    // 检查作品是否存在
    const { data: work, error: workError } = await supabase
      .from('works')
      .select('id')
      .eq('id', workId)
      .maybeSingle()
    
    if (!work) {
      if (workError && workError.code !== 'PGRST116') {
        console.error('查询作品失败:', workError)
      }
      return {
        success: false,
        error: 'WORK_NOT_FOUND',
        message: '作品不存在'
      }
    }
    
    // 创建分享记录
    const { error } = await supabase
      .from('shares')
      .insert({
        user_id: userId,
        work_id: workId,
        platform: platform || 'app'
      })
    
    if (error) {
      console.error('分享作品失败:', error)
      return {
        success: false,
        error: 'SHARE_FAILED',
        message: '分享失败'
      }
    }
    
    return {
      success: true,
      message: '分享成功'
    }
  } catch (error) {
    console.error('分享作品服务错误:', error)
    return {
      success: false,
      error: 'INTERNAL_ERROR',
      message: '服务器内部错误'
    }
  }
}
