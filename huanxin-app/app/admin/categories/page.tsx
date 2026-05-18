"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"

type Category = {
  id: string
  name: string
  slug: string
  type: string
  parent_id: string | null
  icon_url: string | null
  cover_url: string | null
  description: string | null
  sort_order: number | null
  is_active: boolean | null
}

export default function CategoriesAdminPage() {
  const [list, setList] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState<Partial<Category>>({
    name: "",
    slug: "",
    type: "image",
    parent_id: null,
    sort_order: 0,
    is_active: true,
    icon_url: "",
    cover_url: "",
    description: "",
  })

  async function fetchList() {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/categories")
      const json = await res.json()
      if (res.ok) {
        setList(json.data || [])
      } else {
        toast.error(json.error || "加载分类失败")
      }
    } catch (e: any) {
      toast.error(e?.message || "加载失败")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchList()
  }, [])

  const parents = useMemo(() => list.filter((c) => !c.parent_id), [list])

  async function createCategory() {
    const body = {
      name: form.name?.trim(),
      slug: form.slug?.trim(),
      type: form.type?.trim() || "image",
      parent_id: form.parent_id || null,
      sort_order: Number(form.sort_order) || 0,
      is_active: !!form.is_active,
      icon_url: form.icon_url?.trim() || null,
      cover_url: form.cover_url?.trim() || null,
      description: form.description?.trim() || null,
    }
    if (!body.name || !body.slug || !body.type) {
      toast.error("请填写名称、Slug 和类型")
      return
    }
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "创建失败")
      toast.success("创建成功")
      setForm({ name: "", slug: "", type: "image", parent_id: null, sort_order: 0, is_active: true, icon_url: "", cover_url: "", description: "" })
      fetchList()
    } catch (e: any) {
      toast.error(e?.message || "创建失败")
    }
  }

  async function updateCategory(id: string, patch: Partial<Category>) {
    try {
      const res = await fetch("/api/admin/categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...patch }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "更新失败")
      toast.success("更新成功")
      setList((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } as Category : c)))
    } catch (e: any) {
      toast.error(e?.message || "更新失败")
    }
  }

  async function deleteCategory(id: string) {
    if (!confirm("确定要删除该分类吗？")) return
    try {
      const res = await fetch("/api/admin/categories", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "删除失败")
      toast.success("删除成功")
      setList((prev) => prev.filter((c) => c.id !== id))
    } catch (e: any) {
      toast.error(e?.message || "删除失败")
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">分类管理</h1>
        <p className="text-muted-foreground mt-1">新增、编辑、排序、启用/停用分类。</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">新增分类</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input placeholder="名称" value={form.name ?? ""} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            <Input placeholder="Slug" value={form.slug ?? ""} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} />

            <Select value={(form.type ?? "image") as string} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
              <SelectTrigger className="w-full"><SelectValue placeholder="类型" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="image">图片分类</SelectItem>
                <SelectItem value="video">视频分类</SelectItem>
              </SelectContent>
            </Select>
            <Input type="number" placeholder="排序（越小越靠前）" value={String(form.sort_order ?? 0)} onChange={(e) => setForm((f) => ({ ...f, sort_order: Number(e.target.value) }))} />

            

            <div className="col-span-1 md:col-span-2">
              <Input placeholder="描述（可选）" value={form.description ?? ""} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox checked={!!form.is_active} onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: !!v }))} />
              <span>启用</span>
            </div>

            <div>
              <Select value={(form.parent_id ?? "none") as string} onValueChange={(v) => setForm((f) => ({ ...f, parent_id: v === "none" ? null : v }))}>
                <SelectTrigger className="w-full"><SelectValue placeholder="父级分类（可选）" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">无</SelectItem>
                  {parents.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-3">
            <Button onClick={createCategory}>创建</Button>
            <Button variant="secondary" onClick={() => setForm({ name: "", slug: "", type: "image", parent_id: null, sort_order: 0, is_active: true, icon_url: "", cover_url: "", description: "" })}>重置</Button>
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold">分类列表</h2>
          {loading ? (
            <div>加载中...</div>
          ) : (
            <div className="space-y-4">
              {list.map((c) => (
                <div key={c.id} className="border rounded-lg p-3 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input defaultValue={c.name} onChange={(e) => (c.name = e.target.value)} placeholder="名称" />
                    <Input defaultValue={c.slug} onChange={(e) => (c.slug = e.target.value)} placeholder="Slug" />

                    <Select defaultValue={["image","video"].includes(c.type) ? c.type : "image"} onValueChange={(v) => (c.type = v)}>
                      <SelectTrigger className="w-full"><SelectValue placeholder="类型" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="image">图片分类</SelectItem>
                        <SelectItem value="video">视频分类</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input type="number" defaultValue={String(c.sort_order ?? 0)} onChange={(e) => (c.sort_order = Number(e.target.value))} placeholder="排序" />

                    

                    <div className="col-span-1 md:col-span-2">
                      <Input defaultValue={c.description ?? ""} onChange={(e) => (c.description = e.target.value)} placeholder="描述" />
                    </div>

                    <div>
                      <Select defaultValue={(c.parent_id ?? "none") as string} onValueChange={(v) => (c.parent_id = v === "none" ? null : v)}>
                        <SelectTrigger className="w-full"><SelectValue placeholder="父级分类（可选）" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">无</SelectItem>
                          {parents.map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center gap-2">
                      <Checkbox defaultChecked={!!c.is_active} onCheckedChange={(v) => (c.is_active = !!v)} />
                      <span>启用</span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button onClick={() => updateCategory(c.id, {
                      name: c.name,
                      slug: c.slug,
                      type: ["image","video"].includes(c.type) ? c.type : "image",
                      parent_id: c.parent_id,
                      sort_order: Number(c.sort_order) || 0,
                      icon_url: null,
                      cover_url: null,
                      description: c.description || null,
                      is_active: !!c.is_active,
                    })}>保存</Button>
                    <Button variant="destructive" onClick={() => deleteCategory(c.id)}>删除</Button>
                  </div>
                </div>
              ))}
              {list.length === 0 && <div className="text-muted-foreground">暂无数据</div>}
            </div>
          )}
        </div>
      </div>
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">类型迁移</h2>
        <p className="text-sm text-muted-foreground">将历史类型（general/content）批量统一到新类型。</p>
        <div className="flex items-center gap-3">
          <Select defaultValue="image" onValueChange={async (v) => {
            try {
              const res = await fetch("/api/admin/categories/migrate-types", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ to_type: v })
              })
              const json = await res.json()
              if (!res.ok) throw new Error(json.error || "迁移失败")
              toast.success(`迁移成功，更新 ${json.updated} 条`)
              fetchList()
            } catch (e: any) {
              toast.error(e?.message || "迁移失败")
            }
          }}>
            <SelectTrigger className="w-40"><SelectValue placeholder="目标类型" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="image">迁移为 Image</SelectItem>
              <SelectItem value="video">迁移为 Video</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={async () => {
            try {
              const res = await fetch("/api/admin/categories/migrate-types", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ to_type: "image" })
              })
              const json = await res.json()
              if (!res.ok) throw new Error(json.error || "迁移失败")
              toast.success(`迁移成功，更新 ${json.updated} 条`)
              fetchList()
            } catch (e: any) {
              toast.error(e?.message || "迁移失败")
            }
          }}>一键迁移为 Image</Button>
        </div>
      </div>
    </div>
  )
}