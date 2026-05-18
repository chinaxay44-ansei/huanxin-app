import { NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

function isAuthorized(request: NextRequest) {
  const token = request.headers.get('x-admin-token') || ''
  return token && (token === process.env.ADMIN_API_TOKEN || token === process.env.NEXT_PUBLIC_ADMIN_API_TOKEN)
}

export async function GET(request: NextRequest) {
  try {
    if (!isAuthorized(request)) {
      return Response.json({ success: false, message: '未授权' }, { status: 401 })
    }

    const url = new URL(request.url)
    const status = url.searchParams.get('status') || undefined
    const search = url.searchParams.get('search') || undefined
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    const supabase = createServiceClient()
    let query = supabase.from('ai_generations').select('*', { count: 'exact' })
    if (status) query = query.eq('status', status)
    if (search) query = query.or(`prompt.ilike.%${search}%,output_url.ilike.%${search}%`)

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error
    return Response.json({ success: true, data, total: count, page, limit })
  } catch (e: any) {
    console.error('GET /api/admin/generations error', e)
    return Response.json({ success: false, message: e.message || '服务器错误' }, { status: 500 })
  }
}