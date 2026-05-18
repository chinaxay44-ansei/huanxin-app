import { createServiceClient, createClient } from '@/lib/supabase/server'
import { Database } from '@/lib/types/database'

type Work = Database['public']['Tables']['works']['Row']
type WorkInsert = Database['public']['Tables']['works']['Insert']
type WorkUpdate = Database['public']['Tables']['works']['Update']

export interface CreateWorkRequest {
  title: string
  description?: string
  media_url: string
  media_type: 'image' | 'video'
  thumbnail_url?: string
  category_id?: string
  tags?: string[]
  ai_template_id?: string
  generation_params?: Record<string, any>
}

export interface UpdateWorkRequest {
  title?: string
  description?: string
  thumbnail_url?: string
  category_id?: string
  tags?: string[]
  status?: 'draft' | 'published' | 'private'
  visibility?: 'public' | 'private'
  generation_params?: Record<string, any>
}

export interface WorkListQuery {
  userId?: string
  categoryId?: string
  type?: 'image' | 'video'
  status?: 'draft' | 'published' | 'private'
  limit?: number
  offset?: number
  sortBy?: 'created_at' | 'updated_at' | 'likes_count' | 'views_count' | 'random'
  sortOrder?: 'asc' | 'desc'
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// 创建作品
export async function createWork(userId: string, workData: CreateWorkRequest): Promise<ApiResponse<Work>> {
  try {
    const supabase = createServiceClient()
    
    // 验证分类是否存在（支持传入 id 或 slug，最终写入 works.category 为类别ID）
    let categoryIdToSet: string | undefined
    if (workData.category_id) {
      const isUuid = typeof workData.category_id === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(workData.category_id)
      if (isUuid) {
        const byId = await supabase
          .from('categories')
          .select('id, slug')
          .eq('id', workData.category_id)
          .maybeSingle()
        if (byId.data) categoryIdToSet = (byId.data as any).id
      }
      if (!categoryIdToSet) {
        const bySlug = await supabase
          .from('categories')
          .select('id, slug')
          .eq('slug', workData.category_id)
          .maybeSingle()
        if (bySlug.data) categoryIdToSet = (bySlug.data as any).id
      }
      if (!categoryIdToSet) {
        return {
          success: false,
          error: 'CATEGORY_NOT_FOUND',
          message: '分类不存在'
        }
      }
    }
    
    // 创建作品记录
    const { data, error } = await supabase
      .from('works')
      .insert({
        user_id: userId,
        title: workData.title,
        description: workData.description,
        media_url: workData.media_url,
        type: workData.media_type,
        thumbnail_url: workData.thumbnail_url,
        category: categoryIdToSet ?? workData.category_id,
        tags: workData.tags,
        ai_template_id: workData.ai_template_id,
        generation_params: workData.generation_params,
        status: 'published' // 默认发布状态
      })
      .select()
      .single()
    
    if (error) {
      console.error('创建作品失败:', error)
      return {
        success: false,
        error: 'CREATE_FAILED',
        message: '作品创建失败'
      }
    }
    
    return {
      success: true,
      data,
      message: '作品创建成功'
    }
  } catch (error) {
    console.error('创建作品服务错误:', error)
    return {
      success: false,
      error: 'INTERNAL_ERROR',
      message: '服务器内部错误'
    }
  }
}

// 获取作品列表
export async function getWorksList(query: WorkListQuery): Promise<ApiResponse<any>> {
  try {
    const supabase = createServiceClient()
    const sortByParam = query.sortBy || 'created_at'
    const includeRandomOrder = sortByParam === 'random'
    const sortBy = includeRandomOrder ? 'created_at' : sortByParam
    const sortOrder = includeRandomOrder ? 'desc' : (query.sortOrder || 'desc')
    const limit = Math.min(query.limit || 20, 50)
    let offset = query.offset || 0
    
    // 添加筛选条件
    if (query.userId) {
      queryBuilder = queryBuilder.eq('user_id', query.userId)
    }
    
    let resolvedCategoryId: string | null = null
    // 若传入 categoryId（支持 id 或 slug），解析为类别ID后筛选
    if (query.categoryId) {
      const isUuid = typeof query.categoryId === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(query.categoryId)
      if (isUuid) {
        const byId = await supabase
          .from('categories')
          .select('id')
          .eq('id', query.categoryId)
          .maybeSingle()
        if (byId.data) resolvedCategoryId = (byId.data as any).id
      } else {
        const bySlug = await supabase
          .from('categories')
          .select('id')
          .eq('slug', query.categoryId)
          .maybeSingle()
        if (bySlug.data) resolvedCategoryId = (bySlug.data as any).id
      }
      if (!resolvedCategoryId) {
        return {
          success: true,
          data: [],
          total: 0,
          hasMore: false
        }
      }
    }

    const applyFilters = (builder: any) => {
      let qb = builder.is('deleted_at', null)
      if (query.userId) {
        qb = qb.eq('user_id', query.userId)
      }
      if (resolvedCategoryId) {
        qb = qb.eq('category', resolvedCategoryId)
      }
      if (query.status) {
        qb = qb.eq('status', query.status)
      } else {
        qb = qb.eq('status', 'published')
      }
      if (!query.userId) {
        qb = qb.eq('visibility', 'public')
      }
      if (query.type) {
        qb = qb.eq('type', query.type)
      }
      return qb
    }
    
    if (includeRandomOrder) {
      const { count: randomCount, error: randomError } = await applyFilters(
        supabase
          .from('works')
          .select('id', { count: 'exact', head: true })
      )
      if (randomError) {
        console.error('随机作品计数失败:', randomError)
        return {
          success: false,
          error: 'FETCH_FAILED',
          message: '获取作品列表失败'
        }
      }
      const totalRandom = randomCount || 0
      if (totalRandom === 0) {
        return {
          success: true,
          data: [],
          total: 0,
          hasMore: false
        }
      }
      const maxOffset = Math.max(0, totalRandom - limit)
      offset = maxOffset > 0 ? Math.floor(Math.random() * (maxOffset + 1)) : 0
    }

    let queryBuilder = applyFilters(
      supabase
        .from('works')
        .select('*', { count: 'exact' })
    )

    queryBuilder = queryBuilder
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1)
    
    const { data, error, count } = await queryBuilder
    
    if (error) {
      console.error('获取作品列表失败:', error)
      return {
        success: false,
        error: 'FETCH_FAILED',
        message: '获取作品列表失败'
      }
    }
    
    // 构建用户和分类的映射，以避免依赖 PostgREST 的物理外键关系
    const userIds = Array.from(new Set((data || []).map(w => w.user_id).filter(Boolean)))
    const categoryIds = Array.from(new Set((data || []).map(w => w.category).filter(Boolean)))

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

    let categoryMapById: Record<string, { id: string; name: string; slug: string }> = {}
    if (categoryIds.length > 0) {
      const { data: categoriesDataById } = await supabase
        .from('categories')
        .select('id, name, slug')
        .in('id', categoryIds as string[])
      ;(categoriesDataById || []).forEach(c => {
        categoryMapById[c.id] = { id: c.id, name: c.name, slug: c.slug }
      })
    }

    // 格式化返回数据为前端期望的结构
    const formattedWorks = (data || []).map(work => ({
      id: work.id,
      title: work.title ?? '',
      description: work.description ?? null,
      media_url: work.media_url,
      media_type: work.type,
      thumbnail_url: work.thumbnail_url ?? null,
      category: work.category
        ? (categoryMapById[work.category]
            ? { id: categoryMapById[work.category].id, name: categoryMapById[work.category].name }
            : undefined)
        : undefined,
      tags: work.tags || [],
      status: work.status,
      visibility: (work as any).visibility,
      created_at: work.created_at,
      updated_at: work.updated_at,
      user: userMap[work.user_id]
        ? {
            id: userMap[work.user_id].id,
            nickname: userMap[work.user_id].nickname,
            avatar_url: userMap[work.user_id].avatar_url || undefined
          }
        : { id: work.user_id, nickname: '未知用户', avatar_url: undefined },
      likes_count: work.likes_count || 0,
      comments_count: work.comments_count || 0
    }))

    const nowMs = Date.now()
    const biased = (formattedWorks || []).map(w => {
      const t = new Date(w.created_at).getTime()
      const hours = Math.max(0, (nowMs - t) / (1000 * 60 * 60))
      const boost = hours <= 24 ? 0.15 : (hours <= 24 * 7 ? 0.07 : 0)
      return { w, s: Math.random() + boost }
    }).sort((a, b) => b.s - a.s).map(x => x.w)
    const hasMore = (offset + limit) < (count || 0)

    return {
      success: true,
      data: biased,
      total: count || 0,
      hasMore
    }
  } catch (error) {
    console.error('获取作品列表服务错误:', error)
    return {
      success: false,
      error: 'INTERNAL_ERROR',
      message: '服务器内部错误'
    }
  }
}

