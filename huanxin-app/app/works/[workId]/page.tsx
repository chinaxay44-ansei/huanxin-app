"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth"

interface WorkDetail {
  id: string
  title: string
  description: string | null
  media_url: string | null
  thumbnail_url: string | null
  type: string
  tags: string[]
  likes_count: number
  comments_count: number
  views_count: number
  created_at: string
  visibility?: 'public' | 'private'
  user: { id: string; nickname: string; avatar_url: string | null }
}

export default function WorkDetailPage() {
  const params = useParams()
  const router = useRouter()
  const workId = params.workId as string
  const [work, setWork] = useState<WorkDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/works/${workId}`)
        const json = await res.json()
        if (res.ok && json.success && (json.data?.work || json.data)) {
          const w = json.data.work ?? json.data
          setWork({
            id: w.id,
            title: w.title ?? "",
            description: w.description ?? null,
            media_url: w.media_url ?? null,
            thumbnail_url: w.thumbnail_url ?? null,
            type: w.type,
            tags: w.tags || [],
            likes_count: w.likes_count ?? 0,
            comments_count: w.comments_count ?? 0,
            views_count: w.views_count ?? 0,
            created_at: w.created_at,
            visibility: w.visibility,
            user: w.user || { id: w.user_id, nickname: "", avatar_url: null }
          })
          setLoading(false)
          return
        }
      } catch {}
      // 回退：直接从 Supabase 读取作品与作者信息
      try {
        const { data: w } = await supabase
          .from('works')
          .select('*')
          .eq('id', workId)
          .single()
        if (w) {
          let user = { id: w.user_id, nickname: '', avatar_url: null as string | null }
          if (w.user_id) {
            const { data: u } = await supabase
              .from('users')
              .select('id, nickname, avatar_url')
              .eq('id', w.user_id)
              .single()
            if (u) user = { id: u.id, nickname: u.nickname, avatar_url: u.avatar_url }
          }
          setWork({
            id: w.id,
            title: w.title ?? '',
            description: w.description ?? null,
            media_url: w.media_url ?? null,
            thumbnail_url: w.thumbnail_url ?? null,
            type: w.type,
            tags: w.tags || [],
            likes_count: w.likes_count ?? 0,
            comments_count: w.comments_count ?? 0,
            views_count: w.views_count ?? 0,
            created_at: w.created_at,
            visibility: (w as any).visibility,
            user
          })
        }
      } catch {}
      setLoading(false)
    }
    if (workId) load()
  }, [workId])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        加载中...
      </div>
    )
  }

  if (!work) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">作品不存在</p>
          <Button className="mt-4" onClick={() => router.back()}>返回</Button>
        </div>
      </div>
    )
  }

  const mediaSrc = work.media_url || work.thumbnail_url || "/placeholder.svg"
  const isVideo = (work.type === 'video') || /\.(mp4|mov|webm|m4v)$/i.test(mediaSrc || '')

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background border-b px-4 py-3 flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.back()}>返回</Button>
        <h1 className="text-sm font-medium">作品详情</h1>
        {work && user?.id === work.user.id && work.visibility === 'private' ? (
          <Button onClick={() => router.push(`/works/${workId}/publish`)}>发布管理</Button>
        ) : (
          <div />
        )}
      </header>
      <div className="p-4 space-y-4">
        <div className="rounded-xl overflow-hidden bg-black flex items-center justify-center">
          {isVideo ? (
            <video
              key={mediaSrc}
              src={mediaSrc}
              controls
              playsInline
              className="w-full h-auto max-h-[80vh] bg-black"
              poster={work.thumbnail_url || '/视频封面.jpg'}
            />
          ) : (
            <img
              src={mediaSrc}
              alt={work.title}
              className="w-full h-auto max-h-[80vh] object-contain bg-black"
            />
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => router.push(`/user/${work.user.id}`)} className="flex items-center gap-2">
            <img src={work.user.avatar_url || "/placeholder.svg"} alt="" className="w-8 h-8 rounded-full" />
            <span className="text-sm">{work.user.nickname}</span>
          </button>
          <span className="ml-auto text-xs text-muted-foreground">{work.views_count}人用过 · {work.likes_count}点赞 · {work.comments_count}评论</span>
        </div>
        {work.title && <h2 className="text-base font-semibold">{work.title}</h2>}
        {work.description && <p className="text-sm text-muted-foreground">{work.description}</p>}
        {work.tags?.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {work.tags.map((t, i) => (
              <span key={i} className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground">{t}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
