import { createServiceClient } from '@/lib/supabase/server'
import { listCosObjects, buildPublicUrl } from '@/lib/cos'

export interface IngestParams {
  bucket: string
  prefix?: string
}

export interface IngestResult {
  success: boolean
  processed: number
  inserted: number
  skipped: number
  errors: number
  details?: Array<{ path: string; action: 'insert' | 'skip' | 'error'; reason?: string }>
}

function guessTypeByExt(path: string): 'image' | 'video' {
  const lower = path.toLowerCase()
  const imageExts = ['.jpg', '.jpeg', '.png', '.webp', '.gif']
  const videoExts = ['.mp4', '.webm', '.mov', '.m4v', '.avi']
  if (imageExts.some(ext => lower.endsWith(ext))) return 'image'
  if (videoExts.some(ext => lower.endsWith(ext))) return 'video'
  // 默认按图片处理
  return 'image'
}

function guessMimeByExt(path: string): string | null {
  const lower = path.toLowerCase()
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg'
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.webp')) return 'image/webp'
  if (lower.endsWith('.gif')) return 'image/gif'
  if (lower.endsWith('.mp4')) return 'video/mp4'
  if (lower.endsWith('.webm')) return 'video/webm'
  if (lower.endsWith('.mov') || lower.endsWith('.m4v')) return 'video/quicktime'
  if (lower.endsWith('.avi')) return 'video/x-msvideo'
  return null
}

function extractTitleFromPath(path: string): string | null {
  const segments = path.split('/')
  const name = segments[segments.length - 1] || ''
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.substring(0, dot) : name || null
}

function extractUserIdFromPath(path: string): string | null {
  // 尝试匹配 users/<uuid>/... 格式
  const match = path.match(/users\/(\w{8}-\w{4}-\w{4}-\w{4}-\w{12})\//)
  return match?.[1] || null
}

export async function ingestBucketObjects({ bucket, prefix }: IngestParams): Promise<IngestResult> {
  const supabase = createServiceClient()

  const result: IngestResult = {
    success: true,
    processed: 0,
    inserted: 0,
    skipped: 0,
    errors: 0,
    details: []
  }

  // 获取一个默认用户ID（用于无法解析用户的情况）
  let defaultUserId: string | null = null
  {
    const { data: users, error } = await supabase
      .from('users')
      .select('id')
      .limit(1)
    if (!error && users && users.length > 0) {
      defaultUserId = users[0].id
    }
  }

  const cleanPrefix = prefix ? (prefix.endsWith('/') ? prefix : `${prefix}/`) : ''

  // 列出存储对象
  const prefixWithBucket = `${bucket}/${cleanPrefix}`
  let contents: Array<{ Key: string; Size: number }> = []
  try {
    const listed = await listCosObjects(prefixWithBucket, 1000)
    contents = Array.isArray(listed?.Contents) ? listed.Contents.map((c: any) => ({ Key: c.Key, Size: c.Size })) : []
  } catch (err: any) {
    return {
      success: false,
      processed: 0,
      inserted: 0,
      skipped: 0,
      errors: 1,
      details: [{ path: cleanPrefix, action: 'error', reason: err?.message || 'LIST_FAILED' }]
    }
  }

  for (const entry of contents) {
    const objectPath = entry.Key.replace(new RegExp(`^${bucket}/`), '')
    if (!objectPath.startsWith(cleanPrefix)) continue
    result.processed += 1

    const mediaUrl = buildPublicUrl(entry.Key)

    // 是否已存在（按 bucket + object_path）
    const { data: existing, error: selErr } = await supabase
      .from('works')
      .select('id')
      .eq('bucket_id', bucket)
      .eq('object_path', objectPath)
      .limit(1)

    if (selErr) {
      result.errors += 1
      result.details?.push({ path: objectPath, action: 'error', reason: selErr.message })
      continue
    }

    if (existing && existing.length > 0) {
      result.skipped += 1
      result.details?.push({ path: objectPath, action: 'skip' })
      continue
    }

    const type = guessTypeByExt(objectPath)
    const mime = guessMimeByExt(objectPath)
    const title = extractTitleFromPath(objectPath)
    const parsedUserId = extractUserIdFromPath(objectPath)
    const userId = parsedUserId || defaultUserId

    if (!userId) {
      // 无法插入：缺少用户ID
      result.errors += 1
      result.details?.push({ path: objectPath, action: 'error', reason: 'NO_USER_ID_AVAILABLE' })
      continue
    }

    const payload: any = {
      user_id: userId,
      type,
      media_url: mediaUrl,
      thumbnail_url: type === 'image' ? mediaUrl : null,
      title,
      status: 'published',
      visibility: 'public',
      is_ai_generated: false,
      bucket_id: bucket,
      object_path: objectPath,
      mime_type: mime,
      size_bytes: entry.Size ?? null,
    }

    const { error: insErr } = await supabase
      .from('works')
      .insert(payload)

    if (insErr) {
      result.errors += 1
      result.details?.push({ path: objectPath, action: 'error', reason: insErr.message })
      continue
    }

    result.inserted += 1
    result.details?.push({ path: objectPath, action: 'insert' })
  }

  return result
}
