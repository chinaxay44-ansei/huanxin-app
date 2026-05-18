import { NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

interface RouteParams { params: Promise<{ featureId: string }> }

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { featureId } = await params
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('generation_features')
      .select('id, name, slug, cover_url, description, visibility, is_active, sort_order, config')
      .or(`id.eq.${featureId},slug.eq.${featureId}`)
      .maybeSingle()

    if (error) throw error
    if (!data) return Response.json({ success: false, message: '未找到功能' }, { status: 404 })
    return Response.json({ success: true, data })
  } catch (e: any) {
    return Response.json({ success: false, message: e.message || '服务器错误' }, { status: 500 })
  }
}