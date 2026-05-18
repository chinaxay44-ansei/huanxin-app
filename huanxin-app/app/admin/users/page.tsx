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
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

type UserItem = {
  id: string;
  nickname: string | null;
  avatar_url: string | null;
  status: "active" | "banned" | "deleted" | string;
  is_verified: boolean;
  verified_type: "official" | "creator" | string | null;
  followers_count: number;
  following_count: number;
  created_at: string;
};

export default function AdminUsersPage() {
  const [items, setItems] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("none");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const adminToken = process.env.NEXT_PUBLIC_ADMIN_API_TOKEN ?? "";

  const totalPages = useMemo(() => {
    return total > 0 ? Math.ceil(total / limit) : 1;
  }, [total, limit]);

  async function fetchItems(curPage = page) {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("page", String(curPage));
      params.set("limit", String(limit));
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter && statusFilter !== "none") params.set("status", statusFilter);

      const res = await fetch(`/api/admin/users?${params.toString()}`, {
        headers: adminToken ? { "x-admin-token": adminToken } : undefined,
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "加载用户失败");
      }
      const data = await res.json();
      setItems(data.items || []);
      setSelectedIds([]);
      setTotal(data.total || 0);
      setPage(data.page || 1);
    } catch (e: any) {
      toast.error(e.message || "加载用户失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchItems(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyFilters() {
    setPage(1);
    fetchItems(1);
  }

  async function handleUpdate(item: UserItem, patch: Partial<UserItem>) {
    try {
      const body: Record<string, any> = { id: item.id };
      if (patch.nickname !== undefined) body.nickname = patch.nickname ?? "";
      if (patch.status !== undefined) body.status = patch.status;
      if (patch.is_verified !== undefined) body.is_verified = patch.is_verified;
      if (patch.verified_type !== undefined) body.verified_type = patch.verified_type ?? null;

      const res = await fetch("/api/admin/users", {
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

  async function handleDelete(item: UserItem) {
    try {
      const res = await fetch(`/api/admin/users?id=${item.id}`, {
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
        <h1 className="text-2xl font-semibold">用户管理</h1>
        <p className="text-sm text-muted-foreground mt-1">
          支持搜索昵称、封禁/解封、认证标记与软删除
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="搜索昵称或用户ID..."
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
            <SelectItem value="active">正常</SelectItem>
            <SelectItem value="banned">已封禁</SelectItem>
            <SelectItem value="deleted">已删除</SelectItem>
          </SelectContent>
        </Select>

        <Button onClick={applyFilters} disabled={loading}>
          {loading ? "加载中..." : "应用筛选"}
        </Button>
        <Button variant="outline" onClick={() => fetchItems(page)} disabled={loading}>
          刷新
        </Button>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => bulkUpdateStatus("banned")} disabled={loading}>封禁选中</Button>
          <Button variant="outline" onClick={() => bulkUpdateStatus("active")} disabled={loading}>解封选中</Button>
          <Button variant="destructive" onClick={bulkDelete} disabled={loading}>软删除选中</Button>
          <Button variant="ghost" onClick={exportCSV}>导出CSV</Button>
        </div>
      </div>

      <div className="border rounded-md">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="p-3 text-left w-10">
                <input type="checkbox" checked={selectedIds.length === items.length && items.length > 0} onChange={(e) => toggleSelectAll(e.target.checked)} />
              </th>
              <th className="p-3 text-left">头像</th>
              <th className="p-3 text-left">昵称</th>
              <th className="p-3 text-left">状态</th>
              <th className="p-3 text-left">认证</th>
              <th className="p-3 text-left">粉丝/关注</th>
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
                <td className="p-3 w-20">
                  {item.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.avatar_url} alt={item.nickname || ""} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-muted" />
                  )}
                </td>
                <td className="p-3">
                  <Input
                    value={item.nickname || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, nickname: val } : x)));
                    }}
                  />
                </td>
                <td className="p-3 w-40">
                  <Select
                    value={item.status}
                    onValueChange={(val) => setItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, status: val as UserItem["status"] } : x)))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">正常</SelectItem>
                      <SelectItem value="banned">封禁</SelectItem>
                      <SelectItem value="deleted">删除</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className="p-3 w-64">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={!!item.is_verified}
                        onCheckedChange={(val) =>
                          setItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, is_verified: Boolean(val) } : x)))
                        }
                      />
                      <span className="text-muted-foreground">已认证</span>
                    </div>
                    <Select
                      value={item.verified_type || "none"}
                      onValueChange={(val) => setItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, verified_type: val === "none" ? null : (val as any) } : x)))}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="认证类型" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">无</SelectItem>
                        <SelectItem value="official">官方</SelectItem>
                        <SelectItem value="creator">创作者</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </td>
                <td className="p-3 w-40">
                  {item.followers_count} / {item.following_count}
                </td>
                <td className="p-3 w-40">
                  {new Date(item.created_at).toLocaleString()}
                </td>
                <td className="p-3 w-64">
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() =>
                        handleUpdate(item, {
                          nickname: item.nickname || "",
                          status: item.status,
                          is_verified: item.is_verified,
                          verified_type: item.verified_type || null,
                        })
                      }
                    >
                      保存
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(item)}>
                      软删除
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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

  async function bulkUpdateStatus(nextStatus: UserItem["status"]) {
    if (selectedIds.length === 0) { toast.error("请先选择用户"); return }
    try {
      setLoading(true)
      const headers: Record<string, string> = { "Content-Type": "application/json" }
      if (adminToken) headers["x-admin-token"] = adminToken
      await Promise.all(selectedIds.map(async (id) => {
        const res = await fetch("/api/admin/users", { method: "PUT", headers, body: JSON.stringify({ id, status: nextStatus }) })
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

  async function bulkDelete() {
    if (selectedIds.length === 0) { toast.error("请先选择用户"); return }
    if (!confirm("确定对选中用户执行软删除？")) return
    try {
      setLoading(true)
      const headers: Record<string, string> = {}
      if (adminToken) headers["x-admin-token"] = adminToken
      await Promise.all(selectedIds.map(async (id) => {
        const res = await fetch(`/api/admin/users?id=${id}`, { method: "DELETE", headers })
        if (!res.ok) throw new Error(await res.text())
      }))
      toast.success("批量软删除成功")
      fetchItems(page)
    } catch (e: any) {
      toast.error(e.message || "批量软删除失败")
    } finally {
      setLoading(false)
    }
  }

  function exportCSV() {
    const headers = ["id","nickname","status","is_verified","verified_type","followers","following","created_at"]
    const rows = items.map(i => [i.id, i.nickname ?? "", i.status, String(i.is_verified), i.verified_type ?? "", String(i.followers_count), String(i.following_count), i.created_at])
    const csv = [headers.join(","), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(","))].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = `users_page_${page}.csv`
    a.click()
  }
