"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Megaphone, RefreshCw, Send, ListChecks } from "lucide-react"

const ADMIN_TOKEN = process.env.NEXT_PUBLIC_ADMIN_API_TOKEN

type AnnouncementHistory = {
  id: string
  batchId: string
  title: string
  content: string
  created_at: string
}

export default function AnnouncementAdminPage() {
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<AnnouncementHistory[]>([])
  const [stats, setStats] = useState<{ sent: number; failed: number; total: number; batchId?: string } | null>(null)

  const headers = useMemo(() => (ADMIN_TOKEN ? { "x-admin-token": ADMIN_TOKEN } : {}), [])

  const loadHistory = async () => {
    try {
      const res = await fetch("/api/admin/announcements", { headers })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "加载失败")
      setHistory(json.data || [])
    } catch (e: any) {
      toast.error(e.message || "加载失败")
    }
  }

  useEffect(() => {
    loadHistory()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const sendAnnouncement = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error("请填写标题和正文")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ title: title.trim(), content: content.trim() }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "发送失败")
      setStats({ sent: json.sent ?? 0, failed: json.failed ?? 0, total: json.total ?? 0, batchId: json.batchId })
      toast.success("已向所有好友发送公告")
      setTitle("")
      setContent("")
      loadHistory()
    } catch (e: any) {
      toast.error(e.message || "发送失败")
    } finally {
      setLoading(false)
    }
  }

  const accentShadow = "shadow-[0_20px_80px_rgba(15,76,92,0.25)]"

  return (
    <div
      className="p-6 space-y-6 max-w-6xl mx-auto w-full"
      style={{ fontFamily: "'IBM Plex Sans', 'Space Mono', 'Noto Sans SC', sans-serif" }}
    >
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-[#0f172a] via-[#0d1f29] to-[#0f2a32] text-white px-6 py-6 min-h-[200px]">

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(255,181,94,0.16),transparent_35%),radial-gradient(circle_at_82%_10%,rgba(15,76,92,0.3),transparent_32%)]" aria-hidden />
        <div className="relative flex flex-wrap items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center backdrop-blur">
            <Megaphone className="w-6 h-6 text-[#f5a524]" />
          </div>
          <div className="flex-1 min-w-[240px] space-y-1">
            <div className="text-sm uppercase tracking-[0.2em] text-white/70">公告管理</div>
            <h1 className="text-2xl font-semibold">以“焕星官方”向所有好友广播消息</h1>
            <p className="text-sm text-white/70 max-w-3xl">
              发布后，好友会在消息列表中收到来自“焕星官方”的系统消息，未读数将自动更新。
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={loadHistory} disabled={loading} className="bg-white/10 border border-white/20 hover:bg-white/20">
              <RefreshCw className="w-4 h-4" /> 刷新历史
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
        <Card className={`col-span-1 lg:col-span-8 p-6 border-2 border-[#0f4c5c]/20 bg-white ${accentShadow}`}>

          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm uppercase tracking-[0.18em] text-[#0f4c5c] dark:text-white/70">Compose</div>
              <h2 className="text-xl font-semibold text-[#0f2a32] dark:text-white">创建公告</h2>

              <p className="text-sm text-muted-foreground mt-1">标题会作为消息首行，正文会直接发送给每位好友。</p>
            </div>
            {stats && (
              <div className="text-right text-sm text-[#0f4c5c]">
                <div className="font-semibold">已发送：{stats.sent}/{stats.total}</div>
                {stats.failed > 0 && <div className="text-amber-600">失败：{stats.failed}</div>}
                {stats.batchId && <div className="text-xs text-muted-foreground">批次：{stats.batchId.slice(0, 8)}</div>}
              </div>
            )}
          </div>

          <div className="mt-4 space-y-4">
            <Input
              placeholder="公告标题，如：本周系统维护通知"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-11 border-[#0f4c5c]/30 focus-visible:ring-[#f5a524]"
            />
            <Textarea
              placeholder="公告正文，将以系统消息发送给所有好友。"
              rows={8}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="border-[#0f4c5c]/30 focus-visible:ring-[#f5a524]"
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="secondary" className="bg-[#f5a524]/10 text-[#9a6b0c] border-[#f5a524]/40">SYSTEM</Badge>
                <span>消息类型：系统消息（message_type = system）</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={loadHistory} disabled={loading}>
                  <RefreshCw className="w-4 h-4" />
                  重载历史
                </Button>
                <Button onClick={sendAnnouncement} disabled={loading} className="w-full sm:w-auto">
                  <Send className="w-4 h-4" />
                  {loading ? "发送中..." : "发送公告"}
                </Button>


              </div>
            </div>
          </div>
        </Card>

        <Card className="col-span-1 lg:col-span-4 p-6 border-2 border-slate-200 bg-slate-50/80 w-full">

          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm uppercase tracking-[0.18em] text-slate-500">History</div>

              <h3 className="text-lg font-semibold text-slate-900">历史批次</h3>
            </div>
            <ListChecks className="w-5 h-5 text-slate-500" />
          </div>

          <div className="mt-4 space-y-3">
            {history.length === 0 && (
              <div className="text-sm text-muted-foreground">暂无历史记录</div>
            )}
            {history.map((item) => (
              <div key={item.batchId} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold text-slate-900 line-clamp-1">{item.title || "未命名公告"}</div>
                  <Badge variant="outline" className="border-[#0f4c5c]/30 text-[#0f4c5c] dark:text-white/70 dark:border-white/20">{new Date(item.created_at).toLocaleString()}</Badge>

                </div>
                <p className="mt-1 text-sm text-muted-foreground line-clamp-2 whitespace-pre-line">{item.content}</p>
                <div className="mt-2 text-xs text-slate-500">批次 ID：{item.batchId}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
