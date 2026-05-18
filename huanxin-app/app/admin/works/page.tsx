"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";

type UserSummary = {
  nickname?: string | null;
  avatar_url?: string | null;
};

type WorkItem = {
  id: string;
  title: string | null;
  description: string | null;
  status: string;
  visibility: string;
  created_at: string;
  users?: UserSummary | null;
  type?: 'image' | 'video';
  category?: string | null; // slug
};

export default function AdminWorksPage() {
  const [items, setItems] = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("none");
  const [visibilityFilter, setVisibilityFilter] = useState<string>("none");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [imageCategories, setImageCategories] = useState<Array<{ slug: string; name: string }>>([])
  const [videoCategories, setVideoCategories] = useState<Array<{ slug: string; name: string }>>([])

  const [uploadFiles, setUploadFiles] = useState<File[]>([])
  const [uploadUserId, setUploadUserId] = useState<string>('')
  const [uploadCategory, setUploadCategory] = useState<string>('none')
  const [uploadVisibility, setUploadVisibility] = useState<string>('public')
  const [uploadStatus, setUploadStatus] = useState<string>('published')
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
  }
  const resolveValueSource = (node: NodeItem): ValueSource => {
    if (node.valueSource) return node.valueSource
    const matched = Object.entries(TOKENS).find(([, token]) => token === node.fieldValue)
    return (matched?.[0] as ValueSource) || 'custom_value'
  }
  const isUploadLinkedNode = (node: NodeItem) => UPLOAD_LINKED_SOURCES.includes(resolveValueSource(node))
  interface Config { apiKey: string; workflowId: string; intro?: string; instanceType?: 'plus'; nodeInfoList: NodeItem[] }
  type GenerationFeature = { id: string; name?: string | null; slug?: string | null; is_directory?: boolean }
  const [uploadConfig, setUploadConfig] = useState<Config>({ apiKey: '', workflowId: '', intro: '', instanceType: undefined, nodeInfoList: [] })
  const [bulkConfig, setBulkConfig] = useState<Config>({ apiKey: '', workflowId: '', intro: '', instanceType: undefined, nodeInfoList: [] })
  const [featureDialogOpen, setFeatureDialogOpen] = useState(false)
  const [featureOptions, setFeatureOptions] = useState<GenerationFeature[]>([])
  const [featureSearch, setFeatureSearch] = useState('')
  const [featureListLoading, setFeatureListLoading] = useState(false)
  const [featureLoading, setFeatureLoading] = useState(false)
  const [selectedFeatureId, setSelectedFeatureId] = useState('')

  const adminToken = process.env.NEXT_PUBLIC_ADMIN_API_TOKEN ?? "";

  const totalPages = useMemo(() => {
    return total > 0 ? Math.ceil(total / limit) : 1;
  }, [total, limit]);
  const filteredFeatureOptions = useMemo(() => {
    const term = featureSearch.trim();
    if (!term) return featureOptions;
    return featureOptions.filter((item) => {
      const name = String(item.name || "");
      const slug = String(item.slug || "");
      return name.includes(term) || slug.includes(term);
    });
  }, [featureOptions, featureSearch]);

  async function fetchItems(curPage = page) {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("page", String(curPage));
      params.set("limit", String(limit));
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter && statusFilter !== "none") params.set("status", statusFilter);
      if (visibilityFilter && visibilityFilter !== "none") params.set("visibility", visibilityFilter);

      const res = await fetch(`/api/admin/works?${params.toString()}`, {
        headers: adminToken ? { "x-admin-token": adminToken } : undefined,
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "加载作品失败");
      }
      const data = await res.json();
      setItems(data.items || []);
      setSelectedIds([]);
      setTotal(data.total || 0);
      setPage(data.page || 1);
    } catch (e: any) {
      toast.error(e.message || "加载作品失败");
    } finally {
      setLoading(false);
    }
  }

  const loadFeatureOptions = async () => {
    if (featureListLoading) return;
    try {
      setFeatureListLoading(true);
      const qs = new URLSearchParams({ page: "1", limit: "1000" }).toString();
      const res = await fetch(`/api/admin/generation-features?${qs}`, {
        headers: adminToken ? { "x-admin-token": adminToken } : undefined,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "加载功能列表失败");
      const list = Array.isArray(json?.items) ? json.items : [];
      setFeatureOptions(list.filter((item: any) => !item?.is_directory));
    } catch (e: any) {
      toast.error(e.message || "加载功能列表失败");
    } finally {
      setFeatureListLoading(false);
    }
  };

  const openFeatureDialog = () => {
    setFeatureDialogOpen(true);
    loadFeatureOptions();
  };

  const normalizeFeatureConfig = (cfg: Partial<Config>): Config => {
    const nodeInfoList = Array.isArray(cfg.nodeInfoList)
      ? cfg.nodeInfoList.map((node) => ({
          ...node,
          valueSource: node.valueSource || resolveValueSource(node),
        }))
      : [];
    return {
      apiKey: cfg.apiKey || uploadConfig.apiKey,
      workflowId: cfg.workflowId || "",
      intro: cfg.intro || "",
      instanceType: cfg.instanceType,
      nodeInfoList,
    };
  };

  const applyFeatureConfig = async () => {
    if (!selectedFeatureId) {
      toast.error("请选择功能");
      return;
    }
    try {
      setFeatureLoading(true);
      const res = await fetch(
        `/api/admin/generation-features/json-config/${selectedFeatureId}`,
        { headers: adminToken ? { "x-admin-token": adminToken } : undefined }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "读取配置失败");
      if (!json?.config) throw new Error("该功能未配置 JSON");
      const nextConfig = normalizeFeatureConfig(json.config as Config);
      setUploadConfig(nextConfig);
      setFeatureDialogOpen(false);
      toast.success("已填入功能 JSON 配置");
    } catch (e: any) {
      toast.error(e.message || "解析失败");
    } finally {
      setFeatureLoading(false);
    }
  };

  useEffect(() => {
    // 初次加载
    fetchItems(1);
    // 拉取分类
    ;(async () => {
      try {
        const imgRes = await fetch('/api/categories?type=image')
        const imgJson = await imgRes.json()
        const vidRes = await fetch('/api/categories?type=video')
        const vidJson = await vidRes.json()
        setImageCategories((imgJson || []).map((c: any) => ({ slug: c.slug || c.id, name: c.name })))
        setVideoCategories((vidJson || []).map((c: any) => ({ slug: c.slug || c.id, name: c.name })))
      } catch {}
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyFilters() {
    setPage(1);
    fetchItems(1);
  }

  async function handleUpdate(item: WorkItem, patch: Partial<WorkItem>) {
    try {
      const body = {
        id: item.id,
        ...(patch.title !== undefined ? { title: patch.title } : {}),
        ...(patch.description !== undefined ? { description: patch.description } : {}),
        ...(patch.status !== undefined ? { status: patch.status } : {}),
        ...(patch.visibility !== undefined ? { visibility: patch.visibility } : {}),
        ...(patch.category !== undefined ? { category: patch.category ?? '' } : {}),
      };
      const res = await fetch("/api/admin/works", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(adminToken ? { "x-admin-token": adminToken } : {}),
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "更新失败");
      }
      toast.success("更新成功");
      fetchItems(page);
    } catch (e: any) {
      toast.error(e.message || "更新失败");
    }
  }

  function toggleSelect(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const set = new Set(prev)
      if (checked) set.add(id); else set.delete(id)
      return Array.from(set)
    })
  }

  function toggleSelectAll(checked: boolean) {
    if (checked) setSelectedIds(items.map((i) => i.id))
    else setSelectedIds([])
  }

  async function bulkUpdateStatus(nextStatus: string) {
    if (selectedIds.length === 0) { toast.error("请先选择作品"); return }
    try {
      setLoading(true)
      const headers: Record<string, string> = { "Content-Type": "application/json" }
      if (adminToken) headers["x-admin-token"] = adminToken
      await Promise.all(selectedIds.map(async (id) => {
        const res = await fetch("/api/admin/works", { method: "PUT", headers, body: JSON.stringify({ id, status: nextStatus }) })
        if (!res.ok) throw new Error(await res.text())
      }))
      toast.success("批量更新成功")
      fetchItems(page)
    } catch (e: any) {
      toast.error(e.message || "批量更新失败")
    } finally {
      setLoading(false)
    }
  }

  async function bulkUpdateVisibility(nextVisibility: string) {
    if (selectedIds.length === 0) { toast.error("请先选择作品"); return }
    try {
      setLoading(true)
      const headers: Record<string, string> = { "Content-Type": "application/json" }
      if (adminToken) headers["x-admin-token"] = adminToken
      await Promise.all(selectedIds.map(async (id) => {
        const res = await fetch("/api/admin/works", { method: "PUT", headers, body: JSON.stringify({ id, visibility: nextVisibility }) })
        if (!res.ok) throw new Error(await res.text())
      }))
      toast.success("批量更新成功")
      fetchItems(page)
    } catch (e: any) {
      toast.error(e.message || "批量更新失败")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch('/api/users/search?keyword=' + encodeURIComponent('新星2556'))
        const list = await res.json()
        const hit = Array.isArray(list) ? list.find((x: any) => (x?.nickname || '') === '新星2556') : null
        if (hit?.id) setUploadUserId(hit.id)
      } catch {}
    })()
  }, [])

  async function handleBulkUploadSubmit() {
    if (!uploadUserId || uploadFiles.length === 0) { toast.error("请填写用户ID并选择文件"); return }
    try {
      setLoading(true)
      const fd = new FormData()
      uploadFiles.forEach(f => fd.append('files', f))
      fd.append('userId', uploadUserId)
      if (uploadCategory && uploadCategory !== 'none') fd.append('category', uploadCategory)
      fd.append('visibility', uploadVisibility)
      fd.append('status', uploadStatus)
      if (uploadConfig && (uploadConfig.nodeInfoList?.length || uploadConfig.workflowId || uploadConfig.apiKey || uploadConfig.intro)) {
        fd.append('jsonConfig', JSON.stringify(uploadConfig))
      }
      const headers: Record<string, string> = {}
      if (adminToken) headers['x-admin-token'] = adminToken
      const res = await fetch('/api/admin/works/bulk-upload', { method: 'POST', headers, body: fd })
      const json = await res.json()
      if (!res.ok || !json?.success) throw new Error(json?.error || '批量上新失败')
      const errs = Array.isArray(json?.results) ? json.results.filter((r: any) => r?.error) : []
      if (errs.length > 0) {
        const first = errs[0]
        toast.error(`部分失败：${errs.length} 条；原因示例：${first?.error}${first?.detail ? ' - ' + first.detail : ''}`)
      }
      toast.success(`创建成功：${json.created} 条`)
      setUploadFiles([])
      setUploadConfig({ apiKey: uploadConfig.apiKey, workflowId: '', intro: '', instanceType: uploadConfig.instanceType, nodeInfoList: [] })
      fetchItems(1)
    } catch (e: any) {
      toast.error(e.message || '批量上新失败')
    } finally {
      setLoading(false)
    }
  }

  async function handleBulkApplyJson() {
    if (selectedIds.length === 0) { toast.error('请先勾选作品'); return }
    const cfg = bulkConfig
    try {
      setLoading(true)
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (adminToken) headers['x-admin-token'] = adminToken
      const res = await fetch('/api/admin/works/json-config/bulk', { method: 'POST', headers, body: JSON.stringify({ workIds: selectedIds, config: cfg }) })
      const json = await res.json()
      if (!res.ok || !json?.success) throw new Error(json?.error || '批量应用失败')
      toast.success(`已更新：${json.updated} 条`)
      setBulkConfig({ apiKey: bulkConfig.apiKey, workflowId: bulkConfig.workflowId, intro: '', instanceType: bulkConfig.instanceType, nodeInfoList: [] })
      fetchItems(page)
    } catch (e: any) {
      toast.error(e.message || '批量应用失败')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(item: WorkItem) {
    try {
      const res = await fetch(`/api/admin/works?id=${item.id}`, {
        method: "DELETE",
        headers: adminToken ? { "x-admin-token": adminToken } : undefined,
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "删除失败");
      }
      toast.success("已软删除");
      fetchItems(page);
    } catch (e: any) {
      toast.error(e.message || "删除失败");
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">作品管理</h1>
        <p className="text-sm text-muted-foreground mt-1">
          支持筛选、编辑状态/可见性以及软删除
        </p>
      </div>

      <div className="border rounded-md p-4 space-y-3">
        <div className="font-semibold">批量上新作品</div>
        <div className="flex flex-wrap items-center gap-3">
          <input type="file" multiple onChange={(e) => setUploadFiles(Array.from(e.target.files || []))} />
          <Input placeholder="目标用户ID" value={uploadUserId} onChange={(e) => setUploadUserId(e.target.value)} className="w-64" />
          <Select value={uploadCategory} onValueChange={setUploadCategory}>
            <SelectTrigger className="w-48"><SelectValue placeholder="分类（可选）" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">无分类</SelectItem>
              {imageCategories.map((c) => (<SelectItem key={c.slug} value={c.slug}>{c.name}</SelectItem>))}
              {videoCategories.map((c) => (<SelectItem key={c.slug} value={c.slug}>{c.name}</SelectItem>))}
            </SelectContent>
          </Select>
          <Select value={uploadVisibility} onValueChange={setUploadVisibility}>
            <SelectTrigger className="w-40"><SelectValue placeholder="可见性" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="public">公开</SelectItem>
              <SelectItem value="followers">粉丝可见</SelectItem>
              <SelectItem value="private">私密</SelectItem>
            </SelectContent>
          </Select>
          <Select value={uploadStatus} onValueChange={setUploadStatus}>
            <SelectTrigger className="w-40"><SelectValue placeholder="状态" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">草稿</SelectItem>
              <SelectItem value="reviewing">审核中</SelectItem>
              <SelectItem value="published">已发布</SelectItem>
              <SelectItem value="rejected">已驳回</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleBulkUploadSubmit} disabled={loading}>提交上新</Button>
        </div>
        <Card className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm mb-1 block">API Key</label>
              <Input value={uploadConfig.apiKey} onChange={(e) => setUploadConfig({ ...uploadConfig, apiKey: e.target.value })} />
            </div>
            <div>
              <label className="text-sm mb-1 block">Workflow ID</label>
              <Input value={uploadConfig.workflowId} onChange={(e) => setUploadConfig({ ...uploadConfig, workflowId: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm mb-1 block">介绍（不参与请求）</label>
              <Input value={uploadConfig.intro || ''} onChange={(e) => setUploadConfig((prev) => ({ ...prev, intro: e.target.value }))} />
            </div>
            <div className="md:col-span-2 flex flex-col gap-1 rounded-md border p-3 bg-muted/30">
              <label className="text-sm font-medium flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={uploadConfig.instanceType === 'plus'}
                  onChange={(e) => setUploadConfig((prev) => ({ ...prev, instanceType: e.target.checked ? 'plus' : undefined }))}
                />
                使用 plus 模式（48G 显存）
              </label>
              <p className="text-xs text-muted-foreground">勾选后发起任务会自动携带 "instanceType": "plus" 字段</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">nodeInfoList（可选）</h2>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={openFeatureDialog} disabled={featureListLoading}>
                {featureListLoading ? "加载中..." : "解析已有功能 JSON 配置到此"}
              </Button>
              <Button onClick={() => setUploadConfig(prev => ({ ...prev, nodeInfoList: [...prev.nodeInfoList, { nodeId: '', fieldName: '', fieldValue: TOKENS.prompt_text, valueSource: 'prompt_text', description: '', defaultValue: '', visible: true, required: true, useUploadedMediaAsDefault: true }] }))}><Plus className="w-4 h-4 mr-1" />新增节点</Button>
            </div>
          </div>
          <div className="space-y-4">
            {uploadConfig.nodeInfoList.map((n, idx) => {
              const uploadLinked = isUploadLinkedNode(n)
              const usesUploadDefault = n.useUploadedMediaAsDefault !== false
              return (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
                  <div>
                    <label className="text-sm mb-1 block">nodeId</label>
                    <Input value={n.nodeId} onChange={(e) => setUploadConfig(prev => ({ ...prev, nodeInfoList: prev.nodeInfoList.map((x, i) => i === idx ? { ...x, nodeId: e.target.value } : x) }))} />
                  </div>
                  <div>
                    <label className="text-sm mb-1 block">fieldName</label>
                    <Input value={n.fieldName} onChange={(e) => setUploadConfig(prev => ({ ...prev, nodeInfoList: prev.nodeInfoList.map((x, i) => i === idx ? { ...x, fieldName: e.target.value } : x) }))} />
                  </div>
                  <div>
                    <label className="text-sm mb-1 block">说明</label>
                    <Input value={n.description || ''} onChange={(e) => setUploadConfig(prev => ({ ...prev, nodeInfoList: prev.nodeInfoList.map((x, i) => i === idx ? { ...x, description: e.target.value } : x) }))} />
                  </div>
                  <div>
                    <label className="text-sm mb-1 block">值来源</label>
                    <Select value={n.valueSource || 'prompt_text'} onValueChange={(v) => setUploadConfig(prev => ({ ...prev, nodeInfoList: prev.nodeInfoList.map((x, i) => i === idx ? { ...x, valueSource: v as ValueSource, fieldValue: TOKENS[v as ValueSource] } : x) }))}>
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
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm mb-1 block">fieldValue（自定义时填写具体值）</label>
                    <Input value={n.fieldValue} onChange={(e) => setUploadConfig(prev => ({ ...prev, nodeInfoList: prev.nodeInfoList.map((x, i) => i === idx ? { ...x, fieldValue: e.target.value } : x) }))} />
                  </div>
                  <div>
                    <label className="text-sm mb-1 block">默认值</label>
                    <Input value={n.defaultValue || ''} onChange={(e) => setUploadConfig(prev => ({ ...prev, nodeInfoList: prev.nodeInfoList.map((x, i) => i === idx ? { ...x, defaultValue: e.target.value } : x) }))} />
                  </div>
                  <div className="flex flex-wrap items-center gap-3 md:col-span-2">
                    <label className="text-sm flex items-center gap-2">
                      <input type="checkbox" checked={n.visible !== false} onChange={(e) => setUploadConfig(prev => ({ ...prev, nodeInfoList: prev.nodeInfoList.map((x, i) => i === idx ? { ...x, visible: e.target.checked } : x) }))} />
                      可见
                    </label>
                    <label className="text-sm flex items-center gap-2">
                      <input type="checkbox" checked={n.required !== false} onChange={(e) => setUploadConfig(prev => ({ ...prev, nodeInfoList: prev.nodeInfoList.map((x, i) => i === idx ? { ...x, required: e.target.checked } : x) }))} />
                      必填
                    </label>
                    {uploadLinked && (
                      <Button
                        type="button"
                        variant={usesUploadDefault ? 'secondary' : 'outline'}
                        onClick={() => setUploadConfig(prev => ({
                          ...prev,
                          nodeInfoList: prev.nodeInfoList.map((x, i) => i === idx ? { ...x, useUploadedMediaAsDefault: !(x.useUploadedMediaAsDefault !== false) } : x)
                        }))}
                      >
                        {usesUploadDefault ? '已使用本次上传URL' : '使用本次上传URL作为默认值'}
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => setUploadConfig(prev => ({ ...prev, nodeInfoList: prev.nodeInfoList.filter((_, i) => i !== idx) }))}><Trash2 className="w-4 h-4 mr-1" />删除</Button>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
        <Dialog open={featureDialogOpen} onOpenChange={setFeatureDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>解析已有功能 JSON 配置到此</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Input
                placeholder="搜索功能名称或 Slug"
                value={featureSearch}
                onChange={(e) => setFeatureSearch(e.target.value)}
              />
              <Select value={selectedFeatureId} onValueChange={setSelectedFeatureId}>
                <SelectTrigger>
                  <SelectValue placeholder={featureListLoading ? "加载中..." : "选择功能"} />
                </SelectTrigger>
                <SelectContent>
                  {filteredFeatureOptions.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name ? `${item.name}${item.slug ? ` (${item.slug})` : ""}` : (item.slug || item.id)}
                    </SelectItem>
                  ))}
                  {filteredFeatureOptions.length === 0 && (
                    <SelectItem value="__empty__" disabled>
                      无匹配功能
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                选择后将覆盖当前 JSON 配置，可再手动调整。
              </p>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setFeatureDialogOpen(false)}>
                取消
              </Button>
              <Button
                onClick={applyFeatureConfig}
                disabled={featureLoading || featureListLoading || !selectedFeatureId}
              >
                {featureLoading ? "解析中..." : "解析并填入"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="搜索标题或作品ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64"
        />

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">全部状态</SelectItem>
            <SelectItem value="draft">草稿</SelectItem>
            <SelectItem value="reviewing">审核中</SelectItem>
            <SelectItem value="published">已发布</SelectItem>
            <SelectItem value="rejected">已驳回</SelectItem>
          </SelectContent>
        </Select>

        <Select value={visibilityFilter} onValueChange={setVisibilityFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="可见性" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">全部可见性</SelectItem>
            <SelectItem value="public">公开</SelectItem>
            <SelectItem value="followers">粉丝可见</SelectItem>
            <SelectItem value="private">私密</SelectItem>
          </SelectContent>
        </Select>

        <Button onClick={applyFilters} disabled={loading}>
          {loading ? "加载中..." : "应用筛选"}
        </Button>
        <Button variant="outline" onClick={() => fetchItems(page)} disabled={loading}>
          刷新
        </Button>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => bulkUpdateStatus("reviewing")} disabled={loading}>设为审核中</Button>
          <Button variant="outline" onClick={() => bulkUpdateStatus("published")} disabled={loading}>批量发布</Button>
          <Button variant="destructive" onClick={() => bulkUpdateStatus("rejected")} disabled={loading}>批量下架</Button>
          <Button variant="outline" onClick={() => bulkUpdateVisibility("private")} disabled={loading}>设为私密</Button>
          <Button variant="outline" onClick={() => bulkUpdateVisibility("public")} disabled={loading}>设为公开</Button>
        </div>
      </div>

      <div className="border rounded-md">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="p-3 text-left w-10">
                <input type="checkbox" checked={selectedIds.length === items.length && items.length > 0} onChange={(e) => toggleSelectAll(e.target.checked)} />
              </th>
              <th className="p-3 text-left">标题</th>
              <th className="p-3 text-left">作者</th>
              <th className="p-3 text-left">分类</th>
              <th className="p-3 text-left">状态</th>
              <th className="p-3 text-left">可见性</th>
              <th className="p-3 text-left">创建时间</th>
              <th className="p-3 text-left">操作</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t">
                <td className="p-3 w-10">
                  <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={(e) => toggleSelect(item.id, e.target.checked)} />
                </td>
                <td className="p-3">
                  <Input
                    value={item.title || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setItems((prev) =>
                        prev.map((x) => (x.id === item.id ? { ...x, title: val } : x))
                      );
                    }}
                  />
                </td>
                <td className="p-3 w-40">
                  <div className="truncate">{item.users?.nickname || "-"}</div>
                </td>
                <td className="p-3 w-48">
                  <Select
                    value={item.category || 'none'}
                    onValueChange={(val) => setItems(prev => prev.map(x => x.id === item.id ? { ...x, category: val === 'none' ? null : val } : x))}
                  >
                    <SelectTrigger><SelectValue placeholder="分类" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">无分类</SelectItem>
                      {(item.type === 'video' ? videoCategories : imageCategories).map((c) => (
                        <SelectItem key={c.slug} value={c.slug}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="p-3 w-40">
                  <Select
                    value={item.status}
                    onValueChange={(val) =>
                      setItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, status: val } : x)))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">草稿</SelectItem>
                      <SelectItem value="reviewing">审核中</SelectItem>
                      <SelectItem value="published">已发布</SelectItem>
                      <SelectItem value="rejected">已驳回</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className="p-3 w-40">
                  <Select
                    value={item.visibility}
                    onValueChange={(val) =>
                      setItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, visibility: val } : x)))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">公开</SelectItem>
                      <SelectItem value="followers">粉丝可见</SelectItem>
                      <SelectItem value="private">私密</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className="p-3 w-40">
                  <div className="truncate">{new Date(item.created_at).toLocaleString()}</div>
                </td>
                <td className="p-3 w-64">
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() =>
                        handleUpdate(item, {
                          title: item.title || "",
                          status: item.status,
                          visibility: item.visibility,
                          category: item.category ?? '',
                        })
                      }
                    >
                      保存
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(item)}>
                      软删除
                    </Button>
                    <Button size="sm" asChild>
                      <Link href={`/admin/works/${item.id}/json-config`}>
                        JSON配置
                      </Link>
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border rounded-md p-4 space-y-3">
        <div className="font-semibold">批量应用 JSON 配置到选中作品</div>
        <Card className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm mb-1 block">API Key</label>
              <Input value={bulkConfig.apiKey} onChange={(e) => setBulkConfig((prev) => ({ ...prev, apiKey: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm mb-1 block">Workflow ID</label>
              <Input value={bulkConfig.workflowId} onChange={(e) => setBulkConfig((prev) => ({ ...prev, workflowId: e.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm mb-1 block">介绍（不参与请求）</label>
              <Input value={bulkConfig.intro || ''} onChange={(e) => setBulkConfig((prev) => ({ ...prev, intro: e.target.value }))} />
            </div>
            <div className="md:col-span-2 flex flex-col gap-1 rounded-md border p-3 bg-muted/30">
              <label className="text-sm font-medium flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={bulkConfig.instanceType === 'plus'}
                  onChange={(e) => setBulkConfig((prev) => ({ ...prev, instanceType: e.target.checked ? 'plus' : undefined }))}
                />
                使用 plus 模式（48G 显存）
              </label>
              <p className="text-xs text-muted-foreground">勾选后批量应用的 JSON 会自动带上 "instanceType": "plus"</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">nodeInfoList</h2>
            <Button onClick={() => setBulkConfig(prev => ({ ...prev, nodeInfoList: [...prev.nodeInfoList, { nodeId: '', fieldName: '', fieldValue: TOKENS.prompt_text, valueSource: 'prompt_text', description: '', defaultValue: '', visible: true, required: true, useUploadedMediaAsDefault: true }] }))}><Plus className="w-4 h-4 mr-1" />新增节点</Button>
          </div>
          <div className="space-y-4">
            {bulkConfig.nodeInfoList.map((n, idx) => {
              const uploadLinked = isUploadLinkedNode(n)
              const usesUploadDefault = n.useUploadedMediaAsDefault !== false
              return (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
                  <div>
                    <label className="text-sm mb-1 block">nodeId</label>
                    <Input value={n.nodeId} onChange={(e) => setBulkConfig(prev => ({ ...prev, nodeInfoList: prev.nodeInfoList.map((x, i) => i === idx ? { ...x, nodeId: e.target.value } : x) }))} />
                  </div>
                  <div>
                    <label className="text-sm mb-1 block">fieldName</label>
                    <Input value={n.fieldName} onChange={(e) => setBulkConfig(prev => ({ ...prev, nodeInfoList: prev.nodeInfoList.map((x, i) => i === idx ? { ...x, fieldName: e.target.value } : x) }))} />
                  </div>
                  <div>
                    <label className="text-sm mb-1 block">说明</label>
                    <Input value={n.description || ''} onChange={(e) => setBulkConfig(prev => ({ ...prev, nodeInfoList: prev.nodeInfoList.map((x, i) => i === idx ? { ...x, description: e.target.value } : x) }))} />
                  </div>
                  <div>
                    <label className="text-sm mb-1 block">值来源</label>
                    <Select value={n.valueSource || 'prompt_text'} onValueChange={(v) => setBulkConfig(prev => ({ ...prev, nodeInfoList: prev.nodeInfoList.map((x, i) => i === idx ? { ...x, valueSource: v as ValueSource, fieldValue: TOKENS[v as ValueSource] } : x) }))}>
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
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm mb-1 block">fieldValue（自定义时填写具体值）</label>
                    <Input value={n.fieldValue} onChange={(e) => setBulkConfig(prev => ({ ...prev, nodeInfoList: prev.nodeInfoList.map((x, i) => i === idx ? { ...x, fieldValue: e.target.value } : x) }))} />
                  </div>
                  <div>
                    <label className="text-sm mb-1 block">默认值</label>
                    <Input value={n.defaultValue || ''} onChange={(e) => setBulkConfig(prev => ({ ...prev, nodeInfoList: prev.nodeInfoList.map((x, i) => i === idx ? { ...x, defaultValue: e.target.value } : x) }))} />
                  </div>
                  <div className="flex flex-wrap items-center gap-3 md:col-span-2">
                    <label className="text-sm flex items-center gap-2">
                      <input type="checkbox" checked={n.visible !== false} onChange={(e) => setBulkConfig(prev => ({ ...prev, nodeInfoList: prev.nodeInfoList.map((x, i) => i === idx ? { ...x, visible: e.target.checked } : x) }))} />
                      可见
                    </label>
                    <label className="text-sm flex items-center gap-2">
                      <input type="checkbox" checked={n.required !== false} onChange={(e) => setBulkConfig(prev => ({ ...prev, nodeInfoList: prev.nodeInfoList.map((x, i) => i === idx ? { ...x, required: e.target.checked } : x) }))} />
                      必填
                    </label>
                    {uploadLinked && (
                      <Button
                        type="button"
                        variant={usesUploadDefault ? 'secondary' : 'outline'}
                        onClick={() => setBulkConfig(prev => ({
                          ...prev,
                          nodeInfoList: prev.nodeInfoList.map((x, i) => i === idx ? { ...x, useUploadedMediaAsDefault: !(x.useUploadedMediaAsDefault !== false) } : x)
                        }))}
                      >
                        {usesUploadDefault ? '已使用本次上传URL' : '使用本次上传URL作为默认值'}
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => setBulkConfig(prev => ({ ...prev, nodeInfoList: prev.nodeInfoList.filter((_, i) => i !== idx) }))}><Trash2 className="w-4 h-4 mr-1" />删除</Button>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleBulkApplyJson} disabled={loading}>应用到已选</Button>
            <span className="text-xs text-muted-foreground">如需让图片/视频节点默认取本次上传 URL，请在对应节点点击“使用本次上传URL”按钮</span>
          </div>
        </Card>
      </div>

      <div className="flex items-center gap-3">
        <span>
          共 {total} 条，页 {page} / {totalPages}
        </span>
        <Button
          variant="outline"
          onClick={() => {
            const next = Math.max(1, page - 1);
            setPage(next);
            fetchItems(next);
          }}
          disabled={page <= 1 || loading}
        >
          上一页
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            const next = Math.min(totalPages, page + 1);
            setPage(next);
            fetchItems(next);
          }}
          disabled={page >= totalPages || loading}
        >
          下一页
        </Button>
      </div>
    </div>
  );
}
