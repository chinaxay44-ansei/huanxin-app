import { createServiceClient } from '@/lib/supabase/server'
import { shuffleArray } from '@/lib/utils/shuffle'

// 搜索结果接口
export interface SearchResult {
  works: any[]
  users: any[]
  total_works: number
  total_users: number
}

// 推荐内容接口
export interface RecommendationResult {
  works: any[]
  users: any[]
}

// 搜索作品
export async function searchWorks(
  query: string,
  options: {
    limit?: number
    offset?: number
    category_id?: string
    sort_by?: 'relevance' | 'created_at' | 'views' | 'likes'
    user_id?: string // 用于个性化搜索
  } = {}
) {
  try {
    const supabase = createServiceClient()
    const { limit = 20, offset = 0, category_id, sort_by = 'relevance', user_id } = options
    
    // 基于单表查询，后续服务端拼装关联数据
    let worksQuery = supabase
      .from('works')
      .select('*')
      .eq('status', 'published')
    
    // 添加搜索条件
    if (query.trim()) {
      worksQuery = worksQuery.or(`title.ilike.%${query}%,description.ilike.%${query}%,tags.cs.{${query}}`)
    }
    
    // 添加分类过滤（支持 slug 或 uuid）
    if (category_id) {
      let targetCategoryId: string | null = null
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (uuidRegex.test(category_id)) {
        targetCategoryId = category_id
      } else {
        const { data: cat } = await supabase
          .from('categories')
          .select('id, slug')
          .eq('slug', category_id)
          .maybeSingle()
        targetCategoryId = cat?.id ?? null
      }
      if (targetCategoryId) {
        worksQuery = worksQuery.eq('category', targetCategoryId)
      }
    }
    
    // 添加排序
    switch (sort_by) {
      case 'created_at':
        worksQuery = worksQuery.order('created_at', { ascending: false })
        break
      case 'views':
        worksQuery = worksQuery.order('views_count', { ascending: false })
        break
      case 'likes':
        worksQuery = worksQuery.order('likes_count', { ascending: false })
        break
      default: // relevance
        // 简单的相关性排序：标题匹配优先，然后按创建时间或热度
        if (query.trim()) {
          worksQuery = worksQuery.order('created_at', { ascending: false })
        } else {
          worksQuery = worksQuery.order('views_count', { ascending: false })
        }
    }
    
    // 添加分页
    worksQuery = worksQuery.range(offset, offset + limit - 1)
    
    const { data: works, error } = await worksQuery
    
    if (error) {
      console.error('搜索作品错误:', error)
      return {
        success: false,
        error: 'SEARCH_FAILED',
        message: '搜索失败'
      }
    }
    
    // 获取总数
    let countQuery = supabase
      .from('works')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'published')
    
    if (query.trim()) {
      countQuery = countQuery.or(`title.ilike.%${query}%,description.ilike.%${query}%`)
    }
    
    if (category_id) {
      let targetCategoryId: string | null = null
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (uuidRegex.test(category_id)) {
        targetCategoryId = category_id
      } else {
        const { data: cat } = await supabase
          .from('categories')
          .select('id, slug')
          .eq('slug', category_id)
          .maybeSingle()
        targetCategoryId = cat?.id ?? null
      }
      if (targetCategoryId) {
        countQuery = countQuery.eq('category', targetCategoryId)
      }
    }
    
    const { count } = await countQuery
    
    // 服务端拼装：用户与分类信息
    const userIds = Array.from(new Set((works || []).map(w => w.user_id).filter(Boolean)))
    const categorySlugs = Array.from(new Set((works || []).map(w => w.category).filter(Boolean)))

    let userMap: Record<string, { id: string; nickname: string; avatar_url: string | null }> = {}
    if (userIds.length > 0) {
      const { data: usersData } = await supabase
        .from('users')
        .select('id, nickname, avatar_url')
        .in('id', userIds)
      ;(usersData || []).forEach(u => {
        userMap[u.id] = { id: u.id, nickname: u.nickname, avatar_url: u.avatar_url }
      })
    }

    let categoryMapBySlug: Record<string, { id: string; name: string; slug: string }> = {}
    if (categorySlugs.length > 0) {
      const { data: categoriesData } = await supabase
        .from('categories')
        .select('id, name, slug')
        .in('slug', categorySlugs as string[])
      ;(categoriesData || []).forEach(c => {
        categoryMapBySlug[c.slug] = { id: c.id, name: c.name, slug: c.slug }
      })
    }

    const formattedWorks = (works || []).map(work => ({
      id: work.id,
      title: work.title ?? '',
      description: work.description ?? null,
      media_url: work.media_url,
      thumbnail_url: work.thumbnail_url,
      media_type: work.type, // 映射字段
      tags: work.tags || [],
      likes_count: work.likes_count || 0,
      comments_count: work.comments_count || 0,
      shares_count: work.shares_count || 0,
      views_count: work.views_count || 0,
      created_at: work.created_at,
      user: userMap[work.user_id] || { id: work.user_id, nickname: '', avatar_url: null },
      category: work.category ? categoryMapBySlug[work.category] : undefined
    }))
    
    return {
      success: true,
      data: {
        works: formattedWorks,
        total: count || 0
      }
    }
  } catch (error) {
    console.error('搜索作品异常:', error)
    return {
      success: false,
      error: 'INTERNAL_ERROR',
      message: '服务器内部错误'
    }
  }
}

