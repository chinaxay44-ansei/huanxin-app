import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"

function authorized(req: NextRequest) {
  const expected = process.env.ADMIN_API_TOKEN
  if (!expected) return true
  const token = req.headers.get("x-admin-token")
  return !!token && token === expected
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const supabase = createServiceClient()
  const body = await req.json()
  const {
    name,
    slug,
    type,
    parent_id = null,
    icon_url = null,
    cover_url = null,
    description = null,
    sort_order = 0,
    is_active = true,
  } = body || {}

  if (!name || !slug || !type) {
    return NextResponse.json({ error: "name_slug_type_required" }, { status: 400 })
  }
  if (!['image','video'].includes(String(type).toLowerCase())) {
    return NextResponse.json({ error: "type_must_be_image_or_video" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("categories")
    .insert({ name, slug, type, parent_id, icon_url, cover_url, description, sort_order, is_active })
    .select("*")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}

export async function PUT(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const supabase = createServiceClient()
  const body = await req.json()
  const { id, name, slug, type, parent_id, icon_url, cover_url, description, sort_order, is_active } = body || {}
  if (!id) return NextResponse.json({ error: "id_required" }, { status: 400 })

  const update: Record<string, any> = {}
  if (name !== undefined) update.name = name
  if (slug !== undefined) update.slug = slug
  if (type !== undefined) update.type = type
  if (parent_id !== undefined) update.parent_id = parent_id
  if (icon_url !== undefined) update.icon_url = icon_url
  if (cover_url !== undefined) update.cover_url = cover_url
  if (description !== undefined) update.description = description
  if (sort_order !== undefined) update.sort_order = sort_order
  if (is_active !== undefined) update.is_active = is_active

  const { data, error } = await supabase
    .from("categories")
    .update(update)
    .eq("id", id)
    .select("*")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function DELETE(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const supabase = createServiceClient()
  const body = await req.json()
  const { id } = body || {}
  if (!id) return NextResponse.json({ error: "id_required" }, { status: 400 })

  const { error } = await supabase.from("categories").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}