import { supabase } from '@/lib/supabase/client'

// 用户信息接口（来自 users 表 + 补充字段）
export interface UserProfile {
  id: string
  nickname: string
  avatar_url: string | null
  bio: string | null
  location: string | null
  gender: string | null
  birth_date: string | null
  zodiac_sign: string | null
  following_count: number
  followers_count: number
  likes_count: number
  works_count: number
  created_at: string
  updated_at: string
}

// 关注关系接口
export interface FollowRelation {
  id: string
  follower_id: string
  following_id: string
  created_at: string
  follower: UserProfile
  following: UserProfile
}

// 获取用户信息
export async function getUserProfile(userId: string): Promise<{ data: UserProfile | null; error: string | null }> {
  try {
    // 通过服务端 API 获取用户资料，避免客户端直查 users 触发RLS
    const response = await fetch(`/api/users/${userId}?includeStats=true`)
    const result = await response.json()

    if (!result.success) {
      const message = response.status === 401 ? '请先登录' : (result.message || '获取用户信息失败')
      return { data: null, error: message }
    }

    const { user, profile, stats } = result.data
    const combined: UserProfile = {
      id: user.id,
      nickname: user.nickname,
      avatar_url: user.avatar_url ?? null,
      bio: profile?.bio ?? null,
      location: profile?.location ?? null,
      gender: profile?.gender ?? user.gender ?? null,
      birth_date: user.birthday ?? null,
      zodiac_sign: profile?.zodiac_sign ?? null,
      following_count: stats?.following_count ?? user.following_count ?? 0,
      followers_count: stats?.followers_count ?? user.followers_count ?? 0,
      likes_count: stats?.total_likes_received ?? user.likes_received_count ?? 0,
      works_count: stats?.total_works ?? user.works_count ?? 0,
      created_at: user.created_at,
      updated_at: user.updated_at
    }

    return { data: combined, error: null }
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : '获取用户信息失败' }
  }
}

