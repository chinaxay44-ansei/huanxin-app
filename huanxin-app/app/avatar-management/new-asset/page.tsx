"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import ImageUploadPreview from '@/components/image-upload-preview'
import { ChevronLeft } from 'lucide-react'
import { authFetch } from '@/lib/client-auth-fetch'

export default function NewAssetPage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async () => {
    try {
      setError(null)
      setSubmitting(true)
      if (!file) {
        setError('请先选择一张图片')
        return
      }
      const form = new FormData()
      form.append('file', file)
      form.append('type', 'image')
      const uploadRes = await authFetch('/api/upload/media', { method: 'POST', body: form })
      const uploadJson = await uploadRes.json()
      if (!uploadRes.ok || !uploadJson?.success) throw new Error(uploadJson?.message || '图片上传失败')
      const imageUrl = uploadJson?.data?.url

      const res = await authFetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: imageUrl, title }),
      })
      const json = await res.json()
      if (!json?.success) throw new Error(json?.message || '创建失败')
      router.replace('/avatar-management')
    } catch (e: any) {
      setError(e?.message || '创建失败，请稍后再试')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="p-4 border-b flex items-center gap-3">
        <button onClick={() => router.back()} aria-label="返回" className="inline-flex items-center justify-center w-9 h-9 rounded-md hover:bg-accent">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold">新建资产</h1>
      </div>
      <div className="p-4 space-y-4">
        <div className="space-y-2">
          <label className="text-sm">标题（可选）</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="给资产起个名字" />
        </div>
        <div className="max-w-[200px] mx-auto">
          <ImageUploadPreview value={file} onChange={setFile} label="上传图片" accept="image/*" aspectClass="aspect-[3/4]" />
        </div>
        {error && <div className="text-sm text-red-500">{error}</div>}
        {submitting && <div className="text-sm text-muted-foreground">任务已提交至后台处理，您可以2分钟后再来查看</div>}
        <Button disabled={submitting} onClick={onSubmit} className="w-full rounded-full">{submitting ? '生成中...' : '生成'}</Button>
      </div>
    </div>
  )
}
