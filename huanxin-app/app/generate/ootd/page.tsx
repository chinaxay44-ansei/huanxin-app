"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { X, Upload } from "lucide-react"

export default function OOTDPage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [parsedItems, setParsedItems] = useState<Array<{ type: string; image: string }>>([])
  const [savedTop, setSavedTop] = useState<string[]>([])
  const [savedBottom, setSavedBottom] = useState<string[]>([])
  const [savedAccessory, setSavedAccessory] = useState<string[]>([])

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null
    setFile(f)
    if (f) setPreviewUrl(URL.createObjectURL(f))
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-background">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <button onClick={() => router.back()}>
            <X className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-bold">新建OOTD</h1>
          <div className="w-6" />
        </div>
      </header>

      <div className="p-4 space-y-4">
        <label className="block cursor-pointer">
          <div className="bg-card rounded-2xl p-8 border-2 border-dashed flex flex-col items-center justify-center min-h-[200px] shadow-sm">
            {previewUrl ? (
              <img src={previewUrl} alt="预览" className="w-full max-h-[260px] object-contain rounded-xl" />
            ) : (
              <>
                <Upload className="w-12 h-12 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">点击上传图片</p>
              </>
            )}
          </div>
          <input type="file" accept="image/*" className="hidden" onChange={onFileChange} />
        </label>

        {/* 功能按钮：存为上装/下装/配饰（无模板选择区） */}
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant="outline"
            disabled={!previewUrl}
            onClick={() => previewUrl && setSavedTop((prev) => [...prev, previewUrl])}
            className="rounded-full"
          >
            存为上装
          </Button>
          <Button
            variant="outline"
            disabled={!previewUrl}
            onClick={() => previewUrl && setSavedBottom((prev) => [...prev, previewUrl])}
            className="rounded-full"
          >
            存为下装
          </Button>
          <Button
            variant="outline"
            disabled={!previewUrl}
            onClick={() => previewUrl && setSavedAccessory((prev) => [...prev, previewUrl])}
            className="rounded-full"
          >
            存为配饰
          </Button>
        </div>

        {/* 保存状态概览 */}
        {(savedTop.length + savedBottom.length + savedAccessory.length) > 0 && (
          <div className="text-xs text-muted-foreground">
            已保存：上装 {savedTop.length} 件 · 下装 {savedBottom.length} 件 · 配饰 {savedAccessory.length} 件
          </div>
        )}

        <Button
          disabled={!previewUrl}
          onClick={() => {
            // 解析穿搭占位逻辑：展示三类单品的占位图
            setParsedItems([
              { type: "上装", image: "/placeholder.jpg" },
              { type: "下装", image: "/placeholder.jpg" },
              { type: "配饰", image: "/placeholder.jpg" },
            ])
          }}
          className="w-full h-14 bg-gradient-to-r from-brand to-brand-secondary text-brand-foreground font-bold rounded-full shadow-lg text-base"
        >
          解析穿搭
        </Button>

        {/* 解析结果展示（占位） */}
        {parsedItems.length > 0 && (
          <div>
            <h3 className="text-sm font-medium mb-2">解析结果</h3>
            <div className="grid grid-cols-3 gap-3">
              {parsedItems.map((it, idx) => (
                <div key={idx} className="rounded-xl overflow-hidden border bg-card shadow-sm">
                  <img src={it.image} alt={it.type} className="w-full h-24 object-cover" />
                  <div className="px-2 py-1 text-xs text-muted-foreground">{it.type}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}