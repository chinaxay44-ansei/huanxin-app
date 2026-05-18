import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

function unauthorized(message = "Unauthorized") {
  return NextResponse.json({ error: message }, { status: 401 });
}

function getExpectedToken() {
  return process.env.NEXT_PUBLIC_ADMIN_API_TOKEN || process.env.ADMIN_API_TOKEN || "";
}

function isAuthorized(req: NextRequest): boolean {
  const expected = getExpectedToken();
  if (!expected) return true;
  const headerToken = req.headers.get("x-admin-token") || "";
  return headerToken === expected;
}

// GET /api/admin/users
// Query params: search, status, page, limit
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) return unauthorized();
  const supabase = createServiceClient();

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || undefined;
  const status = searchParams.get("status") || undefined; // active | banned | deleted
  const page = Number(searchParams.get("page") || 1);
  const limit = Math.min(Number(searchParams.get("limit") || 50), 200);
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("users")
    .select("id, nickname, avatar_url, status, is_verified, verified_type, followers_count, following_count, created_at", { count: "exact" })
    .order("created_at", { ascending: false });

  if (status && status !== "none") {
    query = query.eq("status", status);
  }
  if (search) {
    query = query.or(`nickname.ilike.%${search}%,id.eq.${search}`);
  }

  const { data, error, count } = await query.range(from, to);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ items: data || [], page, limit, total: count || 0 });
}

// PUT /api/admin/users
// Body: { id: string, status?, is_verified?, verified_type?, nickname? }
export async function PUT(req: NextRequest) {
  if (!isAuthorized(req)) return unauthorized();
  const supabase = createServiceClient();

  const body = await req.json();
  const { id, status, is_verified, verified_type, nickname } = body || {};
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const patch: Record<string, any> = {};
  if (typeof status === "string") patch.status = status;
  if (typeof is_verified === "boolean") patch.is_verified = is_verified;
  if (typeof verified_type === "string") patch.verified_type = verified_type;
  if (typeof nickname === "string") patch.nickname = nickname;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("users")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ item: data });
}

// DELETE /api/admin/users?id=<id>
// Soft delete by setting status=deleted and deleted_at
export async function DELETE(req: NextRequest) {
  if (!isAuthorized(req)) return unauthorized();
  const supabase = createServiceClient();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const { data, error } = await supabase
    .from("users")
    .update({ status: "deleted", deleted_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ item: data });
}
