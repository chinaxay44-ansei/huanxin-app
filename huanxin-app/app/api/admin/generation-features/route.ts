import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

function unauthorized(message = 'Unauthorized') {
  return NextResponse.json({ error: message }, { status: 401 })
}

function getExpectedToken() {
  return process.env.NEXT_PUBLIC_ADMIN_API_TOKEN || process.env.ADMIN_API_TOKEN || ''
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
  const url = new URL(req.url)
  const page = parseInt(url.searchParams.get('page') || '1')
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 200)
  const offset = (page - 1) * limit
  const { data, error, count } = await supabase
    .from('generation_features')
    .select('id, name, slug, cover_url, description, visibility, is_active, sort_order, parent_id, is_directory', { count: 'exact' })
    .order('sort_order', { ascending: false })
    .range(offset, offset + limit - 1)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ items: data || [], page, limit, total: count || 0 })
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) return unauthorized()
  const supabase = createServiceClient()
  const body = await req.json()
  const { name, slug, cover_url, description, visibility, is_active, sort_order } = body || {}
  if (!name || !slug) return NextResponse.json({ error: 'Missing name or slug' }, { status: 400 })
  const { data, error } = await supabase
    .from('generation_features')
    .insert({ name, slug, cover_url, description, visibility, is_active, sort_order, parent_id: body?.parent_id || null, is_directory: !!body?.is_directory })
    .select('id')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, id: (data as any).id })
}

export async function PUT(req: NextRequest) {
  if (!isAuthorized(req)) return unauthorized()
  const supabase = createServiceClient()
  const body = await req.json()
  const { id, name, slug, cover_url, description, visibility, is_active, sort_order, parent_id, is_directory } = body || {}
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const { error } = await supabase
    .from('generation_features')
    .update({ name, slug, cover_url, description, visibility, is_active, sort_order, parent_id, is_directory, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  if (!isAuthorized(req)) return unauthorized()
  const supabase = createServiceClient()
  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const { error } = await supabase
    .from('generation_features')
    .delete()
    .eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}