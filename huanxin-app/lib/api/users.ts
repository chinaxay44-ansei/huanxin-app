import { createServiceClient } from '@/lib/supabase/server'
import { Database } from '@/lib/types/database'
import { NextRequest } from 'next/server'

type UserProfile = Database['public']['Tables']['user_profiles']['Row']
type UserProfileInsert = Database['public']['Tables']['user_profiles']['Insert']
type UserProfileUpdate = Database['public']['Tables']['user_profiles']['Update']
type PersonalTag = Database['public']['Tables']['personal_tags']['Row']
type PersonalTagCategory = Database['public']['Tables']['personal_tag_categories']['Row']
// 前端期望的用户统计字段形状（与数据库列名做映射）
export interface UserStats {
  user_id: string
  total_works: number
  public_works: number
  private_works: number
  liked_works: number
  following_count: number
  followers_count: number
  total_likes_received: number
  total_views_received: number
  total_comments_received: number
  total_shares_received: number
  created_at?: string
  updated_at?: string
}

export interface UpdateProfileRequest {
  nickname?: string
  bio?: string
  avatar_url?: string
  gender?: 'male' | 'female' | 'other'
  birthday?: string
  location?: string
  website?: string
  profession?: string
  education?: string
  relationship_status?: string
  height?: number
  weight?: number
  blood_type?: string
  mbti?: string
  personality_description?: string
  life_motto?: string
  favorite_quote?: string
  hobbies?: string[]
  languages?: string[]
  zodiac_sign?: string
  age_group?: string
  social_links?: Record<string, any>
  privacy_settings?: Record<string, any>
  theme_preference?: string
  notification_settings?: Record<string, any>
}

