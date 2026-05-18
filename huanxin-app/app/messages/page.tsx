"use client"

import { useState, useEffect } from "react"
import { Spinner } from "@/components/ui/spinner"
import { useRouter } from "next/navigation"
import { AuthGuard } from "@/components/auth-guard"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronRight } from "lucide-react"

type Conversation = {
  id: string
  last_message?: { content: string; created_at: string; message_type?: string; is_recalled?: boolean }
  last_message_at?: string
  unread_count?: number
  other_user?: { nickname?: string; avatar_url?: string }
  is_mutual?: boolean
}

type NotificationItem = { id: string; type: string; title: string; content: string; is_read: boolean; created_at: string; data?: any }

function ConversationsContent() {
  const router = useRouter()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [keyword, setKeyword] = useState("")
  const [activeTab, setActiveTab] = useState<'dm' | 'all' | 'comment' | 'follow' | 'like' | 'system'>('dm')
  const [notiLoading, setNotiLoading] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        let headers: Record<string, string> = {}
        try {
          const token = typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null
          if (token) headers['Authorization'] = `Bearer ${token}`
        } catch {}
        const res = await fetch(`/api/messages/conversations?limit=50`, { headers, credentials: 'include', cache: 'no-store' })
        const json = await res.json()
        if (json.success) {
          setConversations(json.data || [])
        } else {
          if (res.status === 401) {
            setError('请先登录')
          } else {
            setError(json.message || '加载失败')
          }
        }
      } catch (e) {
        console.error('加载会话列表失败:', e)
        setError("网络错误，请稍后重试")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const loadNotifications = async (tab: string) => {
    setNotiLoading(true)
    try {
      const type = tab === 'all' ? '' : tab
      const res = await fetch(`/api/messages/notifications?limit=50${type ? `&type=${type}` : ''}`, { credentials: 'include', cache: 'no-store' })
      const json = await res.json()
      if (json.success) setNotifications(json.data || [])
    } finally {
      setNotiLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab !== 'dm') {
      loadNotifications(activeTab)
    }
  }, [activeTab])

  const formatTime = (dateString: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    if (diffInHours < 1) return "刚刚"
    if (diffInHours < 24) return `${diffInHours}小时前`
    if (diffInHours < 48) return "昨天"
    return date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
  }

  const previewText = (m?: Conversation['last_message']) => {
    if (!m) return ''
    if ((m as any).is_recalled) return '消息已撤回'
    const t = (m as any).message_type as any
    if (t === 'text') return m.content || ''
    if (t === 'image') return '[图片]'
    if (t === 'video') return '[视频]'
    if (t === 'audio') return '[语音]'
    if (t === 'file') return '[文件]'
    return m.content || '[消息]'
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 bg-background border-b px-4 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">消息</h1>
          <Button variant="outline" size="sm" onClick={() => router.push('/following')}>联系人</Button>
        </div>
        <div className="mt-3">
          <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="搜索联系人或内容" className="bg-muted" />
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto scrollbar-hide">
          {[
            { key: 'dm', label: '私信' },
            { key: 'all', label: '全部' },
            { key: 'comment', label: '评论' },
            { key: 'follow', label: '粉丝' },
            { key: 'like', label: '点赞' },
            { key: 'system', label: '系统' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key as any)}
              className={`px-3 py-1.5 rounded-full text-sm ${activeTab === t.key ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      {activeTab === 'dm' && loading && (
        <div className="p-8 text-center">
          <Spinner className="size-8 mb-3 mx-auto" />
          <p className="text-muted-foreground">加载中...</p>
        </div>
      )}
      {activeTab === 'dm' && error && (
        <div className="p-8 text-center space-y-3">
          <p className="text-red-500">{error}</p>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            重新加载
          </Button>
        </div>
      )}
      {activeTab === 'dm' && !loading && !error && conversations.length === 0 && (
        <div className="p-8 text-center text-muted-foreground space-y-2">
          <p>暂无会话</p>
          <p className="text-sm">访问他人主页点击"发消息"开始聊天</p>
        </div>
      )}
      {activeTab === 'dm' && !loading && !error && conversations.length > 0 && (
        <div className="px-4 py-3 space-y-3">
          {conversations
            .filter((c) => {
              const name = c.other_user?.nickname || ''
              const content = c.last_message?.content || ''
              return name.includes(keyword) || content.includes(keyword)
            })
            .map((c) => {
              const preview = previewText(c.last_message as any) || '点击开始聊天'
              const unread = c.unread_count || 0
              return (
                <button
                  key={c.id}
                  className="w-full text-left bg-card hover:bg-accent/60 transition border rounded-2xl px-3 py-3 shadow-sm flex items-center gap-3"
                  onClick={() => router.push(`/chat/${c.id}`)}
                >
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-emerald-500 to-lime-400 flex items-center justify-center">
                      {c.other_user?.avatar_url ? (
                        <img src={c.other_user.avatar_url} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-lg font-bold text-white">{(c.other_user?.nickname || '用户')[0] || '匿'}</span>
                      )}
                    </div>
                    {unread > 0 && (
                      <div className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-destructive text-white text-xs flex items-center justify-center">
                        {unread > 99 ? '99+' : unread}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <p className="font-semibold truncate">{c.other_user?.nickname || '会话'}</p>
                        {c.is_mutual && <Badge className="text-[10px]" variant="secondary">互关</Badge>}
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatTime((c.last_message as any)?.created_at || c.last_message_at || '')}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground truncate">
                      <span className="truncate">{preview}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                </button>
              )
            })}
        </div>
      )}

      {activeTab !== 'dm' && (
        <div className="px-4 py-3 space-y-3">
          {notiLoading && <div className="text-center text-muted-foreground py-6">加载中...</div>}
          {!notiLoading && notifications.length === 0 && <div className="text-center text-muted-foreground py-6">暂无通知</div>}
          {!notiLoading && notifications.map(n => (
            <div key={n.id} className="flex gap-3 p-3 rounded-lg bg-muted/50">
              <div className="w-10 h-10 rounded-full bg-foreground text-background flex items-center justify-center text-sm">
                {n.type === 'comment' ? '评' : n.type === 'like' ? '赞' : n.type === 'follow' ? '粉' : '信'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-medium truncate">{n.title || '通知'}</p>
                  <span className="text-xs text-muted-foreground">{formatTime(n.created_at)}</span>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">{n.content}</p>
                {!n.is_read && <span className="inline-block mt-1 text-xs text-primary">未读</span>}
              </div>
              {n.data?.conversation_id && (
                <Button size="sm" variant="outline" onClick={() => router.push(`/chat/${n.data.conversation_id}`)}>回复</Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function MessagesPage() {
  return (
    <AuthGuard>
      <ConversationsContent />
    </AuthGuard>
  )
}
