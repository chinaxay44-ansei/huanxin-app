import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"
import { sendMessage } from "@/lib/api/messages"

const ADMIN_TOKEN = process.env.ADMIN_API_TOKEN
const OFFICIAL_ID = "00000000-0000-0000-0000-000000000001"

function authorized(req: NextRequest) {
  if (!ADMIN_TOKEN) return true
  const token = req.headers.get("x-admin-token")
  return !!token && token === ADMIN_TOKEN
}

async function getOrCreateConversationId(supabase: ReturnType<typeof createServiceClient>, userId: string) {
  if (!userId || userId === OFFICIAL_ID) return null
  const [p1, p2] = userId < OFFICIAL_ID ? [userId, OFFICIAL_ID] : [OFFICIAL_ID, userId]

  const { data: existing, error: existingError } = await supabase
    .from("conversations")
    .select("id, status")
    .eq("participant_1_id", p1)
    .eq("participant_2_id", p2)
    .eq("type", "direct")
    .is("deleted_at", null)
    .maybeSingle()

  if (existingError && existingError.code !== "PGRST116") {
    console.error("query conversation error", existingError)
  }

  if (existing?.id) {
    if (existing.status !== "active") {
      await supabase
        .from("conversations")
        .update({ status: "active", updated_at: new Date().toISOString() })
        .eq("id", existing.id)
    }
    return existing.id
  }

  const { data: created, error: createError } = await supabase
    .from("conversations")
    .insert({
      participant_1_id: p1,
      participant_2_id: p2,
      initiator_id: OFFICIAL_ID,
      type: "direct",
      status: "active",
      unread_count_p1: 0,
      unread_count_p2: 0,
      metadata: {},
    })
    .select("id")
    .maybeSingle()

  if (createError) {
    // 可能是并发唯一约束，重试一次查询
    if (createError.code === "23505") {
      const { data: retry } = await supabase
        .from("conversations")
        .select("id")
        .eq("participant_1_id", p1)
        .eq("participant_2_id", p2)
        .eq("type", "direct")
        .is("deleted_at", null)
        .maybeSingle()
      return retry?.id || null
    }
    console.error("create conversation error", createError)
    return null
  }

  return created?.id || null
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("messages")
    .select("id, content, created_at, metadata")
    .eq("sender_id", OFFICIAL_ID)
    .eq("message_type", "system")
    .contains("metadata", { announcement: true })
    .order("created_at", { ascending: false })
    .limit(200)

  if (error) {
    console.error("list announcements error", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const seen = new Set<string>()
  const history = [] as { id: string; batchId: string; title: string; content: string; created_at: string }[]
  for (const item of data || []) {
    const batchId = (item as any)?.metadata?.batchId || item.id
    if (seen.has(batchId)) continue
    seen.add(batchId)
    history.push({
      id: item.id,
      batchId,
      title: (item as any)?.metadata?.title || "",
      content: item.content || "",
      created_at: item.created_at,
    })
  }

  return NextResponse.json({ data: history })
}


export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const { title, content } = await req.json().catch(() => ({}))
  const cleanTitle = typeof title === "string" ? title.trim() : ""
  const cleanContent = typeof content === "string" ? content.trim() : ""

  if (!cleanTitle || !cleanContent) {
    return NextResponse.json({ error: "title_and_content_required" }, { status: 400 })
  }

  const supabase = createServiceClient()
  const batchId = typeof globalThis.crypto?.randomUUID === "function" ? globalThis.crypto.randomUUID() : `announcement-${Date.now()}`

  const { data: users, error: usersError } = await supabase
    .from("users")
    .select("id")
    .neq("id", OFFICIAL_ID)

  if (usersError) {
    console.error("query users error", usersError)
    return NextResponse.json({ error: usersError.message }, { status: 500 })
  }

  const targets = (users || []).map((u) => u.id).filter(Boolean) as string[]
  const messageText = `【公告】${cleanTitle}\n\n${cleanContent}`

  let sent = 0
  let failed = 0
  for (const userId of targets) {
    const convoId = await getOrCreateConversationId(supabase, userId)
    if (!convoId) {
      failed += 1
      continue
    }
    const res = await sendMessage(OFFICIAL_ID, {
      conversation_id: convoId,
      content: messageText,
      message_type: "system",
      metadata: { announcement: true, batchId, title: cleanTitle },
    })
    if (res.success) sent += 1
    else failed += 1
  }

  return NextResponse.json({ success: true, total: targets.length, sent, failed, batchId })
}

