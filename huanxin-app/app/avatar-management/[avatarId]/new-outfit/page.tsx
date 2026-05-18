"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"
import { useAuth } from "@/lib/auth"
import ImageUploadPreview from "@/components/image-upload-preview"

export default function NewOutfitPage() {
  const router = useRouter()
  const params = useParams()
  const avatarId = params?.avatarId as string
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { isAuthenticated, user } = useAuth()

  useEffect(() => {
    if (!avatarId) {
      router.replace("/avatar-management")
    }
  }, [avatarId, router])

  const onSubmit = async () => {
    try {
      setError(null)
      setSubmitting(true)
      // 使用 JWT 登录状态，而不是 Supabase 会话
      if (!isAuthenticated || !user) {
        setError("请先登录")
        return
      }
      if (!file) {
        setError("请先选择一张穿搭图片")
        return
      }
      // 通过后端上传接口上传图片，避免前端直接调用存储失败
      const form = new FormData()
      form.append("file", file)
      form.append("type", "image")

      const token = typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null
      const uploadRes = await fetch("/api/upload/media", {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: form,
      })
      const uploadJson = await uploadRes.json()
      if (!uploadRes.ok || !uploadJson?.success) {
        throw new Error(uploadJson?.message || "图片上传失败")
      }
      const imageUrl = uploadJson?.data?.url

      const res = await fetch("/api/outfits", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ avatar_id: avatarId, image_url: imageUrl, title })
      })
      const json = await res.json()
      if (!json?.success) throw new Error(json?.message || "创建失败")

      router.replace("/avatar-management")
    } catch (e: any) {
      console.error(e)
      setError(e?.message || "创建失败，请稍后再试")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background border-b px-4 py-4">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()}>
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold">新建穿搭</h1>
        </div>
      </header>
      <div className="p-4 space-y-4">
        <div className="space-y-2">
          <label className="text-sm">名称</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full h-10 px-3 rounded-lg border bg-card"
            placeholder="您创建的穿搭是私密的，只有自己可见"
          />
        </div>
        <div className="max-w-[200px] mx-auto">
          <ImageUploadPreview
            value={file}
            onChange={setFile}
            label="上传您喜欢的穿搭照片，生成基于当前形象的上身效果图"
            accept="image/*"
            aspectClass="aspect-[3/4]"
          />
        </div>
        {error && <div className="text-sm text-red-500">{error}</div>}
        {submitting && <div className="text-sm text-muted-foreground">任务已提交至后台处理，您可以2分钟后再来查看</div>}
        <Button disabled={submitting} onClick={onSubmit} className="w-full rounded-full">
          {submitting ? "生成中..." : "生成"}
        </Button>
      </div>
    </div>
  )
}