// 搜索用户
export async function searchUsers(
  query: string,
  options: {
    limit?: number
    offset?: number
    user_id?: string // 当前用户ID，用于排除自己和显示关注状态
  } = {}
) {
  try {
    const supabase = createServiceClient()
    const { limit = 20, offset = 0, user_id } = options
    
    let usersQuery = supabase
      .from('users')
      .select(`
        id,
        nickname,
        avatar_url,
        bio,
        followers_count,
        following_count,
        works_count
      `)
    
    // 添加搜索条件
    if (query.trim()) {
      usersQuery = usersQuery.ilike('nickname', `%${query}%`)
    }
    
    // 排除当前用户
    if (user_id) {
      usersQuery = usersQuery.neq('id', user_id)
    }
    
    // 按粉丝数排序
    usersQuery = usersQuery
      .order('followers_count', { ascending: false })
      .range(offset, offset + limit - 1)
    
    const { data: users, error } = await usersQuery
    
    if (error) {
      console.error('搜索用户错误:', error)
      return {
        success: false,
        error: 'SEARCH_FAILED',
        message: '搜索失败'
      }
    }
    
    // 如果有当前用户ID，检查关注状态
    let usersWithFollowStatus = users || []
    if (user_id && users && users.length > 0) {
      const userIds = users.map(u => u.id)
      const { data: follows } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user_id)
        .in('following_id', userIds)
      
      const followingIds = new Set(follows?.map(f => f.following_id) || [])
      
      usersWithFollowStatus = users.map(user => ({
        ...user,
        is_following: followingIds.has(user.id)
      }))
    }
    
    // 获取总数
    let countQuery = supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
    
    if (query.trim()) {
      countQuery = countQuery.ilike('nickname', `%${query}%`)
    }
    
    if (user_id) {
      countQuery = countQuery.neq('id', user_id)
    }
    
    const { count } = await countQuery
    
    return {
      success: true,
      data: {
        users: usersWithFollowStatus,
        total: count || 0
      }
    }
  } catch (error) {
    console.error('搜索用户异常:', error)
    return {
      success: false,
      error: 'INTERNAL_ERROR',
      message: '服务器内部错误'
    }
  }
}

