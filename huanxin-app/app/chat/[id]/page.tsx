"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChevronLeft, Image as ImageIcon, Send } from "lucide-react"
import { useRouter, useParams, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase/client"

type ChatMsg = {
  id: string
  sender_id: string
  content: string
  created_at: string
  is_recalled?: boolean
  message_type?: "text" | "image" | "video" | "audio" | "file"
  media_url?: string | null
}

export default function ChatPage() {
  const router = useRouter()
  const params = useParams<{ id?: string | string[] }>()
  const initialConversationId = useMemo(() => {
    const raw = params?.id
    if (!raw) return ""
    if (Array.isArray(raw)) return raw[0] || ""
    return String(raw)
  }, [params])
  const searchParams = useSearchParams()
  const targetUserIdFromQuery = useMemo(() => {
    const v = searchParams?.get("userId") || searchParams?.get("uid")
    return v ? String(v) : ""
  }, [searchParams])

  const [conversationId, setConversationId] = useState(initialConversationId)
  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [myId, setMyId] = useState<string>("")
  const [myAvatar, setMyAvatar] = useState<string>("")
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [convError, setConvError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [hasAttemptedCreate, setHasAttemptedCreate] = useState(false)
  const [otherUser, setOtherUser] = useState<{ id: string; nickname: string; avatar_url?: string | null } | null>(null)
  const [isMounted, setIsMounted] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 验证 UUID 格式 - 更严格的检查，包括字符串 "undefined"
  const isValidConversationId = useMemo(() => {
    if (!conversationId) return false
    if (conversationId === "new") return false
    if (conversationId === "undefined" || conversationId === "null") return false
    if (typeof conversationId !== 'string') return false
    // 检查是否为有效的 UUID v4 格式
    return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(conversationId)
  }, [conversationId])

  // 确保组件已挂载到客户端
  useEffect(() => {
    setIsMounted(true)
  }, [])

  const buildAuthHeaders = useCallback(() => {
    const headers: Record<string, string> = {}
    if (!isMounted) return headers
    try {
      const token = localStorage.getItem("auth-token")
      if (token) headers["Authorization"] = `Bearer ${token}`
    } catch {}
    return headers
  }, [isMounted])

  const ensureConversation = useCallback(async () => {
    if (!targetUserIdFromQuery || hasAttemptedCreate || !isMounted) return
    setHasAttemptedCreate(true)
    setConvError(null)
    setCreating(true)
    try {
      const headers = { "Content-Type": "application/json", ...buildAuthHeaders() }
      const res = await fetch("/api/messages/conversations", {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify({ target_user_id: targetUserIdFromQuery })
      })
      const json = await res.json()
      if (json.success && json.data?.id) {
        const newConvId = json.data.id as string
        setConversationId(newConvId)
        setMessages([])
        // 更新 URL 而不刷新页面
        window.history.replaceState({}, '', `/chat/${newConvId}`)
      } else {
        setConvError(json.message || "创建会话失败")
      }
    } catch (err) {
      console.error('创建会话失败:', err)
      setConvError("网络错误,请稍后重试")
    } finally {
      setCreating(false)
    }
  }, [targetUserIdFromQuery, hasAttemptedCreate, isMounted, buildAuthHeaders])

  useEffect(() => {
    console.log('[ChatPage] 会话状态检查:', { 
      conversationId, 
      targetUserIdFromQuery, 
      isValidConversationId,
      hasAttemptedCreate 
    })
    
    if ((!conversationId || conversationId === "new" || !isValidConversationId) && targetUserIdFromQuery && !hasAttemptedCreate) {
      console.log('[ChatPage] 触发创建会话流程')
      ensureConversation()
    } else if (!conversationId && !targetUserIdFromQuery) {
      setConvError("缺少会话信息")
    }
  }, [conversationId, targetUserIdFromQuery, isValidConversationId, hasAttemptedCreate, ensureConversation])

  useEffect(() => {
    const load = async () => {
      if (!isMounted) return
      
      setConvError(null)
      const headers = buildAuthHeaders()

      console.log('[ChatPage] 加载消息:', { conversationId, isValidConversationId })

      if (!isValidConversationId) {
        console.log('[ChatPage] conversationId 无效，跳过加载')
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        console.log('[ChatPage] 开始请求消息列表')
        const [meRes, msgRes] = await Promise.all([
          fetch(`/api/auth/me`, { credentials: "include", headers }),
          fetch(`/api/messages/conversations/${conversationId}/messages?limit=100`, { credentials: "include", headers })
        ])
        const me = await meRes.json()
        if (me.success && me.data?.user?.id) {
          setMyId(me.data.user.id)
          setMyAvatar(me.data.user.avatar_url || "")
        }

        const json = await msgRes.json()
        console.log('[ChatPage] 消息列表响应:', { status: msgRes.status, success: json.success, error: json.message })
        
        if (json.success) {
          setMessages(json.data || [])
          if (json.conversation?.other_user) setOtherUser(json.conversation.other_user)
          await fetch(`/api/messages/conversations/${conversationId}/read`, { method: "POST", credentials: "include", headers })
        } else {
          // 会话不存在时尝试重新创建
          if (msgRes.status === 404 && targetUserIdFromQuery) {
            console.log('[ChatPage] 会话不存在(404),重置为new并重新创建')
            setConversationId("new")
            setHasAttemptedCreate(false)
            setConvError("会话不存在，正在为你重新创建...")
          } else {
            console.error('[ChatPage] 加载会话失败:', json.message)
            setConvError(`查询会话失败: ${json.message || "会话不存在或无权限访问"}`)
            setMessages([])
          }
          setLoading(false)
          return
        }

        // 如果还没有对方用户信息，从会话列表获取
        if (!otherUser && json.conversation) {
          const listRes = await fetch(`/api/messages/conversations?limit=100`, { credentials: "include", cache: "no-store", headers })
          const list = await listRes.json()
          if (list.success && Array.isArray(list.data)) {
            const found = list.data.find((c: any) => c.id === conversationId)
            if (found?.other_user) setOtherUser(found.other_user)
          }
        }
      } catch (e) {
        console.error('[ChatPage] 加载会话异常:', e)
        setConvError("网络错误,请稍后重试")
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [conversationId, targetUserIdFromQuery, hasAttemptedCreate, isMounted, buildAuthHeaders, isValidConversationId])

  useEffect(() => {
    if (!isValidConversationId || convError) return
    
    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` }, (payload: any) => {
        setMessages((prev) => [...prev, payload.new])
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` }, (payload: any) => {
        setMessages((prev) => prev.map((m) => (m.id === payload.new.id ? { ...m, ...payload.new } : m)))
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId, convError])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const sendMessage = async () => {
    if (!isValidConversationId || !message.trim() || sending) return
    
    setSending(true)
    const headers: Record<string, string> = { "Content-Type": "application/json", ...buildAuthHeaders() }
    try {
      const res = await fetch(`/api/messages/conversations/${conversationId}/messages`, {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({ content: message.trim() })
      })
      const json = await res.json()
      if (json.success) {
        setMessages((prev) => [...prev, json.data])
        setMessage("")
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
      } else {
        setConvError(json.message || "发送失败")
      }
    } catch (err) {
      console.error('发送消息失败:', err)
      setConvError("发送失败，请稍后重试")
    } finally {
      setSending(false)
    }
  }

  const uploadImageAndSend = async (file: File) => {
    if (!isValidConversationId || convError) return
    const form = new FormData()
    form.append("file", file)
    form.append("bucket", "work-media")
    form.append("pathPrefix", "chat-images")
    const upRes = await fetch("/api/storage/upload", { method: "POST", body: form })
    const upJson = await upRes.json()
    if (upRes.ok && upJson.success && upJson.data?.url) {
      const headers: Record<string, string> = { "Content-Type": "application/json", ...buildAuthHeaders() }
      const isVideo = (file.type || "").startsWith("video/")
      const res = await fetch(`/api/messages/conversations/${conversationId}/messages`, {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({ content: "", message_type: isVideo ? "video" : "image", media_url: upJson.data.url })
      })
      const json = await res.json()
      if (json.success) {
        setMessages((prev) => [...prev, json.data])
      } else {
        setConvError(json.message || "发送失败")
      }
    }
  }

  const onPickImage = () => fileInputRef.current?.click()
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) uploadImageAndSend(f)
    e.currentTarget.value = ""
  }

  const timeText = (ts: string) => new Date(ts).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })

  if (!conversationId) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 to-slate-100">
        <div className="p-4 border-b bg-white shadow-sm flex items-center gap-3">
          <button onClick={() => router.back()} aria-label="返回" className="inline-flex items-center justify-center w-9 h-9 rounded-full hover:bg-slate-100">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <p className="text-base font-semibold">无效的会话</p>
        </div>
        <div className="flex-1 flex items-center justify-center text-muted-foreground">无法获取会话 ID</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="p-4 border-b bg-white shadow-sm flex items-center gap-3">
        <button onClick={() => router.back()} aria-label="返回" className="inline-flex items-center justify-center w-9 h-9 rounded-full hover:bg-slate-100">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold truncate">{otherUser?.nickname || "聊天"}</p>
          <p className="text-xs text-muted-foreground">{otherUser ? "对方状态未提供" : "正在获取..."}</p>
        </div>
        <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center text-white">
          {otherUser?.avatar_url ? (
            <img src={otherUser.avatar_url} className="w-full h-full object-cover" />
          ) : (
            <span className="text-sm font-bold">{(otherUser?.nickname || "用户")[0]}</span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3 pb-6">
        {loading && (
          <div className="text-center py-10">
            <p className="text-muted-foreground">加载中...</p>
          </div>
        )}
        {convError && !loading && (
          <div className="text-center text-red-500 py-10 space-y-3">
            <div>
              <p className="font-medium">{convError}</p>
              <p className="text-sm text-muted-foreground mt-1">可以重试创建会话后再发送</p>
            </div>
            {targetUserIdFromQuery && (
              <Button
                variant="outline"
                onClick={async () => {
                  setCreating(true)
                  setConvError(null)
                  setHasAttemptedCreate(false)
                  try {
                    const headers = { "Content-Type": "application/json", ...buildAuthHeaders() }
                    const res = await fetch("/api/messages/conversations", {
                      method: "POST",
                      credentials: "include",
                      headers,
                      body: JSON.stringify({ target_user_id: targetUserIdFromQuery })
                    })
                    const json = await res.json()
                    if (json.success && json.data?.id) {
                      const newId = json.data.id as string
                      setConversationId(newId)
                      setMessages([])
                      setConvError(null)
                      // 更新 URL 而不刷新页面
                      window.history.replaceState({}, '', `/chat/${newId}`)
                    } else {
                      setConvError(json.message || "重新创建会话失败")
                    }
                  } catch (err) {
                    console.error('重新创建会话失败:', err)
                    setConvError("网络错误，请稍后重试")
                  } finally {
                    setCreating(false)
                  }
                }}
                disabled={creating}
              >
                {creating ? "创建中..." : "重新创建会话"}
              </Button>
            )}
          </div>
        )}

        {!loading &&
          messages.map((msg) => {
            const mine = msg.sender_id === myId
            const time = timeText(msg.created_at)
            const avatar = mine ? (myAvatar || "/placeholder.svg") : (otherUser?.avatar_url || "/placeholder.svg")
            const bubble = (
              <div className={`max-w-[78%] rounded-2xl px-3 py-2 shadow-sm ${mine ? "bg-emerald-500 text-white rounded-br-sm" : "bg-white text-foreground border rounded-bl-sm"}`}>
                {msg.is_recalled ? (
                  <span className="text-xs text-muted-foreground">消息已撤回</span>
                ) : msg.message_type === "image" && msg.media_url ? (
                  <img src={msg.media_url} className="max-w-[220px] rounded-lg" />
                ) : msg.message_type === "video" && msg.media_url ? (
                  <video src={msg.media_url} className="max-w-[220px] rounded-lg" controls />
                ) : (
                  <span className="whitespace-pre-wrap break-words">{msg.content}</span>
                )}
                <div className={`mt-1 text-[10px] ${mine ? "text-white/80" : "text-muted-foreground"}`}>{time}</div>
              </div>
            )
            return (
              <div key={msg.id} className={`flex items-end gap-2 ${mine ? "justify-end" : "justify-start"}`}>
                {!mine && (
                  <img src={avatar} alt="avatar" className="w-8 h-8 rounded-full object-cover border" />
                )}
                {bubble}
                {mine && (
                  <img src={avatar} alt="avatar" className="w-8 h-8 rounded-full object-cover border" />
                )}
              </div>
            )
          })}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 border-t bg-white shadow-lg fixed left-0 right-0 bottom-0 z-50 safe-area-pb">
        <div className="flex items-center gap-2 max-w-screen-md mx-auto">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onPickImage} 
            title="发送图片或视频" 
            disabled={!isValidConversationId || !!convError}
            className="flex-shrink-0 w-11 h-11 rounded-full relative z-10"
          >
            <ImageIcon className="w-5 h-5" />
          </Button>
          <input ref={fileInputRef} type="file" accept="image/*,video/*" hidden onChange={onFileChange} />
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={convError ? "请先恢复会话后再发送" : creating ? "创建会话中..." : "说点什么..."}
            disabled={!isValidConversationId || !!convError || creating}
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                sendMessage()
              }
            }}
          />
          <Button 
            onClick={sendMessage} 
            disabled={sending || !message.trim() || !isValidConversationId || !!convError || creating} 
            className="gap-1 flex-shrink-0"
          >
            <Send className="w-4 h-4" />
            发送
          </Button>
        </div>
      </div>
    </div>
  )
}
