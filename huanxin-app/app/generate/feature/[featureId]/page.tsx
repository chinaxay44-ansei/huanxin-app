"use client"

import { useEffect, useRef, useState, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Upload, ChevronLeft } from 'lucide-react'
import { uploadWorkMediaClient } from '@/lib/upload'
import { useAuth } from '@/lib/auth'
import { authFetch } from '@/lib/client-auth-fetch'

type ValueSource = 'image_upload' | 'outfit_image' | 'video_upload' | 'prompt_text' | 'custom_value' | 'file_upload' | 'avatar_image' | 'asset_image' | 'work_image' | 'number_select'

interface NodeConfigItem {
  nodeId: string
  fieldName: string
  valueSource: ValueSource
  defaultValue?: string
  visible?: boolean
  description?: string
  required?: boolean
  useUploadedMediaAsDefault?: boolean
  numberOptions?: number[]
}

interface FeatureConfig {
  apiKey: string
  workflowId: string
  instanceType?: string
  usePersonalQueue?: boolean
  webhookUrl?: string
  intro?: string
  nodeInfoList: NodeConfigItem[]
}

export default function FeatureGeneratePage() {
  const router = useRouter()
  const { featureId } = useParams() as { featureId?: string }
  const [loading, setLoading] = useState(false)
  const [config, setConfig] = useState<FeatureConfig | null>(null)
  const [nodes, setNodes] = useState<NodeConfigItem[]>([])
  const [resolvedValues, setResolvedValues] = useState<(string | number)[]>([])
  const [promptText, setPromptText] = useState<string>('')
  const fileInputs = useRef<Record<number, HTMLInputElement | null>>({})
  const [avatars, setAvatars] = useState<any[]>([])
  const [assets, setAssets] = useState<any[]>([])
  const [myWorks, setMyWorks] = useState<any[]>([])
  const [selectedAvatarForNode, setSelectedAvatarForNode] = useState<Record<number, string>>({})
  const [outfitsCache, setOutfitsCache] = useState<Record<string, any[]>>({})
  const [loadingOutfitsFor, setLoadingOutfitsFor] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/generation-features/${featureId}`)
        const json = await res.json()
        const cfg = json?.data?.config || null
        if (cfg) {
          setConfig(cfg)
          const list = (cfg.nodeInfoList || []) as NodeConfigItem[]
          setNodes(list)
          setResolvedValues(new Array(list.length).fill(''))
        }
        const av = await authFetch('/api/ai/avatars?limit=100').then(r => r.json()).catch(() => null)
        if (av?.success) setAvatars(av.data || [])
      } catch {}
    }
    if (featureId) load()
  }, [featureId])

  const { user } = useAuth()

  useEffect(() => {
    const loadAssetsAndWorks = async () => {
      try {
        const [assetsRes, worksRes] = await Promise.all([
          authFetch('/api/assets?limit=200'),
          user?.id
            ? authFetch(`/api/users/works?userId=${encodeURIComponent(user.id)}&visibility=private&limit=200`)
            : Promise.resolve({ json: async () => ({ data: { works: [] } }) } as any)
        ])
        const aJson = await assetsRes.json().catch(() => null)
        const wJson = await worksRes.json().catch(() => null)
        if (aJson?.success) setAssets(aJson.data || [])
        if (wJson?.data?.works) setMyWorks(wJson.data.works || [])
      } catch {}
    }
    loadAssetsAndWorks()
  }, [user?.id])

  const loadOutfitsByAvatar = async (avatarId: string) => {
    if (!avatarId) return
    if (outfitsCache[avatarId]?.length) return
    setLoadingOutfitsFor((prev) => ({ ...prev, [avatarId]: true }))
    try {
      const res = await authFetch(`/api/outfits?avatarId=${encodeURIComponent(avatarId)}&limit=200`)
      const json = await res.json().catch(() => null)
      if (json?.success && Array.isArray(json.data)) {
        setOutfitsCache((prev) => ({ ...prev, [avatarId]: json.data }))
      }
    } finally {
      setLoadingOutfitsFor((prev) => ({ ...prev, [avatarId]: false }))
    }
  }

  const onPickFile = async (idx: number, accept: string) => {
    const input = fileInputs.current[idx]
    if (!input) return
    input.accept = accept
    input.onchange = async (ev: Event) => {
      const target = ev.target as HTMLInputElement
      const file = target.files?.[0]
      if (!file) return
      const isVideo = file.type?.startsWith('video/') || /\.(mp4|mov|webm|m4v|avi|mpeg)$/i.test(file.name)
      if (isVideo) {
        const maxBytes = 40 * 1024 * 1024
        if (file.size > maxBytes) {
          if (typeof window !== 'undefined') window.alert('视频大小需不超过40MB')
          return
        }
        const url = URL.createObjectURL(file)
        const dur = await new Promise<number>((resolve) => {
          const v = document.createElement('video')
          v.preload = 'metadata'
          v.onloadedmetadata = () => {
            resolve(isFinite(v.duration) ? v.duration : 0)
            URL.revokeObjectURL(url)
          }
          v.src = url
        })
        if (dur > 20) {
          if (typeof window !== 'undefined') window.alert('视频时长需不超过20秒')
          return
        }
      }
      try {
        const res = await uploadWorkMediaClient(file, { bucket: 'temp-media', pathPrefix: 'feature' })
        setResolvedValues((prev) => prev.map((v, i) => (i === idx ? res.url : v)))
      } catch {}
    }
    input.click()
  }

  const canSubmit = useMemo(() => {
    if (!config?.workflowId || (nodes?.length ?? 0) === 0) return false
    const TOKENS = {
      IMAGE_UPLOAD: '__IMAGE_UPLOAD__',
      OUTFIT_IMAGE: '__OUTFIT_IMAGE__',
      VIDEO_UPLOAD: '__VIDEO_UPLOAD__',
      PROMPT_TEXT: '__PROMPT_TEXT__',
      CUSTOM_VALUE: '__CUSTOM_VALUE__',
      FILE_UPLOAD: '__FILE_UPLOAD__',
      AVATAR_IMAGE: '__AVATAR_IMAGE__',
      ASSET_IMAGE: '__ASSET_IMAGE__',
      WORK_IMAGE: '__WORK_IMAGE__',
      NUMBER_SELECT: '__NUMBER_SELECT__',
    }
    const requiresValue = (src: ValueSource) => src !== 'custom_value'
    return nodes.every((nc, idx) => {
      if (nc?.visible === false) return true
      if (nc?.required === false) return true
      const fv = String((nc as any)?.fieldValue || '')
      const inferred: ValueSource | undefined = (
        fv === TOKENS.IMAGE_UPLOAD ? 'image_upload' :
        fv === TOKENS.OUTFIT_IMAGE ? 'outfit_image' :
        fv === TOKENS.VIDEO_UPLOAD ? 'video_upload' :
        fv === TOKENS.PROMPT_TEXT ? 'prompt_text' :
        fv === TOKENS.CUSTOM_VALUE ? 'custom_value' :
        fv === TOKENS.FILE_UPLOAD ? 'file_upload' :
        fv === TOKENS.AVATAR_IMAGE ? 'avatar_image' :
        fv === TOKENS.ASSET_IMAGE ? 'asset_image' :
        fv === TOKENS.WORK_IMAGE ? 'work_image' :
        fv === TOKENS.NUMBER_SELECT ? 'number_select' : undefined
      )
      const src = nc.valueSource || inferred || 'custom_value'
      if (!requiresValue(src)) return true
      if (src === 'prompt_text') return !!promptText.trim()
      const val = resolvedValues[idx]
      if (typeof val === 'number') return Number.isFinite(val)
      return !!(val && (val as any)?.trim?.())
    })
  }, [config?.workflowId, nodes, resolvedValues, promptText])

  const onGenerate = async () => {
    if (!canSubmit) {
      if (typeof window !== 'undefined') window.alert('请完善参数后再试')
      return
    }
    setLoading(true)
    try {
      const res = await authFetch(`/api/feature-generate/${featureId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolvedValues, promptText, instanceType: config?.instanceType, usePersonalQueue: config?.usePersonalQueue })
      })
      const json = await res.json()
      if (json?.success) {
        if (typeof window !== 'undefined') window.alert('任务已提交，稍后在私密作品中查看')
        router.back()
      } else {
        if (typeof window !== 'undefined') window.alert(`提交失败：${String(json?.message || '请稍后重试')}`)
        router.back()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 bg-background border-b border px-4 py-4">
        <div className="flex items-center gap-2">
          <button onClick={() => router.back()} aria-label="返回" className="p-2 -ml-2 rounded-full hover:bg-accent">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold">生成</h1>
        </div>
      </header>
      <div className="p-4 space-y-4">
        {config?.intro && (
          <Card className="p-4">
            <div className="text-sm text-muted-foreground whitespace-pre-wrap">{config.intro}</div>
          </Card>
        )}
        {nodes.map((nc, idx) => {
          const TOKENS = {
            IMAGE_UPLOAD: '__IMAGE_UPLOAD__',
            OUTFIT_IMAGE: '__OUTFIT_IMAGE__',
            VIDEO_UPLOAD: '__VIDEO_UPLOAD__',
            PROMPT_TEXT: '__PROMPT_TEXT__',
            CUSTOM_VALUE: '__CUSTOM_VALUE__',
            FILE_UPLOAD: '__FILE_UPLOAD__',
            AVATAR_IMAGE: '__AVATAR_IMAGE__',
            ASSET_IMAGE: '__ASSET_IMAGE__',
          WORK_IMAGE: '__WORK_IMAGE__',
          NUMBER_SELECT: '__NUMBER_SELECT__',
        }
          const fv = String((nc as any)?.fieldValue || '')
          const inferred: ValueSource | undefined = (
            fv === TOKENS.IMAGE_UPLOAD ? 'image_upload' :
            fv === TOKENS.OUTFIT_IMAGE ? 'outfit_image' :
            fv === TOKENS.VIDEO_UPLOAD ? 'video_upload' :
            fv === TOKENS.PROMPT_TEXT ? 'prompt_text' :
            fv === TOKENS.CUSTOM_VALUE ? 'custom_value' :
            fv === TOKENS.FILE_UPLOAD ? 'file_upload' :
            fv === TOKENS.AVATAR_IMAGE ? 'avatar_image' :
            fv === TOKENS.ASSET_IMAGE ? 'asset_image' :
            fv === TOKENS.WORK_IMAGE ? 'work_image' :
            fv === TOKENS.NUMBER_SELECT ? 'number_select' : undefined
          )
          const src = nc.valueSource || inferred || 'custom_value'
          if (nc?.visible === false) return null
          return (
          <Card key={idx} className="p-4 space-y-3">
            <div className="text-sm text-muted-foreground break-words whitespace-pre-wrap leading-relaxed">
              <span>{nc.description || ''}</span>
            </div>
            {src === 'image_upload' && (
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">上传图片</span>
                  <Button onClick={() => onPickFile(idx, 'image/*')}><Upload className="w-4 h-4 mr-1" />选择图片</Button>
                </div>
                {resolvedValues[idx] && <img src={resolvedValues[idx]} className="mt-3 w-full max-h-64 object-contain rounded" />}
                <input ref={(el) => (fileInputs.current[idx] = el)} type="file" className="hidden" />
              </div>
            )}
            {src === 'video_upload' && (
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">上传视频</span>
                  <Button onClick={() => onPickFile(idx, 'video/*')}><Upload className="w-4 h-4 mr-1" />选择视频</Button>
                </div>
                {resolvedValues[idx] && (
                  <video src={resolvedValues[idx]} className="mt-3 w-full max-h-64 rounded" controls />
                )}
                <input ref={(el) => (fileInputs.current[idx] = el)} type="file" className="hidden" />
              </div>
            )}
            {src === 'file_upload' && (
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">上传文件</span>
                  <Button onClick={() => onPickFile(idx, '*/*')}><Upload className="w-4 h-4 mr-1" />选择文件</Button>
                </div>
                {resolvedValues[idx] && (
                  <div className="mt-2 text-xs break-all">已选择：{resolvedValues[idx]}</div>
                )}
                <input ref={(el) => (fileInputs.current[idx] = el)} type="file" className="hidden" />
              </div>
            )}
                {src === 'prompt_text' && (
                  <div>
                    <label className="text-sm mb-1 block">提示词</label>
                    <Input
                      required
                      value={promptText || resolvedValues[idx] || ''}
                      onChange={(e) => {
                        const val = e.target.value
                        setPromptText(val)
                        setResolvedValues((prev) => prev.map((v, i) => (i === idx ? val : v)))
                      }}
                      placeholder="请输入指令"
                    />
                  </div>
                )}
            {src === 'custom_value' && (
              <div className="text-sm">后台自定义值：{nc.defaultValue || '(未设置)'}
                <div className="mt-2 text-xs text-muted-foreground">此项无需用户输入</div>
              </div>
            )}
            {src === 'avatar_image' && (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {avatars.map((av: any) => (
                    <button key={av.id} onClick={() => setResolvedValues((prev) => prev.map((v, i) => (i === idx ? (av.front_face_url || av.avatar_url) : v)))} className={`w-24 h-24 rounded overflow-hidden border ${resolvedValues[idx] === (av.front_face_url || av.avatar_url) ? 'border-primary' : 'border-input'}`}>
                      <img src={av.front_face_url || av.avatar_url} className="w-full h-full object-cover object-top" />
                    </button>
                  ))}
                </div>
                <div className="mt-2">
                  <Button variant="outline" onClick={() => router.push('/avatar-management/new')}>去新建形象</Button>
                </div>
              </div>
            )}
            {src === 'asset_image' && (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {assets.map((as: any) => (
                    <button key={as.id} onClick={() => setResolvedValues((prev) => prev.map((v, i) => (i === idx ? as.image_url : v)))} className={`rounded overflow-hidden border ${resolvedValues[idx] === as.image_url ? 'border-primary' : 'border-input'}`}>
                      <img src={as.image_url} className="w-full h-24 object-cover" />
                    </button>
                  ))}
                </div>
                <div className="mt-2">
                  <Button variant="outline" onClick={() => router.push('/avatar-management/new-asset')}>去新建资产</Button>
                </div>
              </div>
            )}
            {src === 'work_image' && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  {myWorks.filter((w: any) => ((w.type || w.media_type) === 'image')).map((w: any) => (
                    <button key={w.id} onClick={() => setResolvedValues((prev) => prev.map((v, i) => (i === idx ? (w.media_url || w.thumbnail_url) : v)))} className={`rounded overflow-hidden border ${resolvedValues[idx] === (w.media_url || w.thumbnail_url) ? 'border-primary' : 'border-input'}`}>
                      <img src={w.thumbnail_url || w.media_url} className="w-full h-24 object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}
            {src === 'number_select' && (
              <div className="space-y-2">
                <label className="text-sm">选择数字</label>
                {Array.isArray(nc.numberOptions) && nc.numberOptions.length > 0 ? (
                  <Select
                    value={String(resolvedValues[idx] ?? '')}
                    onValueChange={(v) => setResolvedValues((prev) => prev.map((val, i) => (i === idx ? Number(v) : val)))}
                  >
                    <SelectTrigger><SelectValue placeholder="请选择数字" /></SelectTrigger>
                    <SelectContent>
                      {nc.numberOptions.map((num) => (
                        <SelectItem key={num} value={String(num)}>{num}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="text-xs text-muted-foreground">后台未配置数字选项</div>
                )}
              </div>
            )}
            {src === 'outfit_image' && (
              <div className="space-y-3">
                <div className="text-sm">先选择形象，再选择该形象的穿搭图</div>
                <div className="grid grid-cols-3 gap-2">
                  {avatars.map((av: any) => (
                    <button
                      key={av.id}
                      onClick={() => {
                        setSelectedAvatarForNode((prev) => ({ ...prev, [idx]: av.id }))
                        loadOutfitsByAvatar(av.id)
                      }}
                      className={`w-24 h-24 rounded overflow-hidden border ${selectedAvatarForNode[idx] === av.id ? 'border-primary' : 'border-input'}`}
                    >
                      <img src={av.front_face_url || av.avatar_url} className="w-full h-full object-cover object-top" />
                    </button>
                  ))}
                </div>
                <div>
                  {selectedAvatarForNode[idx] ? (
                    <div className="space-y-2">
                      {loadingOutfitsFor[selectedAvatarForNode[idx]] && (
                        <div className="text-xs text-muted-foreground">加载穿搭中...</div>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {(outfitsCache[selectedAvatarForNode[idx]] || []).map((of: any) => (
                          <button
                            key={of.id}
                            onClick={() => setResolvedValues((prev) => prev.map((v, i) => (i === idx ? of.image_url : v)))}
                            className={`w-24 aspect-[2/3] rounded overflow-hidden border ${resolvedValues[idx] === of.image_url ? 'border-primary' : 'border-input'}`}
                          >
                            <img src={of.image_url} className="w-full h-full object-cover object-top" />
                          </button>
                        ))}
                      </div>
                      <div className="mt-2 flex gap-2">
                        <Button variant="outline" onClick={() => router.push('/avatar-management/new')}>去新建形象</Button>
                        <Button
                          variant="outline"
                          onClick={() => router.push(`/avatar-management/${selectedAvatarForNode[idx]}/new-outfit`)}
                        >
                          去新建穿搭
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2">
                      <Button variant="outline" onClick={() => router.push('/avatar-management/new')}>去新建形象</Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </Card>
          )
        })}
        <Button disabled={loading || !canSubmit} onClick={onGenerate} className="w-full h-12 text-base rounded-2xl">
          {loading ? '生成中...' : '开始生成'}
        </Button>
      </div>
    </div>
  )
}
