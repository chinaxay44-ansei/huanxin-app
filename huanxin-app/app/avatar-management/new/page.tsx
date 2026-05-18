"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"
import { useAuth } from "@/lib/auth"
import ImageUploadPreview from "@/components/image-upload-preview"
import { authFetch } from "@/lib/client-auth-fetch"

export default function NewAvatarPage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [name, setName] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { isAuthenticated, user } = useAuth()

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
        setError("请先选择一张头像图片")
        return
      }
      if (!name.trim()) {
        setError("请填写形象名称")
        return
      }

      // 改为通过后端接口上传（使用服务端密钥 + JWT 校验）
      const form = new FormData()
      form.append("file", file)
      form.append("type", "image")
      const uploadRes = await authFetch("/api/upload/media", {
        method: "POST",
        body: form,
      })
      const uploadJson = await uploadRes.json()
      if (!uploadRes.ok || !uploadJson?.success) {
        throw new Error(uploadJson?.message || "头像上传失败")
      }
      const imageUrl: string | undefined = uploadJson?.data?.url

      const res = await authFetch("/api/ai/avatars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, avatar_url: imageUrl, front_face_url: imageUrl })
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
          <h1 className="text-xl font-bold">新建形象</h1>
        </div>
      </header>
      <div className="p-4 space-y-4">
        <div className="space-y-2">
          <label className="text-sm">形象名称</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full h-10 px-3 rounded-lg border bg-card"
            placeholder="您创建的形象是私密的，只有自己可见"
          />
        </div>
        <div className="max-w-[200px] mx-auto">
          <ImageUploadPreview
            value={file}
            onChange={setFile}
            label="上传一张最像您的单人正面照片，不必担心，我们的模型自带强大的美颜能力"
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
