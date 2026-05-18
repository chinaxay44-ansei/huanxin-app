import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

interface RouteParams { params: Promise<{ workId: string }> }

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createServiceClient()
    const { workId: pWid } = await params
    let workId = pWid
    if (!workId) {
      const url = new URL(req.url)
      workId = url.searchParams.get('workId') || ''
    }
    if (!workId) return NextResponse.json({ error: 'Missing workId' }, { status: 400 })
    const { data, error } = await supabase
      .from('works')
      .select('generation_params')
      .eq('id', workId)
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const cfg = (data as any)?.generation_params?.request_json || null
    return NextResponse.json({ success: true, config: cfg })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 })
  }
}
