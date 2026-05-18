import { NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const category = url.searchParams.get('category') || undefined
    const sub_category = url.searchParams.get('sub_category') || undefined
    const is_new = url.searchParams.get('is_new') || undefined
    const limit = parseInt(url.searchParams.get('limit') || '12')

    const supabase = createServiceClient()
    let query = supabase.from('ai_templates').select('*').eq('status', 'active')
    if (category) query = query.eq('category', category)
    if (sub_category) query = query.eq('sub_category', sub_category)
    if (is_new) query = query.eq('is_new', is_new === 'true')

    query = query.order('sort_order', { ascending: false }).limit(limit)

    const { data, error } = await query
    if (error) throw error
    return Response.json({ success: true, data })
  } catch (e: any) {
    console.error('GET /api/ai/templates error', e)
    return Response.json({ success: false, message: e.message || '服务器错误' }, { status: 500 })
  }
}