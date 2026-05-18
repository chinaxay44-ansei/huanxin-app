"use client"

import { useEffect, useRef, useState } from "react"
import { UploadCloud, X } from "lucide-react"

type Props = {
  value: File | null
  onChange: (file: File | null) => void
  accept?: string
  label?: string
  aspectClass?: string // e.g. "aspect-[3/4]", default 3:4 竖向
  disabled?: boolean
}

export default function ImageUploadPreview({
  value,
  onChange,
  accept = "image/*",
  label,
  aspectClass = "aspect-[3/4]",
  disabled = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

  useEffect(() => {
    if (value) {
      const url = URL.createObjectURL(value)
      setPreviewUrl(url)
      return () => URL.revokeObjectURL(url)
    } else {
      setPreviewUrl(null)
    }
  }, [value])

  const openFilePicker = () => {
    if (disabled) return
    inputRef.current?.click()
  }

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return
    const file = files[0]
    if (!file.type.startsWith("image/")) return
    onChange(file)
  }

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    if (disabled) return
    e.preventDefault()
    setDragOver(false)
    handleFiles(e.dataTransfer.files)
  }

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (disabled) return
    e.preventDefault()
    setDragOver(true)
  }

  const onDragLeave = () => setDragOver(false)

  const clearFile = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    onChange(null)
  }

  return (
    <div className="space-y-2">
      {label ? <label className="text-sm">{label}</label> : null}
      <div
        role="button"
        tabIndex={0}
        onClick={openFilePicker}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") openFilePicker()
        }}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={`w-full ${aspectClass} rounded-2xl border ${dragOver ? "border-brand" : "border-dashed border-muted-foreground/40"} bg-muted relative overflow-hidden ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
      >
        {/* Hidden input */}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
          disabled={disabled}
        />

        {/* Preview or placeholder */}
        {previewUrl ? (
          <div className="w-full h-full">
            <img src={previewUrl} alt="预览" className="w-full h-full object-cover" />
            {/* top-right clear */}
            <button
              onClick={clearFile}
              className="absolute top-2 right-2 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white"
              aria-label="移除图片"
            >
              <X className="w-4 h-4" />
            </button>
            {/* bottom hint */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-2 text-white text-xs text-center">
              点击更换图片
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <UploadCloud className="w-8 h-8" />
            <div className="text-sm">点击选择或拖拽图片到此</div>
            <div className="text-xs opacity-70">支持 {accept}</div>
          </div>
        )}
      </div>
    </div>
  )
}