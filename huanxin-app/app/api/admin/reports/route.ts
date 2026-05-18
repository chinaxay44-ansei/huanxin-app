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

// GET /api/admin/reports
// Query params: status, search, page, limit
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) return unauthorized();
  const supabase = createServiceClient();

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || undefined; // pending | reviewing | handled | rejected
  const search = searchParams.get("search") || undefined;
  const page = Number(searchParams.get("page") || 1);
  const limit = Math.min(Number(searchParams.get("limit") || 50), 200);
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("reports")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (status && status !== "none") {
    query = query.eq("status", status);
  }
  if (search) {
    // fuzzy search across reason & description
    query = query.or(`reason.ilike.%${search}%,description.ilike.%${search}%`);
  }

  const { data, error, count } = await query.range(from, to);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ items: data || [], page, limit, total: count || 0 });
}

// PUT /api/admin/reports
// Body: { id: string, status?, handle_result? }
export async function PUT(req: NextRequest) {
  if (!isAuthorized(req)) return unauthorized();
  const supabase = createServiceClient();
  const body = await req.json();
  const { id, status, handle_result } = body || {};
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const patch: Record<string, any> = {};
  if (typeof status === "string") patch.status = status;
  if (typeof handle_result === "string") patch.handle_result = handle_result;
  // set handled_at when resolved
  if (status && ["handled", "rejected"].includes(status)) {
    patch.handled_at = new Date().toISOString();
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("reports")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ item: data });
}