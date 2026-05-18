import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

function getExpectedToken() {
  return process.env.ADMIN_API_TOKEN || process.env.NEXT_PUBLIC_ADMIN_API_TOKEN || ''
}

function unauthorized() {
  return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
}

function isAuthorized(req: NextRequest): boolean {
  const expected = getExpectedToken()
  if (!expected) return true
  const headerToken = req.headers.get('x-admin-token') || ''
  return headerToken === expected
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) return unauthorized()
  const supabase = createServiceClient()
  const { searchParams } = new URL(req.url)
  const series_id = searchParams.get('series_id')
  if (!series_id) return NextResponse.json({ error: 'MISSING_SERIES_ID' }, { status: 400 })
  const { data, error } = await supabase
    .from('fun_series_items')
    .select('*, works:works(*)')
    .eq('series_id', series_id)
    .order('sort_order', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ items: data || [] })
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) return unauthorized()
  const supabase = createServiceClient()
  const body = await req.json()
  const { series_id, work_id, title_override, cover_url_override, sort_order, is_active } = body
  const { data, error } = await supabase
    .from('fun_series_items')
    .insert({ series_id, work_id, title_override, cover_url_override, sort_order: sort_order ?? 0, is_active: is_active ?? true })
    .select('*')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data })
}

export async function PUT(req: NextRequest) {
  if (!isAuthorized(req)) return unauthorized()
  const supabase = createServiceClient()
  const body = await req.json()
  const { id, title_override, cover_url_override, sort_order, is_active } = body
  const { data, error } = await supabase
    .from('fun_series_items')
    .update({ title_override, cover_url_override, sort_order, is_active })
    .eq('id', id)
    .select('*')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data })
}

export async function DELETE(req: NextRequest) {
  if (!isAuthorized(req)) return unauthorized()
  const supabase = createServiceClient()
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'MISSING_ID' }, { status: 400 })
  const { error } = await supabase.from('fun_series_items').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