export interface UserPersonalTag {
  tag_id: string
  tag_name: string
  category_name: string
  category_color: string
  category_icon: string
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// 获取用户详细信息（包含profile）
export async function getUserProfile(request: NextRequest, userId: string): Promise<ApiResponse<{
  user: Database['public']['Tables']['users']['Row']
  profile: UserProfile | null
}>> {
  try {
    const supabase = createServiceClient(request)
    
    // 获取用户基本信息
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (userError) {
      console.error('获取用户信息失败:', userError)
      return {
        success: false,
        error: 'USER_NOT_FOUND',
        message: '用户不存在'
      }
    }
    
    // 获取用户详细资料
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()
    
    // profile 可能不存在，这是正常的
    if (profileError && profileError.code !== 'PGRST116') {
      console.error('获取用户资料失败:', profileError)
    }
    
    return {
      success: true,
      data: {
        user,
        profile: profile || null
      }
    }
  } catch (error) {
    console.error('获取用户资料服务错误:', error)
    return {
      success: false,
      error: 'INTERNAL_ERROR',
      message: '服务器内部错误'
    }
  }
}

// 更新用户资料
export async function updateUserProfile(request: NextRequest, userId: string, updates: UpdateProfileRequest): Promise<ApiResponse<UserProfile>> {
  try {
    const supabase = createServiceClient(request)
    
    // 检查用户是否存在
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single()
    
    if (userError) {
      return {
        success: false,
        error: 'USER_NOT_FOUND',
        message: '用户不存在'
      }
    }
    // 拆分基础字段与扩展字段
    const coreUpdates: Database['public']['Tables']['users']['Update'] = {}
    const profileUpdates: Database['public']['Tables']['user_profiles']['Update'] = {}

    if (updates.nickname !== undefined) coreUpdates.nickname = updates.nickname
    if (updates.bio !== undefined) coreUpdates.bio = updates.bio
    if (updates.avatar_url !== undefined) coreUpdates.avatar_url = updates.avatar_url
    if (updates.gender !== undefined) coreUpdates.gender = updates.gender
    if (updates.birthday !== undefined) coreUpdates.birthday = updates.birthday as any
    if (updates.location !== undefined) coreUpdates.location = updates.location

    if (updates.website !== undefined) profileUpdates.website = updates.website
    if (updates.profession !== undefined) profileUpdates.profession = updates.profession
    if (updates.education !== undefined) profileUpdates.education = updates.education
    if (updates.relationship_status !== undefined) profileUpdates.relationship_status = updates.relationship_status
    if (updates.height !== undefined) profileUpdates.height = updates.height as any
    if (updates.weight !== undefined) profileUpdates.weight = updates.weight as any
    if (updates.blood_type !== undefined) profileUpdates.blood_type = updates.blood_type
    if (updates.mbti !== undefined) profileUpdates.mbti = updates.mbti
    if (updates.personality_description !== undefined) profileUpdates.personality_description = updates.personality_description
    if (updates.life_motto !== undefined) profileUpdates.life_motto = updates.life_motto
    if (updates.favorite_quote !== undefined) profileUpdates.favorite_quote = updates.favorite_quote
    if (updates.hobbies !== undefined) {
      const hob = Array.isArray(updates.hobbies) ? updates.hobbies : (typeof updates.hobbies === 'string' ? updates.hobbies.split(/[，,\s]+/).filter(Boolean) : [])
      profileUpdates.hobbies = hob as any
    }
    if (updates.languages !== undefined) {
      const langs = Array.isArray(updates.languages) ? updates.languages : (typeof updates.languages === 'string' ? updates.languages.split(/[，,\s]+/).filter(Boolean) : [])
      profileUpdates.languages = langs as any
    }
    if (updates.zodiac_sign !== undefined) profileUpdates.zodiac_sign = updates.zodiac_sign
    if (updates.age_group !== undefined) profileUpdates.age_group = updates.age_group
    if (updates.social_links !== undefined) profileUpdates.social_links = updates.social_links as any
    if (updates.privacy_settings !== undefined) profileUpdates.privacy_settings = updates.privacy_settings as any
    if (updates.theme_preference !== undefined) profileUpdates.theme_preference = updates.theme_preference
    if (updates.notification_settings !== undefined) profileUpdates.notification_settings = updates.notification_settings as any
    if (updates.tags !== undefined) profileUpdates.tags = updates.tags as any

    let latestProfile: UserProfile | null = null

    // 先更新基础 users 表
    if (Object.keys(coreUpdates).length > 0) {
      const { error: userUpdateError } = await supabase
        .from('users')
        .update({ ...coreUpdates, updated_at: new Date().toISOString() })
        .eq('id', userId)
      if (userUpdateError) {
        console.error('更新用户基础信息失败:', userUpdateError)
        return {
          success: false,
          error: 'UPDATE_FAILED',
          message: '更新基础信息失败'
        }
      }
    }

    // 再更新/插入扩展 user_profiles 表
    if (Object.keys(profileUpdates).length > 0) {
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('user_id')
        .eq('user_id', userId)
        .single()

      if (existingProfile) {
        const { data, error } = await supabase
          .from('user_profiles')
          .update({ ...profileUpdates, updated_at: new Date().toISOString() })
          .eq('user_id', userId)
          .select()
          .single()
        if (error) {
          console.error('更新扩展资料失败:', error)
          return {
            success: false,
            error: 'UPDATE_FAILED',
            message: '更新扩展资料失败'
          }
        }
        latestProfile = data as any
      } else {
        const { data, error } = await supabase
          .from('user_profiles')
          .insert({ user_id: userId, ...profileUpdates })
          .select()
          .single()
        if (error) {
          console.error('创建扩展资料失败:', error)
          return {
            success: false,
            error: 'UPDATE_FAILED',
            message: '创建扩展资料失败'
          }
        }
        latestProfile = data as any
      }
    } else {
      // 无扩展更新，读取现有资料返回
      const { data } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single()
      latestProfile = (data as any) || null
    }

    return {
      success: true,
      data: latestProfile as any,
      message: '资料更新成功'
    }
  } catch (error) {
    console.error('更新用户资料服务错误:', error)
    return {
      success: false,
      error: 'INTERNAL_ERROR',
      message: '服务器内部错误'
    }
  }
}

// 获取用户统计信息
export async function getUserStats(request: NextRequest, userId: string): Promise<ApiResponse<UserStats>> {
  try {
    const supabase = createServiceClient(request)
    const isValidUuid = typeof userId === 'string' && /^[0-9a-fA-F-]{36}$/.test(userId)
    if (!isValidUuid) {
      return {
        success: false,
        error: 'INVALID_USER_ID',
        message: '用户ID缺失'
      }
    }
    
    // 直接实时计算，不依赖缓存表
    
    // 如果缓存不存在，实时计算（只读返回，不再写入缓存表，避免并发/约束问题）
    const [worksResult, followersResult, followingResult, likedWorksResult] = await Promise.all([
      // 作品数量与汇总统计（选择必要字段，便于在应用层聚合）
      supabase
        .from('works')
        .select('visibility, likes_count, views_count, comments_count, shares_count', { count: 'exact' })
        .eq('user_id', userId),
      
      // 粉丝数量
      supabase
        .from('follows')
        .select('id', { count: 'exact' })
        .eq('following_id', userId),
      
      // 关注数量
      supabase
        .from('follows')
        .select('id', { count: 'exact' })
        .eq('follower_id', userId),

      // 点赞过的作品数量
      supabase
        .from('likes')
        .select('id', { count: 'exact' })
        .eq('user_id', userId)
    ])
    
    // 计算作品统计
    const works = worksResult.data || []
    const totalWorks = worksResult.count ?? works.length
    const publicWorks = works.filter(w => w.visibility === 'public').length
    const privateWorks = works.filter(w => w.visibility === 'private').length
    const likesReceivedCount = works.reduce((sum: number, w: any) => sum + (w.likes_count ?? 0), 0)
    const viewsReceivedCount = works.reduce((sum: number, w: any) => sum + (w.views_count ?? 0), 0)
    const commentsReceivedCount = works.reduce((sum: number, w: any) => sum + (w.comments_count ?? 0), 0)
    const sharesReceivedCount = works.reduce((sum: number, w: any) => sum + (w.shares_count ?? 0), 0)
    const likedWorksCount = likedWorksResult?.count ?? 0
    
    const computed = {
      user_id: userId,
      total_works: totalWorks,
      public_works: publicWorks,
      private_works: privateWorks,
      liked_works: likedWorksCount,
      following_count: followingResult.count || 0,
      followers_count: followersResult.count || 0,
      total_likes_received: likesReceivedCount,
      total_views_received: viewsReceivedCount,
      total_comments_received: commentsReceivedCount,
      total_shares_received: sharesReceivedCount,
    } as UserStats

    return {
      success: true,
      data: computed
    }
  } catch (error) {
    console.error('获取用户统计信息服务错误:', error)
    return {
      success: false,
      error: 'INTERNAL_ERROR',
      message: '服务器内部错误'
    }
  }
}

// 获取用户个人标签
export async function getUserPersonalTags(request: NextRequest, userId: string): Promise<ApiResponse<UserPersonalTag[]>> {
  try {
    const supabase = createServiceClient(request)
    
    const { data, error } = await supabase
      .from('user_personal_tags')
      .select(`
        tag_id,
        personal_tags (
          name,
          personal_tag_categories (
            name,
            color,
            icon
          )
        )
      `)
      .eq('user_id', userId)
    
    if (error) {
      console.error('获取用户个人标签失败:', error)
      return {
        success: false,
        error: 'TAGS_FETCH_FAILED',
        message: '获取个人标签失败'
      }
    }
    
    const formattedTags: UserPersonalTag[] = data.map(item => ({
      tag_id: item.tag_id,
      tag_name: item.personal_tags?.name || '',
      category_name: item.personal_tags?.personal_tag_categories?.name || '',
      category_color: item.personal_tags?.personal_tag_categories?.color || '',
      category_icon: item.personal_tags?.personal_tag_categories?.icon || ''
    }))
    
    return {
      success: true,
      data: formattedTags
    }
  } catch (error) {
    console.error('获取用户个人标签服务错误:', error)
    return {
      success: false,
      error: 'INTERNAL_ERROR',
      message: '服务器内部错误'
    }
  }
}

// 更新用户个人标签
export async function updateUserPersonalTags(request: NextRequest, userId: string, tagIds: string[]): Promise<ApiResponse<void>> {
  try {
    const supabase = createServiceClient(request)
    
    // 删除现有标签
    await supabase
      .from('user_personal_tags')
      .delete()
      .eq('user_id', userId)
    
    // 添加新标签
    if (tagIds.length > 0) {
      const tagData = tagIds.map(tagId => ({
        user_id: userId,
        tag_id: tagId
      }))
      
      const { error } = await supabase
        .from('user_personal_tags')
        .insert(tagData)
      
      if (error) {
        console.error('更新用户个人标签失败:', error)
        return {
          success: false,
          error: 'TAGS_UPDATE_FAILED',
          message: '更新个人标签失败'
        }
      }
    }
    
    return {
      success: true,
      message: '个人标签更新成功'
    }
  } catch (error) {
    console.error('更新用户个人标签服务错误:', error)
    return {
      success: false,
      error: 'INTERNAL_ERROR',
      message: '服务器内部错误'
    }
  }
}

// 获取所有个人标签分类和标签
export async function getPersonalTagsWithCategories(request: NextRequest): Promise<ApiResponse<PersonalTagCategory[]>> {
  try {
    const supabase = createServiceClient(request)
    
    const { data, error } = await supabase
      .from('personal_tag_categories')
      .select(`
        *,
        personal_tags (*)
      `)
      .eq('is_active', true)
      .order('sort_order')
    
    if (error) {
      console.error('获取个人标签分类失败:', error)
      return {
        success: false,
        error: 'CATEGORIES_FETCH_FAILED',
        message: '获取标签分类失败'
      }
    }
    
    return {
      success: true,
      data: data
    }
  } catch (error) {
    console.error('获取个人标签分类服务错误:', error)
    return {
      success: false,
      error: 'INTERNAL_ERROR',
      message: '服务器内部错误'
    }
  }
}

// 获取用户作品列表
export async function getUserWorks(request: NextRequest, userId: string, visibility?: 'public' | 'private', limit: number = 20, offset: number = 0): Promise<ApiResponse<{
  works: Database['public']['Tables']['works']['Row'][]
  total: number
}>> {
  try {
    const supabase = createServiceClient(request)

    try {
      const { data: gens } = await supabase
        .from('ai_generations')
        .select('id, user_id, output_url, status, prompt, template_id, generation_params, created_at')
        .eq('user_id', userId)
        .eq('status', 'completed')
        .not('output_url', 'is', null)
        .order('created_at', { ascending: false })
        .limit(200)
      if (Array.isArray(gens) && gens.length > 0) {
        const outputUrls = gens
          .map(gen => (typeof gen.output_url === 'string' ? gen.output_url : null))
          .filter((url): url is string => !!url)

        if (outputUrls.length > 0) {
          const { data: existingList } = await supabase
            .from('works')
            .select('media_url')
            .eq('user_id', userId)
            .in('media_url', outputUrls)

          const existingSet = new Set(
            (existingList || []).map(item => (item.media_url || '').toLowerCase())
          )

          const rowsToInsert = gens
            .filter(gen => {
              const url = typeof gen.output_url === 'string' ? gen.output_url : ''
              return !!url && !existingSet.has(url.toLowerCase())
            })
            .map(gen => {
              const mediaUrl = gen.output_url as string
              const lower = mediaUrl.toLowerCase()
              const isImage = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'].some(ext => lower.includes(ext))
              const isVideo = ['.mp4', '.mov', '.webm', '.m4v', '.avi', '.mpeg'].some(ext => lower.includes(ext))
              const mediaType: 'image' | 'video' = isVideo ? 'video' : 'image'
              const promptText = typeof gen.prompt === 'string' ? gen.prompt : ''
              const title = promptText ? (promptText.length > 20 ? promptText.slice(0, 20) + '…' : promptText) : '用户还没有给作品取名'

              return {
                user_id: userId,
                title,
                description: null,
                media_url: mediaUrl,
                type: mediaType,
                thumbnail_url: mediaUrl,
                tags: [],
                is_ai_generated: true,
                template_id: gen.template_id ?? null,
                generation_params: gen.generation_params ?? null,
                status: 'published',
                visibility: 'private',
              }
            })

          if (rowsToInsert.length > 0) {
            await supabase
              .from('works')
              .upsert(rowsToInsert, { onConflict: 'user_id,media_url' })
          }
        }
      }
    } catch {}
    
    let query = supabase
      .from('works')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (visibility) {
      query = query.eq('visibility', visibility)
    } else {
      // 默认仅返回公开已发布作品
      query = query.eq('status', 'published').eq('visibility', 'public')
    }
    
    const { data, error, count } = await query
    
    if (error) {
      console.error('获取用户作品失败:', error)
      return {
        success: false,
        error: 'WORKS_FETCH_FAILED',
        message: '获取作品列表失败'
      }
    }
    
    return {
      success: true,
      data: {
        works: data || [],
        total: count || 0
      }
    }
  } catch (error) {
    console.error('获取用户作品服务错误:', error)
    return {
      success: false,
      error: 'INTERNAL_ERROR',
      message: '服务器内部错误'
    }
  }
}

// 搜索用户
export async function searchUsers(request: NextRequest, query: string, limit: number = 20, offset: number = 0): Promise<ApiResponse<{
  users: Array<{
    user: Database['public']['Tables']['users']['Row']
    profile: UserProfile | null
  }>
  total: number
}>> {
  try {
    const supabase = createServiceClient(request)
    
    // 搜索用户（通过昵称或用户名）
    const { data: users, error: usersError, count } = await supabase
      .from('users')
      .select(`
        *,
        user_profiles (*)
      `, { count: 'exact' })
      .or(`nickname.ilike.%${query}%,username.ilike.%${query}%`)
      .range(offset, offset + limit - 1)
    
    if (usersError) {
      console.error('搜索用户失败:', usersError)
      return {
        success: false,
        error: 'SEARCH_FAILED',
        message: '搜索失败'
      }
    }
    
    // 格式化返回数据
    const formattedUsers = users.map(user => ({
      user: {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        created_at: user.created_at,
        updated_at: user.updated_at
      },
      profile: Array.isArray(user.user_profiles) && user.user_profiles.length > 0 
        ? user.user_profiles[0] 
        : null
    }))
    
    return {
      success: true,
      data: {
        users: formattedUsers,
        total: count || 0
      }
    }
  } catch (error) {
    console.error('搜索用户服务错误:', error)
    return {
      success: false,
      error: 'INTERNAL_ERROR',
      message: '服务器内部错误'
    }
  }
}
