import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    // await params to get the actual values
    const { slug } = await params
    
    const supabase = createServiceClient()
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
    const offset = parseInt(searchParams.get('offset') || '0')

    const { data: series } = await supabase
      .from('fun_series')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .limit(1)
      .single()

    if (!series) {
      return NextResponse.json({ success: false, error: 'SERIES_NOT_FOUND' }, { status: 404 })
    }

    const { data: mappings } = await supabase
      .from('fun_series_items')
      .select('*, works:works(*)', { count: 'exact' })
      .eq('series_id', series.id)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .range(offset, offset + limit - 1)

    const works = (mappings || []).map((m: any) => m.works).filter(Boolean)
    const userIds = Array.from(new Set(works.map((w: any) => w.user_id).filter(Boolean)))
    let userMap: Record<string, { id: string; nickname: string; avatar_url: string | null }> = {}
    if (userIds.length > 0) {
      const { data: usersData } = await supabase
        .from('users')
        .select('id, nickname, avatar_url')
        .in('id', userIds)
      ;(usersData || []).forEach(u => { userMap[u.id] = { id: u.id, nickname: u.nickname, avatar_url: u.avatar_url } })
    }

    const items = (mappings || []).map((m: any) => {
      const w = m.works
      const user = userMap[w?.user_id || '']
      return {
        id: w.id,
        title: m.title_override || w.title || '',
        description: w.description || null,
        media_url: w.media_url,
        thumbnail_url: m.cover_url_override || w.thumbnail_url,
        media_type: w.type,
        likes_count: w.likes_count || 0,
        comments_count: w.comments_count || 0,
        user,
      }
    })

    return NextResponse.json({ success: true, data: { series, items } }, {
      headers: {
        'Cache-Control': 'public, max-age=0, s-maxage=120, stale-while-revalidate=600'
      }
    })
  } catch (e) {
    return NextResponse.json({ success: false, message: '服务器错误' }, { status: 500 })
  }
}
