"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { PlusIcon, Trash2Icon, SaveIcon, RefreshCwIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"

type TrendingItem = {
  id: number
  keyword: string
  sort_order: number
  is_active: boolean
  search_count?: number
}

const ADMIN_TOKEN = process.env.NEXT_PUBLIC_ADMIN_API_TOKEN

export default function TrendingAdminPage() {
  const [items, setItems] = useState<TrendingItem[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newKeyword, setNewKeyword] = useState("")
  const [newSort, setNewSort] = useState<number>(0)
  const [newActive, setNewActive] = useState(true)

  const headers = useMemo(() => {
    return ADMIN_TOKEN ? { "x-admin-token": ADMIN_TOKEN } : {}
  }, [])

  const load = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/admin/trending-searches", { headers })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "加载失败")
      setItems(json.data || [])
    } catch (e: any) {
      toast.error(e.message || "加载失败")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const createItem = async () => {
    if (!newKeyword.trim()) {
      toast.error("请输入关键词")
      return
    }
    try {
      setCreating(true)
      const res = await fetch("/api/admin/trending-searches", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ keyword: newKeyword.trim(), sort_order: newSort, is_active: newActive }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "新增失败")
      setItems((prev) => [json.data, ...prev])
      setNewKeyword("")
      setNewSort(0)
      setNewActive(true)
      toast.success("新增成功")
    } catch (e: any) {
      toast.error(e.message || "新增失败")
    } finally {
      setCreating(false)
    }
  }

  const updateItem = async (id: number, patch: Partial<TrendingItem>) => {
    try {
      const res = await fetch("/api/admin/trending-searches", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ id, ...patch }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "保存失败")
      setItems((prev) => prev.map((it) => (it.id === id ? json.data : it)))
      toast.success("保存成功")
    } catch (e: any) {
      toast.error(e.message || "保存失败")
    }
  }

  const deleteItem = async (id: number) => {
    if (!confirm("确定删除该关键词？")) return
    try {
      const res = await fetch("/api/admin/trending-searches", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ id }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "删除失败")
      setItems((prev) => prev.filter((it) => it.id !== id))
      toast.success("删除成功")
    } catch (e: any) {
      toast.error(e.message || "删除失败")
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">热门搜索管理</h1>
          <p className="text-xs text-muted-foreground mt-1">维护关键词、排序与启用状态。排序值越大越靠前。</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCwIcon className="size-4" /> 刷新
          </Button>
        </div>
      </div>

      <div className="border rounded-lg p-4 space-y-3">
        <div className="font-medium">新增关键词</div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2 items-center">
          <div className="md:col-span-2">
            <Input placeholder="关键词，如：夏日穿搭" value={newKeyword} onChange={(e) => setNewKeyword(e.target.value)} />
          </div>
          <div>
            <Input type="number" placeholder="排序（默认0）" value={newSort} onChange={(e) => setNewSort(Number(e.target.value))} />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox checked={newActive} onCheckedChange={(v) => setNewActive(Boolean(v))} />
            <span className="text-sm text-muted-foreground">启用</span>
          </div>
          <div>
            <Button onClick={createItem} disabled={creating}>
              <PlusIcon className="size-4" /> 新增
            </Button>
          </div>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="grid grid-cols-12 gap-2 p-3 bg-muted text-xs font-medium">
          <div className="col-span-5">关键词</div>
          <div className="col-span-2">排序</div>
          <div className="col-span-2">启用</div>
          <div className="col-span-2">搜索量</div>
          <div className="col-span-1 text-right">操作</div>
        </div>

        {items.length === 0 && (
          <div className="p-6 text-center text-sm text-muted-foreground">暂无数据</div>
        )}

        {items.map((item) => (
          <div key={item.id} className="grid grid-cols-12 gap-2 p-3 border-t items-center">
            <div className="col-span-5">
              <Input
                value={item.keyword}
                onChange={(e) => setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, keyword: e.target.value } : it)))}
              />
            </div>
            <div className="col-span-2">
              <Input
                type="number"
                value={item.sort_order}
                onChange={(e) => setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, sort_order: Number(e.target.value) } : it)))}
              />
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <Checkbox
                checked={item.is_active}
                onCheckedChange={(v) => setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, is_active: Boolean(v) } : it)))}
              />
              <span className="text-sm text-muted-foreground">启用</span>
            </div>
            <div className="col-span-2 text-sm text-muted-foreground">{item.search_count ?? 0}</div>
            <div className="col-span-1 flex justify-end gap-2">
              <Button variant="outline" size="icon-sm" onClick={() => updateItem(item.id, { keyword: item.keyword.trim(), sort_order: item.sort_order, is_active: item.is_active })}>
                <SaveIcon className="size-4" />
              </Button>
              <Button variant="destructive" size="icon-sm" onClick={() => deleteItem(item.id)}>
                <Trash2Icon className="size-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}