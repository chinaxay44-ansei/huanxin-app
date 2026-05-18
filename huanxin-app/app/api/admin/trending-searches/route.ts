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
    .from("trending_searches")
    .select("*")
    .order("sort_order", { ascending: false })
    .order("search_count", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const supabase = createServiceClient()
  const body = await req.json()
  const { keyword, sort_order = 0, is_active = true } = body || {}

  if (!keyword || typeof keyword !== "string") {
    return NextResponse.json({ error: "keyword_required" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("trending_searches")
    .insert({ keyword, sort_order, is_active })
    .select("*")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}

export async function PUT(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const supabase = createServiceClient()
  const body = await req.json()
  const { id, keyword, sort_order, is_active } = body || {}
  if (!id) return NextResponse.json({ error: "id_required" }, { status: 400 })

  const update: Record<string, any> = {}
  if (keyword !== undefined) update.keyword = keyword
  if (sort_order !== undefined) update.sort_order = sort_order
  if (is_active !== undefined) update.is_active = is_active

  const { data, error } = await supabase
    .from("trending_searches")
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

  const { error } = await supabase.from("trending_searches").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}