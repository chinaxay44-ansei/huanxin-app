import { supabase } from '@/lib/supabase/client'
import { cachedJsonFetch } from '@/lib/cache/request-cache'

export interface WorkWithUser {
  id: string
  title: string
  description?: string
  media_url: string
  media_type: 'image' | 'video'
  thumbnail_url?: string
  category_id?: string
  tags?: string[]
  status: 'draft' | 'published' | 'private'
  visibility?: 'public' | 'private'
  created_at: string
  updated_at: string
  user: {
    id: string
    nickname: string
    avatar_url?: string
  }
  category?: {
    id: string
    name: string
  }
  likes_count: number
  comments_count: number
}

export interface WorksResponse {
  data: WorkWithUser[]
  total: number
  hasMore: boolean
}

export interface Category {
  id: string
  name: string
  description?: string
  sort_order: number
}

export interface WorkListQuery {
  userId?: string // Add userId to the interface
  categoryId?: string
  type?: 'image' | 'video'
  limit?: number
  offset?: number
  sortBy?: 'created_at' | 'updated_at' | 'likes_count' | 'random'
  sortOrder?: 'asc' | 'desc'
}

export async function publishWork(workId: string): Promise<{ success: boolean; error: string | null }> {
  try {
    const res = await fetch(`/api/works/${workId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visibility: 'public', status: 'published' })
    })
    const data = await res.json()
    if (!res.ok || !data.success) {
      return { success: false, error: data?.message || '发布失败' }
    }
    return { success: true, error: null }
  } catch (e: any) {
    return { success: false, error: e?.message || '网络错误' }
  }
}

export async function getWorksList(params: WorkListQuery = {}): Promise<WorksResponse> {
  try {
    const queryParams = new URLSearchParams()
    if (params.userId) queryParams.append('userId', params.userId)
    if (params.categoryId) queryParams.append('categoryId', params.categoryId)
    if (params.type) queryParams.append('type', params.type)
    if (params.limit) queryParams.append('limit', params.limit.toString())
    if (params.offset) queryParams.append('offset', params.offset.toString())
    if (params.sortBy) queryParams.append('sortBy', params.sortBy)
    if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder)

    const json = await cachedJsonFetch(`/api/works?${queryParams.toString()}`, undefined, { ttlMs: 20_000 })
    return json
  } catch (error) {
    console.error('Error in getWorksList:', error)
    throw error
  }
}

export async function getCategoriesList(params?: { type?: 'image' | 'video'; force?: boolean }): Promise<Category[]> {
  try {
    const qs = params?.type ? `?type=${params.type}` : ''
    const json = await cachedJsonFetch(`/api/categories${qs}`, undefined, { ttlMs: 60_000, force: !!params?.force })
    return json
  } catch (error) {
    console.error('Error in getCategoriesList:', error)
    throw error
  }
}
