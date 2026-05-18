"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { X, Upload } from "lucide-react"

export default function OneClickPage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null)

  const templates = [
    { id: 1, name: "蓝调天使", image: "/blue-angel-ethereal.jpg" },
    { id: 2, name: "蓝调骑士", image: "/blue-knight-fantasy.jpg" },
    { id: 3, name: "复古胶片", image: "/vintage-polaroid-photo.jpg" },
    { id: 4, name: "赛博朋克", image: "/cyberpunk-portrait-neon.jpg" },
    { id: 5, name: "梦幻森林", image: "/fantasy-portrait-magic.jpg" },
    { id: 6, name: "卡通头像", image: "/emoji-avatar-character.jpg" },
  ]

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
          <h1 className="text-lg font-bold">一键出片</h1>
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

        <div>
          <h3 className="text-sm font-medium mb-3">模板</h3>
          <div className="grid grid-cols-3 gap-3">
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedTemplate(t.id)}
                className={`relative rounded-xl overflow-hidden bg-muted aspect-[3/4] shadow-sm hover:shadow-md transition-shadow ${selectedTemplate === t.id ? "ring-2 ring-brand" : ""}`}
              >
                <img src={t.image} alt={t.name} className="w-full h-full object-cover" />
                <span className="absolute bottom-1 left-1 text-[11px] bg-black/50 text-white px-1.5 py-0.5 rounded">{t.name}</span>
              </button>
            ))}
          </div>
        </div>

        <Button className="w-full h-14 font-bold rounded-full text-base">
          开始生成
        </Button>
      </div>
    </div>
  )
}