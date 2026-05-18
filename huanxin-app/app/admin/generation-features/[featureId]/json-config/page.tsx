"use client"

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Trash2 } from 'lucide-react'

type ValueSource = 'image_upload' | 'outfit_image' | 'video_upload' | 'prompt_text' | 'custom_value' | 'file_upload' | 'avatar_image' | 'asset_image' | 'work_image' | 'number_select'

const TOKENS: Record<ValueSource, string> = {
  image_upload: '__IMAGE_UPLOAD__',
  outfit_image: '__OUTFIT_IMAGE__',
  video_upload: '__VIDEO_UPLOAD__',
  prompt_text: '__PROMPT_TEXT__',
  custom_value: '__CUSTOM_VALUE__',
  file_upload: '__FILE_UPLOAD__',
  avatar_image: '__AVATAR_IMAGE__',
  asset_image: '__ASSET_IMAGE__',
  work_image: '__WORK_IMAGE__',
  number_select: '__NUMBER_SELECT__',
}
const UPLOAD_LINKED_SOURCES: ValueSource[] = ['image_upload', 'video_upload', 'file_upload', 'work_image']

interface NodeItem {
  nodeId: string
  fieldName: string
  fieldValue: string
  valueSource?: ValueSource
  description?: string
  defaultValue?: string
  visible?: boolean
  required?: boolean
  useUploadedMediaAsDefault?: boolean
  numberOptions?: number[]
  // Keep raw input text so commas aren't stripped while typing
  numberOptionsString?: string
}

const resolveValueSource = (node: NodeItem): ValueSource => {
  if (node.valueSource) return node.valueSource
  const matched = Object.entries(TOKENS).find(([, token]) => token === node.fieldValue)
  return (matched?.[0] as ValueSource) || 'custom_value'
}

const isUploadLinkedNode = (node: NodeItem) => UPLOAD_LINKED_SOURCES.includes(resolveValueSource(node))

interface Config {
  apiKey: string
  workflowId: string
  intro?: string
  instanceType?: 'plus'
  nodeInfoList: NodeItem[]
}

