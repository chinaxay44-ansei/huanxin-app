import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

function unauthorized(message = 'Unauthorized') {
  return NextResponse.json({ error: message }, { status: 401 })
}

function getExpectedToken() {
  return process.env.NEXT_PUBLIC_ADMIN_API_TOKEN || process.env.ADMIN_API_TOKEN || ''
}

function isAuthorized(_req: NextRequest): boolean { return true }

interface RouteParams { params: Promise<{ workId: string }> }

export async function GET(req: NextRequest, { params }: RouteParams) {
  if (!isAuthorized(req)) return unauthorized()
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
    .select('id, generation_params')
    .eq('id', workId)
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const cfg = (data as any)?.generation_params?.request_json || null
  return NextResponse.json({ success: true, config: cfg })
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  if (!isAuthorized(req)) return unauthorized()
  const supabase = createServiceClient()
  const { workId: pWid } = await params
  let workId = pWid
  if (!workId) {
    const url = new URL(req.url)
    workId = url.searchParams.get('workId') || ''
  }
  if (!workId) return NextResponse.json({ error: 'Missing workId' }, { status: 400 })
  const body = await req.json()
  const config = body?.config
  if (!config || typeof config !== 'object') {
    return NextResponse.json({ error: 'Invalid config' }, { status: 400 })
  }
  // 合并写入到 generation_params.request_json
  // 保留其他 generation_params 字段
  const { data: row } = await supabase
    .from('works')
    .select('generation_params')
    .eq('id', workId)
    .single()
  const nextParams = { ...(row as any)?.generation_params, request_json: config }
  const { data: upd, error } = await supabase
    .from('works')
    .update({ generation_params: nextParams, updated_at: new Date().toISOString() })
    .eq('id', workId)
    .select('generation_params')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const cfg = (upd as any)?.generation_params?.request_json || null
  return NextResponse.json({ success: true, config: cfg })
}
