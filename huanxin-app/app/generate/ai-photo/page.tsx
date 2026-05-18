"use client"

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AuthGuard } from '@/components/auth-guard'
import { Spinner } from '@/components/ui/spinner'
import { Camera, ImagePlus, ChevronLeft } from 'lucide-react'
// 已移除 Tabs 选项栏
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { uploadWorkMediaClient } from '@/lib/upload'
import { useToast } from '@/hooks/use-toast'
import { authFetch } from '@/lib/client-auth-fetch'

interface TemplateItem {
  id: string
  name: string
  thumbnail_url: string
  energy_cost: number
}

interface AvatarItem {
  id: string
  name: string
  avatar_url?: string
}

export default function AIPhotoPage() {
  return (
    <AuthGuard>
      <AIPhotoContent />
    </AuthGuard>
  )
}

function AIPhotoContent() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [templates, setTemplates] = useState<TemplateItem[]>([])
  const [avatars, setAvatars] = useState<AvatarItem[]>([])
  // 固定使用“自由输入”模式，去除无效栏位
  const [activeTab] = useState<'free' | 'lip'>('free')
  const [prompt, setPrompt] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateItem | null>(null)
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarItem | null>(null)
  const [uploading, setUploading] = useState(false)
  const [sourceUrls, setSourceUrls] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [tplRes, avRes] = await Promise.all([
          fetch('/api/ai/templates?category=image&sub_category=ai-photo&limit=12'),
          authFetch('/api/ai/avatars?limit=20'),
        ])
        const tplJson = await tplRes.json()
        const avJson = await avRes.json()
        if (tplJson.success) setTemplates(tplJson.data as TemplateItem[])
        if (avJson.success) setAvatars(avJson.data as AvatarItem[])
      } catch (e) {
        console.error('加载模板/分身失败', e)
      }
    }
    loadData()
  }, [])

  const canGenerate = useMemo(() => {
    // 换脸写真：必须选择形象并上传写真图片；模板与描述词可选
    return !!selectedAvatar && sourceUrls.length > 0
  }, [selectedAvatar, sourceUrls])

  const onFilePick = async (ev: React.ChangeEvent<HTMLInputElement>) => {
    const file = ev.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      // 上传到临时公开桶 temp-media，作为工作流输入图床
      const res = await uploadWorkMediaClient(file, { bucket: 'temp-media', pathPrefix: 'ai-photo' })
      setSourceUrls((prev) => [...prev, res.url])
      toast({ title: '上传成功', description: `${file.name} 已添加为写真素材` })
    } catch (e) {
      console.error('上传失败', e)
      toast({ title: '上传失败', description: '请稍后重试或更换图片', variant: 'destructive' })
    } finally {
      setUploading(false)
    }
  }

  const onGenerate = async () => {
    setLoading(true)
    try {
      const res = await authFetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_id: selectedTemplate?.id ?? null,
          prompt: prompt.trim(),
          source_urls: sourceUrls,
          generation_params: {
            avatar_id: selectedAvatar?.id ?? null,
            mode: 'face_swap',
          },
        }),
      })
      const json = await res.json()
      if (json.success) {
        toast({ title: '任务已提交', description: '稍后在私密作品中查看' })
        router.back()
      } else {
        toast({ title: '提交失败', description: json.message || '创建生成任务失败', variant: 'destructive' })
        router.back()
      }
    } catch (e) {
      console.error('创建生成任务失败', e)
      toast({ title: '创建失败', description: '网络异常，请稍后重试', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 bg-background border-b px-4 py-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.back()}
            aria-label="返回"
            className="p-2 -ml-2 rounded-full hover:bg-muted"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold">AI写真</h1>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* 上传区域：改为竖向站位图 + 中间上传按钮 */}
        <Card className="p-4">
          <div className="relative w-1/2 mx-auto aspect-[3/4] rounded-2xl overflow-hidden border bg-muted">
            {/* 站位图或已选图片预览 */}
            <img
              src={sourceUrls[0] ?? '/placeholder.jpg'}
              alt="placeholder"
              className="absolute inset-0 w-full h-full object-cover"
            />
            {/* 上传中遮罩 */}
            {uploading && (
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                <Spinner className="size-6" />
              </div>
            )}
            {/* 中心上传按钮 */}
            <div className="absolute inset-0 flex items-center justify-center">
              <Button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-full px-6 py-3"
              >
                上传写真
              </Button>
            </div>
            {/* 隐藏文件选择 */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onFilePick}
            />
          </div>
        </Card>

        {/* 输入内容 */}
        <Card className="p-4">
          <Input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="填写写真描述词，如：清新、婚纱、街拍等"
          />
        </Card>

        {/* 模板列表 */}
        <div>
          <div className="text-sm font-medium mb-2">去首页探索灵感</div>
          <div className="grid grid-cols-3 gap-2">
            {templates.map((tpl) => (
              <button
                key={tpl.id}
                onClick={() => setSelectedTemplate(tpl)}
                className={`rounded-xl overflow-hidden border ${
                  selectedTemplate?.id === tpl.id ? 'border-primary' : 'border-input'
                }`}
              >
                <img src={tpl.thumbnail_url} alt={tpl.name} className="w-full h-24 object-cover" />
                <div className="px-2 py-1 text-xs text-foreground text-left">{tpl.name}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 分身选择（可选） */}
        {avatars.length > 0 && (
          <div>
            <div className="text-sm font-medium mb-2">选择形象</div>
            <div className="flex gap-2 overflow-x-auto">
              {avatars.map((av) => (
                <button
                  key={av.id}
                  onClick={() => setSelectedAvatar(av)}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2 border ${
                    selectedAvatar?.id === av.id ? 'border-primary' : 'border-input'
                  }`}
                >
                  <img src={av.avatar_url || '/avatar.png'} className="w-10 h-10 rounded-xl" alt="avatar" />
                  <span className="text-xs">{av.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <Button
          disabled={!canGenerate || loading}
          onClick={onGenerate}
          className="w-full h-12 text-base rounded-2xl"
        >
          {loading ? '生成中...' : '立即焕星'}
        </Button>
      </div>

    </div>
  )
}
