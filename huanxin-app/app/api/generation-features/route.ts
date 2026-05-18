import { NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('generation_features')
      .select('id, name, slug, cover_url, description, visibility, is_active, sort_order, parent_id, is_directory')
      .eq('is_active', true)
      .order('sort_order', { ascending: false })

    if (error) throw error
    return Response.json({ success: true, data })
  } catch (e: any) {
    return Response.json({ success: false, message: e.message || '服务器错误' }, { status: 500 })
  }
}