// 获取作品详情
export async function getWorkDetail(workId: string, userId?: string): Promise<ApiResponse<Work & {
  user: {
    id: string
    nickname: string
    avatar_url?: string | null
  }
  category?: {
    id: string
    name: string
    slug: string
  }
  likes_count: number
  comments_count: number
  is_liked?: boolean
}>> {
  try {
    const supabase = createServiceClient()

    // 单表查询作品
    const { data, error } = await supabase
      .from('works')
      .select('*')
      .eq('id', workId)
      .single()

    if (error || !data || (data as any).deleted_at) {
      console.error('获取作品详情失败:', error)
      return {
        success: false,
        error: 'WORK_NOT_FOUND',
        message: '作品不存在'
      }
    }

    // 查询作者信息
    let userInfo: { id: string; nickname: string; avatar_url: string | null } = { id: data.user_id, nickname: '', avatar_url: null }
    if (data.user_id) {
      const { data: userData } = await supabase
        .from('users')
        .select('id, nickname, avatar_url')
        .eq('id', data.user_id)
        .single()
      if (userData) {
        userInfo = { id: userData.id, nickname: userData.nickname, avatar_url: userData.avatar_url }
      }
    }

    // 查询分类信息（按 slug）
    let categoryInfo: { id: string; name: string; slug: string } | undefined
    if (data.category) {
      let categoryData: any = null
      const byId = await supabase
        .from('categories')
        .select('id, name, slug')
        .eq('id', data.category)
        .maybeSingle()
      if (byId.data) {
        categoryData = byId.data
      } else {
        const bySlug = await supabase
          .from('categories')
          .select('id, name, slug')
          .eq('slug', data.category as any)
          .maybeSingle()
        if (bySlug.data) categoryData = bySlug.data
      }
      if (categoryData) {
        categoryInfo = { id: categoryData.id, name: categoryData.name, slug: categoryData.slug }
      }
    }

    // 检查用户是否点赞了这个作品
    let isLiked = false
    if (userId) {
      const { data: likeData } = await supabase
        .from('likes')
        .select('id')
        .eq('work_id', workId)
        .eq('user_id', userId)
        .maybeSingle()
      isLiked = !!likeData
    }

    // 增加浏览次数（安全更新）
    const nextViews = (data.views_count || 0) + 1
    await supabase
      .from('works')
      .update({ 
        views_count: nextViews,
        updated_at: new Date().toISOString()
      })
      .eq('id', workId)

    // 格式化返回数据
    const formattedWork = {
      ...data,
      user: userInfo,
      category: categoryInfo,
      likes_count: data.likes_count || 0,
      comments_count: data.comments_count || 0,
      is_liked: isLiked,
      views_count: nextViews
    }

    return {
      success: true,
      data: formattedWork
    }
  } catch (error) {
    console.error('获取作品详情服务错误:', error)
    return {
      success: false,
      error: 'INTERNAL_ERROR',
      message: '服务器内部错误'
    }
  }
}

