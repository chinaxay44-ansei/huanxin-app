import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"

function authorized(req: NextRequest) {
  const expected = process.env.ADMIN_API_TOKEN
  if (!expected) return true
  const token = req.headers.get("x-admin-token")
  return !!token && token === expected
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const supabase = createServiceClient()
  const body = await req.json().catch(() => ({}))
  const from_types: string[] = Array.isArray(body?.from_types) && body.from_types.length > 0 ? body.from_types : ["general", "content"]
  const to_type: string = typeof body?.to_type === "string" ? body.to_type : "image"
  if (!["image", "video"].includes(to_type)) {
    return NextResponse.json({ error: "to_type_invalid" }, { status: 400 })
  }
  const { data, error } = await supabase
    .from("categories")
    .update({ type: to_type })
    .in("type", from_types)
    .select("id")
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ updated: (data || []).length, to_type, from_types })
}