import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient()
    const { searchParams } = new URL(request.url)
    const itemsLimit = parseInt(searchParams.get('items_limit') || '6')

    const { data: series } = await supabase
      .from('fun_series')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    const result: any[] = []
    for (const s of series || []) {
      const { data: mappings } = await supabase
        .from('fun_series_items')
        .select('*, works:works(*)')
        .eq('series_id', s.id)
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .limit(itemsLimit)

      const items = (mappings || []).map((m: any) => ({
        id: m.works.id,
        title: m.title_override || m.works.title || '',
        description: m.works.description || null,
        media_url: m.works.media_url,
        thumbnail_url: m.cover_url_override || m.works.thumbnail_url,
        media_type: m.works.type,
        likes_count: m.works.likes_count || 0,
        comments_count: m.works.comments_count || 0,
      }))

      result.push({
        id: s.id,
        title: s.title,
        slug: s.slug,
        cover_url: s.cover_url,
        description: s.description,
        items,
      })
    }

    return NextResponse.json({ success: true, data: result }, {
      headers: {
        'Cache-Control': 'public, max-age=0, s-maxage=120, stale-while-revalidate=600'
      }
    })
  } catch (e) {
    return NextResponse.json({ success: false, message: '服务器错误' }, { status: 500 })
  }
}
