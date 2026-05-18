// Client-side helpers for the messaging system (wrapping Next API routes).

type BaseResponse<T> = { success: boolean; data?: T; message?: string; error?: string }

const buildAuthHeaders = () => {
  const headers: Record<string, string> = {}
  try {
    const token = typeof window !== "undefined" ? localStorage.getItem("auth-token") : null
    if (token) headers["Authorization"] = `Bearer ${token}`
  } catch {}
  return headers
}

const apiFetch = async <T = any>(url: string, init: RequestInit = {}): Promise<BaseResponse<T>> => {
  const headers = {
    ...(init.headers || {}),
    ...buildAuthHeaders(),
  }
  const res = await fetch(url, { credentials: "include", cache: "no-store", ...init, headers })
  const json = await res.json()
  return json
}

export type ConversationListItem = {
  id: string
  last_message?: { content: string; created_at: string; message_type?: string; is_recalled?: boolean }
  unread_count?: number
  other_user?: { nickname?: string; avatar_url?: string }
}

export type ChatMessagePayload = {
  content?: string
  message_type?: "text" | "image" | "video" | "audio" | "file"
  media_url?: string
  reply_to?: string
}

export const messagingClient = {
  async listConversations(limit = 50) {
    return apiFetch<ConversationListItem[]>(`/api/messages/conversations?limit=${limit}`)
  },

  async createConversation(target_user_id: string) {
    return apiFetch(`/api/messages/conversations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target_user_id }),
    })
  },

  async fetchMessages(conversationId: string, limit = 200) {
    return apiFetch(`/api/messages/conversations/${conversationId}/messages?limit=${limit}`)
  },

  async sendMessage(conversationId: string, payload: ChatMessagePayload) {
    return apiFetch(`/api/messages/conversations/${conversationId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
  },

  async markRead(conversationId: string) {
    return apiFetch(`/api/messages/conversations/${conversationId}/read`, { method: "POST" })
  },

  async recallMessage(messageId: string) {
    return apiFetch(`/api/messages/recall/${messageId}`, { method: "POST" })
  },

  async listNotifications(limit = 50, type?: string) {
    const typeQuery = type ? `&type=${type}` : ""
    return apiFetch(`/api/messages/notifications?limit=${limit}${typeQuery}`)
  },
}
