export interface UploadResult {
  path: string
  url: string
}

export async function uploadWorkMediaClient(file: File, options?: {
  userId?: string
  pathPrefix?: string
  bucket?: string
}): Promise<UploadResult> {
  const bucket = options?.bucket ?? 'work-media'
  const userId = options?.userId || 'anonymous'
  const pathPrefix = options?.pathPrefix ?? `users/${userId}`

  const fd = new FormData()
  fd.append('file', file)
  fd.append('bucket', bucket)
  fd.append('pathPrefix', pathPrefix)

  const resp = await fetch('/api/storage/upload', {
    method: 'POST',
    body: fd,
  })
  if (!resp.ok) {
    const msg = await resp.text().catch(() => '上传失败')
    throw new Error(msg)
  }
  const json = await resp.json().catch(() => null)
  if (!json?.success) {
    throw new Error(json?.message || '上传失败')
  }
  return { path: json.data.path, url: json.data.url }
}
