import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

function unauthorized(message = 'Unauthorized') {
  return NextResponse.json({ error: message }, { status: 401 })
}

function getExpectedToken() {
  return process.env.NEXT_PUBLIC_ADMIN_API_TOKEN || process.env.ADMIN_API_TOKEN || ''
}

function isAuthorized(_req: NextRequest): boolean { return true }

interface RouteParams { params: Promise<{ featureId: string }> }

export async function GET(req: NextRequest, { params }: RouteParams) {
  if (!isAuthorized(req)) return unauthorized()
  const supabase = createServiceClient()
  const { featureId } = await params
  const { data, error } = await supabase
    .from('generation_features')
    .select('config')
    .or(`id.eq.${featureId},slug.eq.${featureId}`)
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, config: (data as any)?.config || null })
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  if (!isAuthorized(req)) return unauthorized()
  const supabase = createServiceClient()
  const { featureId } = await params
  const body = await req.json()
  const config = body?.config
  if (!config || typeof config !== 'object') return NextResponse.json({ error: 'Invalid config' }, { status: 400 })
  const { error } = await supabase
    .from('generation_features')
    .update({ config, updated_at: new Date().toISOString() })
    .eq('id', featureId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}