export default function FeatureJsonConfigPage() {
  const router = useRouter()
  const { featureId } = useParams() as { featureId?: string }
  const adminToken = process.env.NEXT_PUBLIC_ADMIN_API_TOKEN || ''
  const [config, setConfig] = useState<Config>({ apiKey: '', workflowId: '', intro: '', instanceType: undefined, nodeInfoList: [] })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        if (!featureId) return
        const res = await fetch(`/api/admin/generation-features/json-config/${featureId}`, { headers: adminToken ? { 'x-admin-token': adminToken } : undefined })
        const json = await res.json()
        if (json?.config) setConfig(json.config as Config)
      } catch {}
    }
    load()
  }, [featureId, adminToken])

  const addNode = () => {
    setConfig((prev) => ({
      ...prev,
      nodeInfoList: [
        ...prev.nodeInfoList,
        {
          nodeId: '',
          fieldName: '',
          fieldValue: TOKENS.prompt_text,
          valueSource: 'prompt_text',
          description: '',
          defaultValue: '',
          visible: true,
          required: true,
          useUploadedMediaAsDefault: true,
          numberOptions: [],
        },
      ],
    }))
  }
  const updateNode = (idx: number, patch: Partial<NodeItem>) => {
    setConfig((prev) => ({ ...prev, nodeInfoList: prev.nodeInfoList.map((n, i) => (i === idx ? { ...n, ...patch } : n)) }))
  }
  const updateSource = (idx: number, src: ValueSource) => {
    updateNode(idx, { valueSource: src, fieldValue: TOKENS[src] })
  }
  const removeNode = (idx: number) => {
    setConfig((prev) => ({ ...prev, nodeInfoList: prev.nodeInfoList.filter((_, i) => i !== idx) }))
  }

  const save = async () => {
    setSaving(true)
    try {
      if (!featureId) return
      const payload: Config = {
        ...config,
        nodeInfoList: config.nodeInfoList.map(({ numberOptionsString, ...rest }) => rest),
      }
      const res = await fetch(`/api/admin/generation-features/json-config/${featureId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(adminToken ? { 'x-admin-token': adminToken } : {}) },
        body: JSON.stringify({ config: payload })
      })
      const json = await res.json()
      if (!res.ok || !json?.success) return
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">功能请求 JSON 配置</h1>
        <Button variant="outline" onClick={() => router.back()}>返回</Button>
      </div>

      <Card className="p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm mb-1 block">API Key</label>
            <Input value={config.apiKey} onChange={(e) => setConfig({ ...config, apiKey: e.target.value })} />
          </div>
          <div>
            <label className="text-sm mb-1 block">Workflow ID</label>
            <Input value={config.workflowId} onChange={(e) => setConfig({ ...config, workflowId: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm mb-1 block">介绍（顶部展示，不参与请求）</label>
            <Input value={config.intro || ''} onChange={(e) => setConfig((prev) => ({ ...prev, intro: e.target.value }))} />
          </div>
          <div className="md:col-span-2 flex flex-col gap-1 rounded-md border p-3 bg-muted/30">
            <label className="text-sm font-medium flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.instanceType === 'plus'}
                onChange={(e) => setConfig((prev) => ({ ...prev, instanceType: e.target.checked ? 'plus' : undefined }))}
              />
              使用 plus 模式（48G 显存）
            </label>
            <p className="text-xs text-muted-foreground">勾选后功能生成接口会携带 "instanceType": "plus"</p>
          </div>
        </div>
      </Card>

      <Card className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">nodeInfoList</h2>
          <Button onClick={addNode}><Plus className="w-4 h-4 mr-1" />新增节点</Button>
        </div>
        <div className="space-y-4">
          {config.nodeInfoList.map((n, idx) => {
            const uploadLinked = isUploadLinkedNode(n)
            const usesUploadDefault = n.useUploadedMediaAsDefault !== false
            return (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
                <div>
                  <label className="text-sm mb-1 block">nodeId</label>
                  <Input value={n.nodeId} onChange={(e) => updateNode(idx, { nodeId: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm mb-1 block">fieldName</label>
                  <Input value={n.fieldName} onChange={(e) => updateNode(idx, { fieldName: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm mb-1 block">说明</label>
                  <Input value={n.description || ''} onChange={(e) => updateNode(idx, { description: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm mb-1 block">值来源</label>
                  <Select value={n.valueSource || 'prompt_text'} onValueChange={(v) => updateSource(idx, v as ValueSource)}>
                    <SelectTrigger><SelectValue placeholder="选择" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="image_upload">图片_用户上传图</SelectItem>
                      <SelectItem value="outfit_image">图片_用户穿搭图</SelectItem>
                      <SelectItem value="video_upload">视频_用户上传视频</SelectItem>
                      <SelectItem value="prompt_text">提示词_用户输入的提示词</SelectItem>
                    <SelectItem value="custom_value">自定义字段值</SelectItem>
                    <SelectItem value="file_upload">文件_用户上传文件</SelectItem>
                    <SelectItem value="avatar_image">图片_用户头像图</SelectItem>
                    <SelectItem value="asset_image">图片_用户资产图</SelectItem>
                    <SelectItem value="work_image">图片_用户作品图片</SelectItem>
                    <SelectItem value="number_select">数字选择</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm mb-1 block">fieldValue（自定义时填写具体值）</label>
                  <Input value={n.fieldValue} onChange={(e) => updateNode(idx, { fieldValue: e.target.value })} />
                </div>
              <div>
                <label className="text-sm mb-1 block">默认值</label>
                <Input value={n.defaultValue || ''} onChange={(e) => updateNode(idx, { defaultValue: e.target.value })} />
              </div>
              {resolveValueSource(n) === 'number_select' && (
                <div>
                  <label className="text-sm mb-1 block">数字选项（用逗号分隔）</label>
                  <Input
                    value={n.numberOptionsString ?? (n.numberOptions || []).join(',')}
                    onChange={(e) => {
                      const inputValue = e.target.value
                      const nums = inputValue
                        .split(',')
                        .map(s => s.trim())
                        .filter(Boolean)
                        .map((s) => Number(s))
                        .filter((v) => Number.isFinite(v))
                      updateNode(idx, { numberOptions: nums, numberOptionsString: inputValue })
                    }}
                    placeholder="如：1,2,5,10"
                  />
                </div>
              )}
                <div className="flex flex-wrap items-center gap-3 md:col-span-2">
                  <label className="text-sm flex items-center gap-2">
                    <input type="checkbox" checked={n.visible !== false} onChange={(e) => updateNode(idx, { visible: e.target.checked })} />
                    可见
                  </label>
                  <label className="text-sm flex items-center gap-2">
                    <input type="checkbox" checked={n.required !== false} onChange={(e) => updateNode(idx, { required: e.target.checked })} />
                    必填
                  </label>
                  {uploadLinked && (
                    <Button
                      type="button"
                      variant={usesUploadDefault ? 'secondary' : 'outline'}
                      onClick={() => updateNode(idx, { useUploadedMediaAsDefault: !usesUploadDefault })}
                    >
                      {usesUploadDefault ? '已使用本次上传URL' : '使用本次上传URL作为默认值'}
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={() => removeNode(idx)}><Trash2 className="w-4 h-4 mr-1" />删除</Button>
                </div>
              </div>
            )
          })}
        </div>
        <div className="flex justify-end">
          <Button disabled={saving || !featureId} onClick={save}>{saving ? '保存中…' : '保存配置'}</Button>
        </div>
      </Card>
    </div>
  )
}
