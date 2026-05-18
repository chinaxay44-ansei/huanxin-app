"use client"

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useParams } from 'next/navigation'
import { ChevronLeft, Upload } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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

interface SameStyleConfig {
  apiKey: string
  workflowId: string
  instanceType?: string
  usePersonalQueue?: boolean
  webhookUrl?: string
  intro?: string
  nodeConfigs: NodeConfigItem[]
}

export default function SameStylePage() {
  const router = useRouter()
  const { workId } = useParams() as { workId?: string }
  const [mounted, setMounted] = useState(false)
  const [wid, setWid] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [work, setWork] = useState<any>(null)
  const [config, setConfig] = useState<SameStyleConfig | null>(null)
  const [nodeConfigs, setNodeConfigs] = useState<NodeConfigItem[]>([])
  const [resolvedValues, setResolvedValues] = useState<(string | number)[]>([])
  const [promptText, setPromptText] = useState<string>('')
  const [avatars, setAvatars] = useState<any[]>([])
  const [selectedAvatarId, setSelectedAvatarId] = useState<string>('')
  const [outfits, setOutfits] = useState<any[]>([])
  const [assets, setAssets] = useState<any[]>([])
  const [myWorks, setMyWorks] = useState<any[]>([])
  const fileInputs = useRef<Record<number, HTMLInputElement | null>>({})

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!mounted) return
    if (workId) { setWid(workId); return }
    const parts = window.location.pathname.split('/').filter(Boolean)
    const idx = parts.findIndex(p => p === 'same-style')
    if (idx !== -1 && parts[idx + 1]) setWid(parts[idx + 1])
  }, [mounted, workId])

  useEffect(() => {
    const load = async () => {
      try {
        const [workRes, jsonCfgRes, avatarsRes] = await Promise.all([
          fetch(`/api/works/${wid}`),
          fetch(`/api/works/json-config/${wid}`),
          authFetch('/api/ai/avatars?limit=50')
        ])
        const workJson = await workRes.json()
        const jsonCfg = await jsonCfgRes.json()
        const avJson = await avatarsRes.json()
        if (workJson?.success) setWork(workJson.data)
        const cfg = jsonCfg?.config || null
        if (cfg) setConfig(cfg)
        const list = (cfg?.nodeInfoList || []) as NodeConfigItem[]
        setNodeConfigs(list)
        setResolvedValues(new Array(list.length).fill(''))
        if (avJson?.success) setAvatars(avJson.data || [])
        if (!cfg || !cfg.workflowId) {
          {loading ? '生成中...' : '开始生成'}
        } else if (!list || list.length === 0) {
          {loading ? '生成中...' : '开始生成'}
        } else {
          {loading ? '生成中...' : '开始生成'}
        }
      } catch {}
    }
    if (mounted && wid) load()
  }, [mounted, wid])

  const onPickFile = async (idx: number, accept: string) => {
    const input = fileInputs.current[idx]
    if (!input) return
    input.accept = accept
    input.onchange = async (ev: Event) => {
      const target = ev.target as HTMLInputElement
      const file = target.files?.[0]
      if (!file) return
      try {
        const res = await uploadWorkMediaClient(file, { bucket: 'temp-media', pathPrefix: 'same-style' })
        setResolvedValues((prev) => prev.map((v, i) => (i === idx ? res.url : v)))
      } catch {}
    }
    input.click()
  }

  const onSelectAvatar = async (avatarId: string) => {
    setSelectedAvatarId(avatarId)
    try {
      const res = await authFetch(`/api/outfits?avatarId=${avatarId}&limit=100`)
      const json = await res.json()
      if (json?.success) setOutfits(json.data || [])
    } catch {}
  }

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

  const canSubmit = useMemo(() => {
    if (!config?.workflowId || (nodeConfigs?.length ?? 0) === 0) return false
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
    return nodeConfigs.every((nc, idx) => {
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
  }, [config?.workflowId, nodeConfigs, resolvedValues, promptText])

  const onGenerate = async () => {
    if (!canSubmit) {
          {loading ? '生成中...' : '开始生成'}
      return
    }
    setLoading(true)
    try {
      const res = await authFetch(`/api/same-style/generate/${wid}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolvedValues, promptText, instanceType: config?.instanceType, usePersonalQueue: config?.usePersonalQueue })
      })
      const json = await res.json()
      if (json?.success) {
          {loading ? '生成中...' : '开始生成'}
        router.back()
      } else {
          {loading ? '生成中...' : '开始生成'}
        router.back()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 bg-background border-b px-4 py-4">
        <div className="flex items-center gap-2">
          <button onClick={() => router.back()} aria-label="返回" className="p-2 -ml-2 rounded-full hover:bg-muted">
            <ChevronLeft className="w-5 h-5" />
          </button>

          {loading ? '生成中...' : '开始生成'}
        </div>
      </header>

      <div className="p-4 space-y-4">
        {config?.intro && (
          <Card className="p-4">
            <div className="text-sm text-muted-foreground whitespace-pre-wrap">{config.intro}</div>
          </Card>
        )}
        {error && (
          <Card className="p-3">
            <div className="text-sm text-red-500">{error}</div>
          </Card>
        )}
        {nodeConfigs.map((nc, idx) => {
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
            {src === 'outfit_image' && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <div className="text-sm">先选择形象，再选择该形象的穿搭</div>
                  <div className="flex flex-wrap gap-2">
                    {avatars.map((av: any) => (
                      <button
                        key={av.id}
                        onClick={() => onSelectAvatar(av.id)}
                        className={`w-24 h-24 rounded overflow-hidden border ${selectedAvatarId === av.id ? 'border-primary' : 'border-input'}`}
                      >
                        <img src={av.front_face_url || av.avatar_url} className="w-full h-full object-cover object-top" />
                      </button>
                    ))}
                  </div>
                  <div className="mt-2">
                    <Button variant="outline" onClick={() => router.push('/avatar-management/new')}>去新建形象</Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {outfits.map((o: any) => (
                    <button key={o.id} onClick={() => setResolvedValues((prev) => prev.map((v, i) => (i === idx ? o.image_url : v)))} className={`w-24 aspect-[2/3] rounded overflow-hidden border ${resolvedValues[idx] === o.image_url ? 'border-primary' : 'border-input'}`}>
                      <img src={o.image_url} className="w-full h-full object-cover object-top" />
                    </button>
                  ))}
                </div>
                <div className="mt-2">
                  <Button variant="outline" onClick={() => selectedAvatarId ? router.push(`/avatar-management/${selectedAvatarId}/new-outfit`) : router.push('/avatar-management')}>去新建穿搭</Button>
                </div>
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
                <div className="grid grid-cols-3 gap-2">
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
            {src === 'prompt_text' && (
              <div>
                <label className="text-sm mb-1 block">提示词</label>
                <Input required value={promptText} onChange={(e) => setPromptText(e.target.value)} placeholder="请输入提示词" />
              </div>
            )}
            {src === 'custom_value' && (
              <div className="text-sm">后台自定义值：{nc.defaultValue || '（未设置）'}
                <div className="mt-2 text-xs text-muted-foreground">此项无需用户输入</div>
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


