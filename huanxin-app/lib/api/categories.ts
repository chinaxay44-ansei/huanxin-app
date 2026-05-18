import { NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function getCategoriesList(request: NextRequest) {
  try {
    const supabase = createServiceClient()
    const url = new URL(request.url)
    const type = (url.searchParams.get('type') || '').trim().toLowerCase()
    const query = supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
    const builder = (type === 'image' || type === 'video') ? query.eq('type', type) : query
    let { data, error } = await builder
    if (!error && Array.isArray(data) && data.length === 0 && (type === 'image' || type === 'video')) {
      const retry = await query
      ;({ data, error } = await retry)
    }
    
    if (error) {
      console.error('获取分类列表失败:', error)
      return {
        success: false,
        error: 'FETCH_FAILED',
        message: '获取分类列表失败'
      }
    }
    
    return {
      success: true,
      data: data || []
    }
  } catch (error) {
    console.error('获取分类列表API错误:', error)
    return {
      success: false,
      error: 'INTERNAL_ERROR',
      message: '服务器内部错误'
    }
  }
}