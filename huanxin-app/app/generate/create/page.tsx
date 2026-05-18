"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { X, Upload, Clock, Settings } from "lucide-react"
import { useRouter } from "next/navigation"

export default function CreatePage() {
  const router = useRouter()

  const templates = [
    { id: 1, name: "蓝调天使", image: "/blue-angel-ethereal.jpg", badge: "New" },
    { id: 2, name: "蓝调骑士", image: "/blue-knight-fantasy.jpg", badge: "New" },
    { id: 3, name: "超强浮人感pose", image: "/placeholder.svg?height=200&width=150" },
    { id: 4, name: "复古胶片", image: "/placeholder.svg?height=200&width=150" },
    { id: 5, name: "赛博朋克", image: "/placeholder.svg?height=200&width=150" },
    { id: 6, name: "梦幻森林", image: "/placeholder.svg?height=200&width=150" },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-background">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <button onClick={() => router.back()}>
            <X className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-bold">AI视频生成</h1>
          <div className="w-6" />
        </div>
      </header>

      <div className="p-4 space-y-4">
        <div className="bg-card rounded-2xl p-8 border-2 border-dashed flex flex-col items-center justify-center min-h-[200px] shadow-sm">
          <Upload className="w-12 h-12 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">点击上传图片</p>
        </div>

        {/* 已移除“自由输入/对口型”栏，简化为上传+模板选择 */}

        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="rounded-full bg-card shadow-sm hover:bg-accent">
            <Clock className="w-4 h-4 mr-1" />
            5s
          </Button>
          <Button variant="outline" size="sm" className="rounded-full bg-card shadow-sm hover:bg-accent">
            <Settings className="w-4 h-4 mr-1" />
            2.0 模式
          </Button>
        </div>

        <div>
          <h3 className="text-sm font-medium mb-3">模板</h3>
          <div className="grid grid-cols-3 gap-3">
            {templates.map((template) => (
              <div key={template.id} className="cursor-pointer">
                <div className="relative rounded-xl overflow-hidden bg-muted aspect-[3/4] shadow-sm hover:shadow-md transition-shadow">
                  {template.badge && (
                    <span className="absolute top-2 left-2 bg-brand text-brand-foreground text-xs font-bold px-2 py-1 rounded-lg">
                      {template.badge}
                    </span>
                  )}
                  <img
                    src={template.image || "/placeholder.svg"}
                    alt={template.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <p className="text-xs text-center mt-1">{template.name}</p>
              </div>
            ))}
          </div>
        </div>

        <Button className="w-full h-14 bg-gradient-to-r from-brand to-brand-secondary hover:from-brand-secondary hover:to-brand text-brand-foreground font-bold rounded-full shadow-lg hover:shadow-xl transition-all text-base">
          生成视频 <span className="ml-1">20</span>
        </Button>
      </div>
    </div>
  )
}
