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
  const page = Number(searchParams.get('page') || 1)
  const limit = Math.min(Number(searchParams.get('limit') || 50), 200)
  const q = searchParams.get('search') || ''
  const from = (page - 1) * limit
  const to = from + limit - 1

  let query = supabase.from('fun_series').select('*', { count: 'exact' }).order('sort_order', { ascending: true })
  if (q) {
    query = query.ilike('title', `%${q}%`)
  }
  const { data, error, count } = await query.range(from, to)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ items: data || [], page, limit, total: count || 0 })
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) return unauthorized()
  const supabase = createServiceClient()
  const body = await req.json()
  const { title, slug, cover_url, description, sort_order, is_active } = body
  const { data, error } = await supabase
    .from('fun_series')
    .insert({ title, slug, cover_url, description, sort_order: sort_order ?? 0, is_active: is_active ?? true })
    .select('*')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data })
}

export async function PUT(req: NextRequest) {
  if (!isAuthorized(req)) return unauthorized()
  const supabase = createServiceClient()
  const body = await req.json()
  const { id, title, slug, cover_url, description, sort_order, is_active } = body
  const { data, error } = await supabase
    .from('fun_series')
    .update({ title, slug, cover_url, description, sort_order, is_active })
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
  const { error } = await supabase.from('fun_series').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
