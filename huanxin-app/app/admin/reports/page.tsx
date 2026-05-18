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
import { toast } from "sonner";

type ReportItem = {
  id: string;
  reporter_id: string;
  target_type: string;
  target_id: string;
  reason: string | null;
  description: string | null;
  evidence_urls: string[] | null;
  status: "pending" | "reviewing" | "handled" | "rejected" | string;
  handle_result: string | null;
  created_at: string;
  handled_at?: string | null;
};

export default function AdminReportsPage() {
  const [items, setItems] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("pending");

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
      params.set("status", statusFilter || "pending");
      if (search.trim()) params.set("search", search.trim());

      const res = await fetch(`/api/admin/reports?${params.toString()}`, {
        headers: adminToken ? { "x-admin-token": adminToken } : undefined,
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "加载举报失败");
      }
      const data = await res.json();
      setItems(data.items || []);
      setTotal(data.total || 0);
      setPage(data.page || 1);
    } catch (e: any) {
      toast.error(e.message || "加载举报失败");
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

  async function updateStatus(item: ReportItem, nextStatus: ReportItem["status"], handleResult?: string | null) {
    try {
      const res = await fetch("/api/admin/reports", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(adminToken ? { "x-admin-token": adminToken } : {}),
        },
        body: JSON.stringify({ id: item.id, status: nextStatus, handle_result: handleResult ?? item.handle_result ?? null }),
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "更新状态失败");
      }
      toast.success("已更新状态");
      fetchItems(page);
    } catch (e: any) {
      toast.error(e.message || "更新状态失败");
    }
  }

  async function saveHandleResult(item: ReportItem) {
    await updateStatus(item, item.status, item.handle_result || null);
  }

  async function oneClickBanUser(item: ReportItem) {
    if (item.target_type !== "user") {
      toast.error("对象类型不是用户");
      return;
    }
    if (!confirm(`确认封禁用户 ${item.target_id} ？`)) return;
    try {
      setLoading(true);
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (adminToken) headers["x-admin-token"] = adminToken;
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers,
        body: JSON.stringify({ id: item.target_id, status: "banned" }),
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "封禁失败");
      }
      toast.success("已封禁用户");
      await updateStatus(item, "handled", `因举报已封禁用户 ${item.target_id}`);
    } catch (e: any) {
      toast.error(e.message || "封禁失败");
    } finally {
      setLoading(false);
    }
  }

  async function oneClickTakeDownWork(item: ReportItem) {
    if (item.target_type !== "work") {
      toast.error("对象类型不是作品");
      return;
    }
    if (!confirm(`确认下架作品 ${item.target_id} ？`)) return;
    try {
      setLoading(true);
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (adminToken) headers["x-admin-token"] = adminToken;
      const res = await fetch("/api/admin/works", {
        method: "PUT",
        headers,
        body: JSON.stringify({ id: item.target_id, status: "rejected" }),
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "下架失败");
      }
      toast.success("已下架作品");
      await updateStatus(item, "handled", `因举报已下架作品 ${item.target_id}`);
    } catch (e: any) {
      toast.error(e.message || "下架失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">举报管理</h1>
        <p className="text-sm text-muted-foreground mt-1">处理用户举报：审核、标记处理或驳回</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="搜索原因/描述..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64"
        />

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">待处理</SelectItem>
            <SelectItem value="reviewing">审核中</SelectItem>
            <SelectItem value="handled">已处理</SelectItem>
            <SelectItem value="rejected">已驳回</SelectItem>
          </SelectContent>
        </Select>

        <Button onClick={applyFilters} disabled={loading}>
          {loading ? "加载中..." : "应用筛选"}
        </Button>
        <Button variant="outline" onClick={() => fetchItems(page)} disabled={loading}>
          刷新
        </Button>
      </div>

      <div className="border rounded-md">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="p-3 text-left">对象</th>
              <th className="p-3 text-left">原因</th>
              <th className="p-3 text-left">描述</th>
              <th className="p-3 text-left">证据</th>
              <th className="p-3 text-left">处理结果</th>
              <th className="p-3 text-left">状态</th>
              <th className="p-3 text-left">创建时间</th>
              <th className="p-3 text-left">操作</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t">
                <td className="p-3 w-64">
                  <div className="truncate text-muted-foreground">
                    {item.target_type} / {item.target_id}
                  </div>
                  <div className="truncate">举报人: {item.reporter_id}</div>
                </td>
                <td className="p-3 w-48">
                  <div className="truncate">{item.reason || "-"}</div>
                </td>
                <td className="p-3">
                  <div className="max-w-[28rem] whitespace-pre-wrap break-words">
                    {item.description || "-"}
                  </div>
                </td>
                <td className="p-3 w-32">
                  <div>{item.evidence_urls?.length || 0} 条</div>
                </td>
                <td className="p-3 w-64">
                  <Input
                    placeholder="填写处理结果..."
                    value={item.handle_result || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, handle_result: val } : x)));
                    }}
                  />
                </td>
                <td className="p-3 w-36">
                  <Select
                    value={item.status}
                    onValueChange={(val) => setItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, status: val as ReportItem["status"] } : x)))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">待处理</SelectItem>
                      <SelectItem value="reviewing">审核中</SelectItem>
                      <SelectItem value="handled">已处理</SelectItem>
                      <SelectItem value="rejected">已驳回</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className="p-3 w-40">
                  {new Date(item.created_at).toLocaleString()}
                </td>
                <td className="p-3 w-72">
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => saveHandleResult(item)}>
                      保存处理结果
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => updateStatus(item, "reviewing")}>设为审核中</Button>
                    <Button size="sm" variant="outline" onClick={() => updateStatus(item, "handled")}>标记已处理</Button>
                    <Button size="sm" variant="destructive" onClick={() => updateStatus(item, "rejected")}>驳回</Button>
                    {item.target_type === "user" && (
                      <Button size="sm" variant="destructive" disabled={loading} onClick={() => oneClickBanUser(item)}>
                        一键封禁用户
                      </Button>
                    )}
                    {item.target_type === "work" && (
                      <Button size="sm" variant="destructive" disabled={loading} onClick={() => oneClickTakeDownWork(item)}>
                        一键下架作品
                      </Button>
                    )}
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