// 获取用户作品列表
export async function getUserWorks(
  userId: string, 
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
        created_at,
        user_id
      `)
      .eq('user_id', userId)
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      return { data: [], hasMore: false, error: error.message }
    }

    // 关联作者信息（users 表）
    const userIds = Array.from(new Set((works || []).map(w => w.user_id)))
    let usersMap: Record<string, { nickname: string; avatar_url: string | null }> = {}
    if (userIds.length > 0) {
      const { data: usersData } = await supabase
        .from('users')
        .select('id, nickname, avatar_url')
        .in('id', userIds)
      usersMap = (usersData || []).reduce((map, u) => {
        map[u.id] = { nickname: u.nickname, avatar_url: u.avatar_url }
        return map
      }, {} as Record<string, { nickname: string; avatar_url: string | null }>)
    }

    // 格式化数据
    const formattedWorks = (works || []).map(work => ({
      id: work.id,
      title: work.title,
      description: work.description,
      media_url: work.media_url,
      thumbnail_url: work.thumbnail_url,
      media_type: work.type, // 映射字段名
      tags: work.tags,
      likes: work.likes_count,
      comments: work.comments_count,
      shares: work.shares_count,
      created_at: work.created_at,
      user: {
        id: work.user_id,
        nickname: usersMap[work.user_id]?.nickname || '未知用户',
        avatar_url: usersMap[work.user_id]?.avatar_url || null
      }
    }))

    const hasMore = works.length === limit

    return { data: formattedWorks, hasMore, error: null }
  } catch (error) {
    return { data: [], hasMore: false, error: error instanceof Error ? error.message : '获取用户作品失败' }
  }
}

// 获取用户点赞的作品列表
export async function getUserLikedWorks(
  userId: string,
  page: number = 1,
  limit: number = 20
): Promise<{ data: any[]; hasMore: boolean; error: string | null }> {
  try {
    const offset = (page - 1) * limit

    const { data: likedWorks, error } = await supabase
      .from('likes')
      .select(`
        created_at,
        works!inner(
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
          created_at,
          user_id
        )
      `)
      .eq('user_id', userId)
      .eq('works.status', 'published')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      return { data: [], hasMore: false, error: error.message }
    }

    // 关联作者信息（users 表）
    const workUserIds = Array.from(new Set((likedWorks || []).map(like => like.works.user_id)))
    let usersMap: Record<string, { nickname: string; avatar_url: string | null }> = {}
    if (workUserIds.length > 0) {
      const { data: usersData } = await supabase
        .from('users')
        .select('id, nickname, avatar_url')
        .in('id', workUserIds)
      usersMap = (usersData || []).reduce((map, u) => {
        map[u.id] = { nickname: u.nickname, avatar_url: u.avatar_url }
        return map
      }, {} as Record<string, { nickname: string; avatar_url: string | null }>)
    }

    // 格式化数据
    const formattedWorks = (likedWorks || []).map(like => ({
      id: like.works.id,
      title: like.works.title,
      description: like.works.description,
      media_url: like.works.media_url,
      thumbnail_url: like.works.thumbnail_url,
      media_type: like.works.type,
      tags: like.works.tags,
      likes: like.works.likes_count,
      comments: like.works.comments_count,
      shares: like.works.shares_count,
      created_at: like.works.created_at,
      liked_at: like.created_at,
      user: {
        id: like.works.user_id,
        nickname: usersMap[like.works.user_id]?.nickname || '未知用户',
        avatar_url: usersMap[like.works.user_id]?.avatar_url || null
      }
    }))

    const hasMore = likedWorks.length === limit

    return { data: formattedWorks, hasMore, error: null }
  } catch (error) {
    return { data: [], hasMore: false, error: error instanceof Error ? error.message : '获取点赞作品失败' }
  }
}

// 检查是否关注某用户
export async function checkFollowStatus(
  followerId: string, 
  followingId: string
): Promise<{ isFollowing: boolean; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', followerId)
      .eq('following_id', followingId)
      .maybeSingle()

    if (error && error.code !== 'PGRST116') { // PGRST116 是没有找到记录的错误码
      return { isFollowing: false, error: error.message }
    }

    return { isFollowing: !!data, error: null }
  } catch (error) {
    return { isFollowing: false, error: error instanceof Error ? error.message : '检查关注状态失败' }
  }
}

// 检查是否互相关注
export async function checkMutualStatus(
  userA: string,
  userB: string
): Promise<{ isMutual: boolean; error: string | null }> {
  try {
    const aToB = await checkFollowStatus(userA, userB)
    const bToA = await checkFollowStatus(userB, userA)
    if (aToB.error || bToA.error) {
      return { isMutual: false, error: aToB.error || bToA.error }
    }
    return { isMutual: aToB.isFollowing && bToA.isFollowing, error: null }
  } catch (error) {
    return { isMutual: false, error: error instanceof Error ? error.message : '检查互相关注失败' }
  }
}

// 关注用户
export async function followUser(
  followerId: string, 
  followingId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const res = await fetch('/api/social/follow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      cache: 'no-store',
      body: JSON.stringify({ following_id: followingId })
    })
    const result = await res.json()
    if (!res.ok || !result.success) {
      return { success: false, error: result.message || '关注失败' }
    }
    return { success: true, error: null }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : '关注失败' }
  }
}

// 取消关注用户
export async function unfollowUser(
  followerId: string, 
  followingId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const res = await fetch(`/api/social/follow?following_id=${encodeURIComponent(followingId)}`, {
      method: 'DELETE',
      credentials: 'include',
      cache: 'no-store'
    })
    const result = await res.json()
    if (!res.ok || !result.success) {
      return { success: false, error: result.message || '取消关注失败' }
    }
    return { success: true, error: null }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : '取消关注失败' }
  }
}

// 创建私聊会话
export async function createConversation(
  targetUserId: string
): Promise<{ success: boolean; conversationId?: string; error: string | null }> {
  try {
    let headers: Record<string, string> = { 'Content-Type': 'application/json' }
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null
      if (token) headers['Authorization'] = `Bearer ${token}`
    } catch {}
    const res = await fetch('/api/messages/conversations', {
      method: 'POST',
      headers,
      credentials: 'include',
      cache: 'no-store',
      body: JSON.stringify({ target_user_id: targetUserId })
    })
    const result = await res.json()
    if (!res.ok || !result.success) {
      // 尝试回退：从列表中查找现有会话
      try {
        const listRes = await fetch(`/api/messages/conversations?limit=50`, { headers, credentials: 'include', cache: 'no-store' })
        const listJson = await listRes.json()
        if (listRes.ok && listJson.success && Array.isArray(listJson.data)) {
          const found = listJson.data.find((c: any) => c.other_user?.id === targetUserId)
          if (found?.id) {
            return { success: true, conversationId: found.id, error: null }
          }
        }
      } catch {}
      return { success: false, error: result.message || '创建会话失败' }
    }
    // 正常返回或会话已存在
    let convId = result?.data?.id
    if (!convId) {
      // 回退：再查一次列表获取ID
      try {
        const listRes = await fetch(`/api/messages/conversations?limit=50`, { headers, credentials: 'include', cache: 'no-store' })
        const listJson = await listRes.json()
        if (listRes.ok && listJson.success && Array.isArray(listJson.data)) {
          const found = listJson.data.find((c: any) => c.other_user?.id === targetUserId)
          if (found?.id) convId = found.id
        }
      } catch {}
    }
    if (convId) return { success: true, conversationId: convId, error: null }
    return { success: false, error: '创建成功但未获取到会话ID' }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : '创建会话失败' }
  }
}

// 获取关注列表
export async function getFollowingList(
  userId: string,
  page: number = 1,
  limit: number = 20
): Promise<{ data: UserProfile[]; hasMore: boolean; error: string | null }> {
  try {
    const offset = (page - 1) * limit

    const { data: follows, error } = await supabase
      .from('follows')
      .select('created_at, following_id')
      .eq('follower_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      return { data: [], hasMore: false, error: error.message }
    }

    const targetIds = Array.from(new Set((follows || []).map(f => f.following_id)))
    let users: UserProfile[] = []
    if (targetIds.length > 0) {
      const { data: usersData } = await supabase
        .from('users')
        .select('id, nickname, avatar_url, bio, location, gender, birthday, following_count, followers_count, likes_received_count, works_count, created_at, updated_at')
        .in('id', targetIds)

      // 可选补充 zodiac_sign
      const { data: profilesData } = await supabase
        .from('user_profiles')
        .select('user_id, zodiac_sign')
        .in('user_id', targetIds)

      const zodiacMap = (profilesData || []).reduce((map, p) => {
        map[p.user_id] = p.zodiac_sign
        return map
      }, {} as Record<string, string | null>)

      users = (usersData || []).map(u => ({
        id: u.id,
        nickname: u.nickname,
        avatar_url: u.avatar_url,
        bio: u.bio,
        location: u.location,
        gender: u.gender,
        birth_date: u.birthday,
        zodiac_sign: zodiacMap[u.id] ?? null,
        following_count: u.following_count,
        followers_count: u.followers_count,
        likes_count: u.likes_received_count,
        works_count: u.works_count,
        created_at: u.created_at,
        updated_at: u.updated_at
      }))
    }

    const hasMore = (follows || []).length === limit
    return { data: users, hasMore, error: null }
  } catch (error) {
    return { data: [], hasMore: false, error: error instanceof Error ? error.message : '获取关注列表失败' }
  }
}

// 获取粉丝列表
export async function getFollowersList(
  userId: string,
  page: number = 1,
  limit: number = 20
): Promise<{ data: UserProfile[]; hasMore: boolean; error: string | null }> {
  try {
    const offset = (page - 1) * limit

    const { data: follows, error } = await supabase
      .from('follows')
      .select('created_at, follower_id')
      .eq('following_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      return { data: [], hasMore: false, error: error.message }
    }

    const sourceIds = Array.from(new Set((follows || []).map(f => f.follower_id)))
    let users: UserProfile[] = []
    if (sourceIds.length > 0) {
      const { data: usersData } = await supabase
        .from('users')
        .select('id, nickname, avatar_url, bio, location, gender, birthday, following_count, followers_count, likes_received_count, works_count, created_at, updated_at')
        .in('id', sourceIds)

      const { data: profilesData } = await supabase
        .from('user_profiles')
        .select('user_id, zodiac_sign')
        .in('user_id', sourceIds)

      const zodiacMap = (profilesData || []).reduce((map, p) => {
        map[p.user_id] = p.zodiac_sign
        return map
      }, {} as Record<string, string | null>)

      users = (usersData || []).map(u => ({
        id: u.id,
        nickname: u.nickname,
        avatar_url: u.avatar_url,
        bio: u.bio,
        location: u.location,
        gender: u.gender,
        birth_date: u.birthday,
        zodiac_sign: zodiacMap[u.id] ?? null,
        following_count: u.following_count,
        followers_count: u.followers_count,
        likes_count: u.likes_received_count,
        works_count: u.works_count,
        created_at: u.created_at,
        updated_at: u.updated_at
      }))
    }

    const hasMore = (follows || []).length === limit
    return { data: users, hasMore, error: null }
  } catch (error) {
    return { data: [], hasMore: false, error: error instanceof Error ? error.message : '获取粉丝列表失败' }
  }
}
