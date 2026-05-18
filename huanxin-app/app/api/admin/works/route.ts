import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

function unauthorized(message = "Unauthorized") {
  return NextResponse.json({ error: message }, { status: 401 });
}

function getExpectedToken() {
  // Prefer public env for browser calls; fallback to server-only var
  return process.env.NEXT_PUBLIC_ADMIN_API_TOKEN || process.env.ADMIN_API_TOKEN || "";
}

function isAuthorized(req: NextRequest): boolean {
  const expected = getExpectedToken();
  // If no token configured, allow by default
  if (!expected) return true;
  const headerToken = req.headers.get("x-admin-token") || "";
  return headerToken === expected;
}

// GET /api/admin/works
// Query params: status, visibility, search, page, limit
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) return unauthorized();

  const supabase = createServiceClient();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || undefined;
  const visibility = searchParams.get("visibility") || undefined;
  const search = searchParams.get("search") || undefined;
  const page = Number(searchParams.get("page") || 1);
  const limit = Math.min(Number(searchParams.get("limit") || 50), 200);

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("works")
    .select("*, users(nickname, avatar_url)", { count: "exact" })
    .order("created_at", { ascending: false });

  if (status && status !== "none") {
    query = query.eq("status", status);
  }
  if (visibility && visibility !== "none") {
    query = query.eq("visibility", visibility);
  }
  if (search) {
    // title fuzzy search or exact id match
    query = query.or(`title.ilike.%${search}%,id.eq.${search}`);
  }

  // 默认隐藏已软删除的数据
  query = query.is('deleted_at', null)
  const { data, error, count } = await query.range(from, to);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ items: data || [], page, limit, total: count || 0 });
}

// PUT /api/admin/works
// Body: { id: string, title?, description?, status?, visibility? }
export async function PUT(req: NextRequest) {
  if (!isAuthorized(req)) return unauthorized();
  const supabase = createServiceClient();
  const body = await req.json();
  const { id, title, description, status, visibility, category, category_id } = body || {};

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const patch: Record<string, any> = {};
  if (typeof title === "string") patch.title = title;
  if (typeof description === "string") patch.description = description;
  if (typeof status === "string") patch.status = status;
  if (typeof visibility === "string") patch.visibility = visibility;

  // Map category/category_id to works.category (slug)
  let resolvedCategorySlug: string | undefined
  const rawCat = (typeof category === 'string' ? category : undefined) ?? (typeof category_id === 'string' ? category_id : undefined)
  if (rawCat && rawCat.trim().length > 0) {
    const { data: catRow } = await supabase
      .from('categories')
      .select('slug, id')
      .or(`slug.eq.${rawCat},id.eq.${rawCat}`)
      .limit(1)
      .maybeSingle()
    resolvedCategorySlug = catRow?.slug
    if (resolvedCategorySlug) (patch as any).category = resolvedCategorySlug
  } else if (category === '' || category_id === '') {
    // Explicitly clear category when empty string passed
    (patch as any).category = null
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("works")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ item: data });
}

// DELETE /api/admin/works?id=<id>
// Soft delete by setting deleted_at
export async function DELETE(req: NextRequest) {
  if (!isAuthorized(req)) return unauthorized();
  const supabase = createServiceClient();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  const { error } = await supabase
    .from('works')
    .update({ status: 'rejected', visibility: 'private', updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