// 综合搜索
export async function searchAll(
  query: string,
  options: {
    limit?: number
    user_id?: string
  } = {}
) {
  try {
    const { limit = 10, user_id } = options
    
    // 并行搜索作品和用户
    const [worksResult, usersResult] = await Promise.all([
      searchWorks(query, { limit, user_id }),
      searchUsers(query, { limit, user_id })
    ])
    
    if (!worksResult.success || !usersResult.success) {
      return {
        success: false,
        error: 'SEARCH_FAILED',
        message: '搜索失败'
      }
    }
    
    return {
      success: true,
      data: {
        works: worksResult.data.works,
        users: usersResult.data.users,
        total_works: worksResult.data.total,
        total_users: usersResult.data.total
      }
    }
  } catch (error) {
    console.error('综合搜索异常:', error)
    return {
      success: false,
      error: 'INTERNAL_ERROR',
      message: '服务器内部错误'
    }
  }
}

// 获取热门搜索关键词
export async function getHotSearchKeywords(limit: number = 10) {
  try {
    const supabase = createServiceClient()
    
    // 这里可以从搜索日志表获取热门关键词
    // 暂时返回一些预设的热门关键词
    const hotKeywords = [
      'AI写真',
      '古风',
      '现代',
      '动漫',
      '写实',
      '梦幻',
      '科幻',
      '复古',
      '清新',
      '唯美'
    ]
    
    return {
      success: true,
      data: {
        keywords: hotKeywords.slice(0, limit)
      }
    }
  } catch (error) {
    console.error('获取热门搜索关键词异常:', error)
    return {
      success: false,
      error: 'INTERNAL_ERROR',
      message: '服务器内部错误'
    }
  }
}

// 推荐作品（基于用户行为）
export async function getRecommendedWorks(
  user_id: string,
  options: {
    limit?: number
    offset?: number
  } = {}
) {
  try {
    const supabase = createServiceClient()
    const { limit = 20, offset = 0 } = options
    
    const { data: likedWorks } = await supabase
      .from('likes')
      .select('work_id')
      .eq('user_id', user_id)
    const likedWorkIds = (likedWorks || []).map(l => l.work_id)

    let preferredCategories: string[] = []
    if (likedWorkIds.length > 0) {
      const { data: likedWorkDetails } = await supabase
        .from('works')
        .select('category')
        .in('id', likedWorkIds)
      preferredCategories = Array.from(new Set((likedWorkDetails || []).map(w => w.category).filter(Boolean))) as string[]
    }

    let worksQuery = supabase
      .from('works')
      .select('*')
      .eq('status', 'published')
      .neq('user_id', user_id)

    if (preferredCategories.length > 0) {
      worksQuery = worksQuery.in('category', preferredCategories)
    }

    if (likedWorkIds.length > 0) {
      worksQuery = worksQuery.not('id', 'in', `(${likedWorkIds.join(',')})`)
    }

    worksQuery = worksQuery
      .order('likes_count', { ascending: false })
      .order('views_count', { ascending: false })

    const fetchEnd = Math.max(limit + offset - 1, limit - 1)
    const { data: works, error } = await worksQuery.range(0, fetchEnd)

    if (error) {
      console.error('获取推荐作品错误:', error)
      return {
        success: false,
        error: 'RECOMMENDATION_FAILED',
        message: '获取推荐失败'
      }
    }

    const randomizedWorks = shuffleArray(works || [])
    const slicedWorks = randomizedWorks.slice(offset, offset + limit)

    const userIds = Array.from(new Set(slicedWorks.map(w => w.user_id).filter(Boolean)))
    const categorySlugs = Array.from(new Set(slicedWorks.map(w => w.category).filter(Boolean)))

    let userMap: Record<string, { id: string; nickname: string; avatar_url: string | null }> = {}
    if (userIds.length > 0) {
      const { data: usersData } = await supabase
        .from('users')
        .select('id, nickname, avatar_url')
        .in('id', userIds)
      ;(usersData || []).forEach(u => {
        userMap[u.id] = { id: u.id, nickname: u.nickname, avatar_url: u.avatar_url }
      })
    }

    let categoryMapBySlug: Record<string, { id: string; name: string; slug: string }> = {}
    if (categorySlugs.length > 0) {
      const { data: categoriesData } = await supabase
        .from('categories')
        .select('id, name, slug')
        .in('slug', categorySlugs as string[])
      ;(categoriesData || []).forEach(c => {
        categoryMapBySlug[c.slug] = { id: c.id, name: c.name, slug: c.slug }
      })
    }

    const formattedWorks = slicedWorks.map(work => ({
      id: work.id,
      title: work.title ?? '',
      description: work.description ?? null,
      media_url: work.media_url,
      thumbnail_url: work.thumbnail_url,
      media_type: work.type,
      tags: work.tags || [],
      likes_count: work.likes_count || 0,
      comments_count: work.comments_count || 0,
      shares_count: work.shares_count || 0,
      views_count: work.views_count || 0,
      created_at: work.created_at,
      user: userMap[work.user_id] || { id: work.user_id, nickname: '', avatar_url: null },
      category: work.category ? categoryMapBySlug[work.category] : undefined
    }))

    return {
      success: true,
      data: {
        works: formattedWorks
      }
    }
  } catch (error) {
    console.error('获取推荐作品异常:', error)
    return {
      success: false,
      error: 'INTERNAL_ERROR',
      message: '服务器内部错误'
    }
  }
}

