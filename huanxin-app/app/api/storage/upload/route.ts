import { NextResponse } from 'next/server'
import { uploadToCos } from '@/lib/cos'

export async function POST(req: Request) {
  try {
    const form = await req.formData()

  const file = form.get('file') as File | null
  const bucket = (form.get('bucket') as string) || 'work-media'
  const pathPrefix = (form.get('pathPrefix') as string) || 'uploads'

  if (!file) {
    return NextResponse.json({ success: false, message: '缺少文件' }, { status: 400 })
  }

  if ((file.type || '').startsWith('video/')) {
    const maxBytes = 40 * 1024 * 1024
    if (file.size > maxBytes) {
      return NextResponse.json({ success: false, message: '视频大小需不超过40MB' }, { status: 400 })
    }
  }

    const nameExt = file.name.includes('.') ? file.name.split('.').pop() : undefined
    const typeExt = (() => {
      switch (file.type) {
        case 'image/jpeg': return 'jpg'
        case 'image/png': return 'png'
        case 'image/webp': return 'webp'
        case 'image/gif': return 'gif'
        case 'video/mp4': return 'mp4'
        case 'video/webm': return 'webm'
        case 'video/quicktime': return 'mov'
        default: return 'bin'
      }
    })()
    const fileExt = nameExt || typeExt
    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`
    const cleanPrefix = pathPrefix.endsWith('/') ? pathPrefix.slice(0, -1) : pathPrefix
    const objectPath = `${cleanPrefix}/${safeName}`

    const buffer = Buffer.from(await file.arrayBuffer())
    const { url } = await uploadToCos({
      bucketPrefix: bucket,
      objectPath,
      body: buffer,
      contentType: file.type || 'application/octet-stream',
    })

    return NextResponse.json({ success: true, data: { path: objectPath, url } })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e?.message || '服务器上传失败' }, { status: 500 })
  }
}
