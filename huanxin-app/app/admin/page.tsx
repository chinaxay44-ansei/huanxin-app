import Link from "next/link"

export default function AdminHomePage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">管理后台概览</h1>
      <p className="text-sm text-muted-foreground mt-2">在这里进行内容上新与管理，类似抖音的后台。</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        <Link href="/admin/trending" className="border rounded p-4 hover:bg-muted">
          <div className="font-medium">热门搜索管理</div>
          <div className="text-xs text-muted-foreground mt-1">维护关键词、排序与启用状态。</div>
        </Link>
        <Link href="/admin/fun-series" className="border rounded p-4 hover:bg-muted">
          <div className="font-medium">趣味玩法专题管理</div>
          <div className="text-xs text-muted-foreground mt-1">配置专题与作品映射，上架首页专区。</div>
        </Link>
        <Link href="/admin/works" className="border rounded p-4 hover:bg-muted">
          <div className="font-medium">作品管理</div>
          <div className="text-xs text-muted-foreground mt-1">上新作品、编辑与下架（待完善）。</div>
        </Link>
        <Link href="/admin/generation-features" className="border rounded p-4 hover:bg-muted">
          <div className="font-medium">生成页管理</div>
          <div className="text-xs text-muted-foreground mt-1">功能增删改、排序与JSON配置（驱动前端生成入口）。</div>
        </Link>
        <Link href="/admin/categories" className="border rounded p-4 hover:bg-muted">
          <div className="font-medium">分类管理</div>
          <div className="text-xs text-muted-foreground mt-1">配置作品分类（待完善）。</div>
        </Link>
        <Link href="/admin/users" className="border rounded p-4 hover:bg-muted">
          <div className="font-medium">用户管理</div>
          <div className="text-xs text-muted-foreground mt-1">审核创作者与封禁（待完善）。</div>
        </Link>
        <Link href="/admin/reports" className="border rounded p-4 hover:bg-muted">
          <div className="font-medium">举报管理</div>
          <div className="text-xs text-muted-foreground mt-1">处理内容举报（待完善）。</div>
        </Link>
        <Link href="/admin/announcements" className="border rounded p-4 hover:bg-muted">
          <div className="font-medium">公告管理</div>
          <div className="text-xs text-muted-foreground mt-1">以“焕星官方”向所有好友广播消息。</div>
        </Link>
      </div>
    </div>
  )
}
