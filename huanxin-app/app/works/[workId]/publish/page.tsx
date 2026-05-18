"use client"

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

type ValueSource = 'image_upload' | 'outfit_image' | 'video_upload' | 'prompt_text' | 'custom_value' | 'file_upload' | 'avatar_image' | 'asset_image' | 'work_image'

interface NodeItem {
  nodeId: string
  fieldName: string
  fieldValue: string
  defaultValue?: string
  visible?: boolean
  description?: string
  valueSource?: ValueSource
  required?: boolean
  useUploadedMediaAsDefault?: boolean
}

export default function WorkPublishPage() {
  const router = useRouter()
  const { workId } = useParams() as { workId?: string }
  const [loading, setLoading] = useState(false)
  const [title, setTitle] = useState('')
  const [work, setWork] = useState<any>(null)
  const [config, setConfig] = useState<{ intro?: string; workflowId?: string; apiKey?: string; nodeInfoList: NodeItem[] } | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      if (!workId) return
      try {
        const workRes = await fetch(`/api/works/${workId}`)
        const workJson = await workRes.json()
        if (workJson?.success) {
          setWork(workJson.data)
          setTitle(workJson.data?.title || '')
          const cfg = workJson.data?.generation_params?.request_json || null
          if (cfg) setConfig({ intro: cfg.intro, workflowId: cfg.workflowId, apiKey: cfg.apiKey, nodeInfoList: cfg.nodeInfoList || [] })
        }
      } catch {}
    }
    load()
  }, [workId])

  const onPublish = async () => {
    if (!workId) return
    const isPublic = work?.visibility === 'public'
    if (!isPublic && (!title || title.trim().length === 0)) {
      toast.error('请填写作品标题')
      setErrorMsg('请填写作品标题')
      return
    }
    setLoading(true)
    setErrorMsg(null)
    try {
      const nextConfig = { ...(config || { nodeInfoList: [] }) }
      const token = typeof window !== 'undefined' ? (localStorage.getItem('auth-token') || undefined) : undefined
      const payload = isPublic
        // 设为私密：仅修改可见性，保留原 status 以避免非法枚举
        ? { visibility: 'private' as const }
        // 公开发布：写入标题/分类/生成参数，并标记已发布
        : {
            title: title.trim(),
            visibility: 'public' as const,
            status: 'published' as const,
            generation_params: { request_json: nextConfig }
          }
      const res = await fetch(`/api/works/${workId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
        credentials: 'include',
        body: JSON.stringify(payload)
      })
      if (!res.ok) {
        if (res.status === 401) {
          toast.error('请先登录')
          setErrorMsg('请先登录')
          router.push('/login')
          return
        }
        const err = await res.json().catch(() => ({}))
        toast.error(err?.message || '发布失败')
        setErrorMsg(typeof err?.message === 'string' ? err.message : '发布失败')
        return
      }
      const json = await res.json()
      if (json?.success) {
        setWork((prev: any) => prev ? { ...prev, visibility: isPublic ? 'private' : 'public', status: isPublic ? prev?.status ?? 'published' : 'published' } : prev)
        toast.success(isPublic ? '已设为私密' : '发布成功')
        router.replace(`/works/${workId}`)
      } else {
        toast.error(json?.message || '发布失败')
        setErrorMsg(typeof json?.message === 'string' ? json.message : '发布失败')
      }
    } catch (e: any) {
      toast.error(e?.message || '发布失败')
      setErrorMsg(typeof e?.message === 'string' ? e.message : '发布失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="p-4 border-b flex items-center gap-3">
        <button onClick={() => router.back()} aria-label="返回" className="inline-flex items-center justify-center w-9 h-9 rounded-md hover:bg-accent">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold">发布作品</h1>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
        {work && (
          <Card className="p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              <div>
                <label className="text-sm mb-1 block">作品标题</label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="给作品起个名字" disabled={work?.visibility === 'public'} />
              </div>
              <div>
                <label className="text-sm mb-1 block">预览</label>
                {work.type === 'video' ? (
                  <video src={work.thumbnail_url || work.media_url} className="rounded border w-full max-w-[420px] md:max-w-[540px] max-h-[60vh] object-contain" controls />
                ) : (
                  <img src={work.thumbnail_url || work.media_url} className="rounded border w-full max-w-[420px] md:max-w-[540px] max-h-[60vh] object-contain" />
                )}
              </div>
            </div>
          </Card>
        )}

        <Card className="p-4 space-y-3">
          <label className="text-sm mb-1 block">做同款说明</label>
          <Input value={config?.intro || ''} onChange={(e) => setConfig(prev => prev ? ({ ...prev, intro: e.target.value }) : prev)} disabled={work?.visibility === 'public'} />
        </Card>

        <Card className="p-4 space-y-3">
          <div className="text-sm font-medium">做同款参数</div>
          <div className="space-y-3">
            {(config?.nodeInfoList || []).map((n, idx) => (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
                <div className="md:col-span-3">
                  <label className="text-xs">参数</label>
                  <Input
                    value={n.description || ''}
                    onChange={(e) => setConfig(prev => prev ? ({ ...prev, nodeInfoList: prev.nodeInfoList.map((x, i) => i === idx ? { ...x, description: e.target.value } : x) }) : prev)}
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="text-xs">他人做同款时，是否直接使用和你一样的输入</label>
                  <div className="flex items-center gap-4 mt-1">
                    <label className="text-xs flex items-center gap-1">
                      <input type="radio" name={`visible-${idx}`} checked={n.visible === false} onChange={() => setConfig(prev => prev ? ({ ...prev, nodeInfoList: prev.nodeInfoList.map((x, i) => i === idx ? { ...x, visible: false } : x) }) : prev)} disabled={work?.visibility === 'public'} />
                      是
                    </label>
                    <label className="text-xs flex items-center gap-1">
                      <input type="radio" name={`visible-${idx}`} checked={n.visible !== false} onChange={() => setConfig(prev => prev ? ({ ...prev, nodeInfoList: prev.nodeInfoList.map((x, i) => i === idx ? { ...x, visible: true } : x) }) : prev)} disabled={work?.visibility === 'public'} />
                      否
                    </label>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="pt-2">
          <Button disabled={loading} onClick={onPublish} className="w-full h-12 text-base rounded-2xl">{loading ? '处理中…' : (work?.visibility === 'public' ? '设为私密' : '发布作品')}</Button>
          {errorMsg && <div className="mt-2 text-sm text-destructive">{errorMsg}</div>}
        </div>

      </div>
    </div>
  )
}