// 更新作品
export async function updateWork(workId: string, userId: string, updates: UpdateWorkRequest): Promise<ApiResponse<Work>> {
  try {
    const supabase = createServiceClient()
    
    // 检查作品是否存在且属于当前用户
    const { data: existingWork, error: checkError } = await supabase
      .from('works')
      .select('id, user_id, category')
      .eq('id', workId)
      .eq('user_id', userId)
      .single()
    
    if (checkError || !existingWork) {
      return {
        success: false,
        error: 'WORK_NOT_FOUND',
        message: '作品不存在或无权限修改'
      }
    }
    
    // 验证分类是否存在（支持 id 或 slug），并映射到 works.category 为类别ID
    let categoryIdToSet: string | undefined
    if (updates.category_id) {
      let category: { id: string; slug: string } | null = null
      const isUuid = typeof updates.category_id === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(updates.category_id)
      if (isUuid) {
        const byId = await supabase
          .from('categories')
          .select('id, slug')
          .eq('id', updates.category_id)
          .maybeSingle()
        if (byId.data) category = byId.data as any
      }
      if (!category) {
        const bySlug = await supabase
          .from('categories')
          .select('id, slug')
          .eq('slug', updates.category_id)
          .maybeSingle()
        if (bySlug.data) category = bySlug.data as any
      }
      if (!category) {
        return {
          success: false,
          error: 'CATEGORY_NOT_FOUND',
          message: '分类不存在'
        }
      }
      categoryIdToSet = category.id
    }
    
    // 更新作品
    const updatePayload: Partial<Work> = {
      title: updates.title,
      description: updates.description,
      thumbnail_url: updates.thumbnail_url,
      tags: updates.tags,
      status: updates.status,
      updated_at: new Date().toISOString()
    }
    if (categoryIdToSet) {
      ;(updatePayload as any).category = categoryIdToSet
    } else {
      const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/
      const currentCat = (existingWork as any).category
      if (currentCat && !uuidRegex.test(String(currentCat))) {
        let fixedId: string | undefined
        const { data: catBySlug } = await supabase
          .from('categories')
          .select('id, slug')
          .eq('slug', String(currentCat))
          .maybeSingle()
        if (catBySlug) fixedId = (catBySlug as any).id
        ;(updatePayload as any).category = fixedId ?? null
      }
    }
    const uuidRegex2 = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/
    if ((updatePayload as any).category !== undefined && (updatePayload as any).category !== null && !uuidRegex2.test(String((updatePayload as any).category))) {
      (updatePayload as any).category = null
    }
    if (updates.visibility) {
      ;(updatePayload as any).visibility = updates.visibility
    }
    if (updates.status === 'published') {
      ;(updatePayload as any).published_at = new Date().toISOString()
    }
    if (updates.generation_params) {
      ;(updatePayload as any).generation_params = updates.generation_params
    }
    const { data, error } = await supabase
      .from('works')
      .update(updatePayload)
      .eq('id', workId)
      .select()
      .single()
    
    if (error) {
      if ((error as any)?.code === '22P02') {
        await supabase
          .from('works')
          .update({ category: null, updated_at: new Date().toISOString() })
          .eq('id', workId)
        const { data: data2, error: error2 } = await supabase
          .from('works')
          .update({ ...updatePayload, category: undefined as any })
          .eq('id', workId)
          .select()
          .single()
        if (!error2) {
          return { success: true, data: data2 as any, message: '作品更新成功' }
        }
      }
      console.error('更新作品失败:', error)
      return {
        success: false,
        error: 'UPDATE_FAILED',
        message: '作品更新失败'
      }
    }
    
    return {
      success: true,
      data,
      message: '作品更新成功'
    }
  } catch (error) {
    console.error('更新作品服务错误:', error)
    return {
      success: false,
      error: 'INTERNAL_ERROR',
      message: '服务器内部错误'
    }
  }
}