export async function getRecommendedUsers(
  user_id: string,
  options: {
    limit?: number
    offset?: number
  } = {}
) {
  try {
    const supabase = createServiceClient()
    const { limit = 20, offset = 0 } = options
    
    // 获取当前用户已关注的用户ID
    const { data: followingUsers } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user_id)
    const followingIds = followingUsers?.map(f => f.following_id) || []

    let usersQuery = supabase
      .from('users')
      .select(`
        id,
        nickname,
        avatar_url,
        bio,
        followers_count,
        following_count,
        works_count
      `)
      .neq('id', user_id)

    if (followingIds.length > 0) {
      usersQuery = usersQuery.not('id', 'in', `(${followingIds.join(',')})`)
    }

    usersQuery = usersQuery
      .order('works_count', { ascending: false })
      .order('followers_count', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data: users, error } = await usersQuery

    if (error) {
      console.error('获取推荐用户错误:', error)
      return {
        success: false,
        error: 'RECOMMENDATION_FAILED',
        message: '获取推荐失败'
      }
    }

    return {
      success: true,
      data: {
        users: users || []
      }
    }
  } catch (error) {
    console.error('获取推荐用户异常:', error)
    return {
      success: false,
      error: 'INTERNAL_ERROR',
      message: '服务器内部错误'
    }
  }
}

// 获取搜索建议（自动补全）
export async function getSearchSuggestions(
  query: string,
  limit: number = 10
) {
  try {
    const supabase = createServiceClient()
    
    if (!query.trim()) {
      return {
        success: true,
        data: {
          suggestions: []
        }
      }
    }
    
    // 从作品标题和用户名中获取建议
    const [worksResult, usersResult] = await Promise.all([
      supabase
        .from('works')
        .select('title')
        .ilike('title', `%${query}%`)
        .eq('status', 'published')
        .limit(limit / 2),
      supabase
        .from('users')
        .select('nickname')
        .ilike('nickname', `%${query}%`)
        .limit(limit / 2)
    ])
    
    const suggestions = []
    
    // 添加作品标题建议
    if (worksResult.data) {
      suggestions.push(...worksResult.data.map(work => ({
        type: 'work',
        text: work.title
      })))
    }
    
    // 添加用户名建议
    if (usersResult.data) {
      suggestions.push(...usersResult.data.map(user => ({
        type: 'user',
        text: user.nickname
      })))
    }
    
    // 去重并限制数量
    const uniqueSuggestions = suggestions
      .filter((item, index, self) => 
        index === self.findIndex(t => t.text === item.text)
      )
      .slice(0, limit)
    
    return {
      success: true,
      data: {
        suggestions: uniqueSuggestions
      }
    }
  } catch (error) {
    console.error('获取搜索建议异常:', error)
    return {
      success: false,
      error: 'INTERNAL_ERROR',
      message: '服务器内部错误'
    }
  }
}