// 删除作品
export async function deleteWork(workId: string, userId: string): Promise<ApiResponse> {
  try {
    const supabase = createServiceClient()
    
    // 检查作品是否存在且属于当前用户
    const { data: existingWork, error: checkError } = await supabase
      .from('works')
      .select('id, user_id, media_url')
      .eq('id', workId)
      .eq('user_id', userId)
      .single()
    
    if (checkError || !existingWork) {
      return {
        success: false,
        error: 'WORK_NOT_FOUND',
        message: '作品不存在或无权限删除'
      }
    }
    
    const { error } = await supabase
      .from('works')
      .update({ status: 'rejected', visibility: 'private', updated_at: new Date().toISOString() })
      .eq('id', workId)
    
    if (error) {
      console.error('删除作品失败:', error)
      return {
        success: false,
        error: 'DELETE_FAILED',
        message: '作品删除失败'
      }
    }
    
    return {
      success: true,
      message: '作品已删除'
    }
  } catch (error) {
    console.error('删除作品服务错误:', error)
    return {
      success: false,
      error: 'INTERNAL_ERROR',
      message: '服务器内部错误'
    }
  }
}

// 根据 URL 后缀回填作品类型（image/video）
function detectTypeFromUrl(url?: string | null): 'image' | 'video' | undefined {
  if (!url) return undefined
  const lower = url.toLowerCase()
  // 常见图片/视频扩展名判断
  const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp']
  const videoExts = ['.mp4', '.mov', '.webm', '.m4v', '.avi', '.mpeg']
  if (imageExts.some(ext => lower.includes(ext))) return 'image'
  if (videoExts.some(ext => lower.includes(ext))) return 'video'
  // 基于 mime/路径提示
  if (lower.includes('/image/') || lower.includes('content-type=image')) return 'image'
  if (lower.includes('/video/') || lower.includes('content-type=video')) return 'video'
  return undefined
}

// 扫描并回填作品表中的 type 字段（依据 media_url 后缀）
export async function backfillWorkTypesByUrlSuffix(): Promise<ApiResponse<{ updated: number; scanned: number }>> {
  try {
    const supabase = createServiceClient()

    const pageSize = 500
    let offset = 0
    let scanned = 0
    let updated = 0
    while (true) {
      const { data: batch, error } = await supabase
        .from('works')
        .select('id, media_url, type')
        .range(offset, offset + pageSize - 1)

      if (error) {
        return { success: false, error: 'FETCH_FAILED', message: error.message }
      }
      const rows = batch || []
      if (rows.length === 0) break

      scanned += rows.length

      for (const w of rows) {
        const detected = detectTypeFromUrl(w.media_url)
        if (!detected) continue
        if (w.type !== detected) {
          const { error: updErr } = await supabase
            .from('works')
            .update({ type: detected })
            .eq('id', w.id)
          if (!updErr) updated += 1
        }
      }

      offset += pageSize
      // 保护：最多处理 100k 条以避免长时间运行
      if (offset >= 100000) break
    }

    return { success: true, data: { updated, scanned }, message: '回填完成' }
  } catch (error) {
    console.error('回填作品类型失败:', error)
    return { success: false, error: 'INTERNAL_ERROR', message: '服务器内部错误' }
  }
}
