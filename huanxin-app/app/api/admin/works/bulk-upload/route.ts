import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { uploadToCos } from '@/lib/cos'

const TOKEN_TO_SOURCE: Record<string, string> = {
  '__IMAGE_UPLOAD__': 'image_upload',
  '__OUTFIT_IMAGE__': 'outfit_image',
  '__VIDEO_UPLOAD__': 'video_upload',
  '__PROMPT_TEXT__': 'prompt_text',
  '__CUSTOM_VALUE__': 'custom_value',
  '__FILE_UPLOAD__': 'file_upload',
  '__AVATAR_IMAGE__': 'avatar_image',
  '__ASSET_IMAGE__': 'asset_image',
  '__WORK_IMAGE__': 'work_image',
}

function unauthorized(message = 'Unauthorized') {
  return NextResponse.json({ error: message }, { status: 401 })
}

function getExpectedToken() {
  return process.env.NEXT_PUBLIC_ADMIN_API_TOKEN || process.env.ADMIN_API_TOKEN || ''
}

function isAuthorized(req: NextRequest): boolean {
  const expected = getExpectedToken()
  if (!expected) return true
  const headerToken = req.headers.get('x-admin-token') || ''
  return headerToken === expected
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) return unauthorized()
  const supabase = createServiceClient()
  const contentType = req.headers.get('content-type') || ''
  if (!contentType.includes('multipart/form-data')) {
    return NextResponse.json({ error: 'Invalid content type' }, { status: 400 })
  }
  const form = await req.formData()
  const files = form.getAll('files') as File[]
  const userId = String(form.get('userId') || '')
  const category = String(form.get('category') || '')
  const visibility = String(form.get('visibility') || 'public')
  const status = String(form.get('status') || 'published')
  const rawConfig = form.get('jsonConfig') as string | null
  let baseConfig: any = null
  if (rawConfig && rawConfig.trim().length > 0) {
    try { baseConfig = JSON.parse(rawConfig) } catch { return NextResponse.json({ error: 'Invalid jsonConfig' }, { status: 400 }) }
  }
  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
  }
  if (!Array.isArray(files) || files.length === 0) {
    return NextResponse.json({ error: 'No files' }, { status: 400 })
  }
  const results: Array<{ id?: string; url?: string; error?: string; detail?: string }> = []
  // 校验用户是否存在
  try {
    const { data: userRow } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .maybeSingle()
    if (!userRow) {
      return NextResponse.json({ success: false, created: 0, error: 'USER_NOT_FOUND' }, { status: 400 })
    }
  } catch (e: any) {
    return NextResponse.json({ success: false, created: 0, error: 'USER_CHECK_FAILED', detail: String(e?.message || '') }, { status: 500 })
  }
  // 解析分类（支持 slug 或 id），映射到类别ID
  let resolvedCategoryId: string | undefined
  if (category && category !== 'none') {
    try {
      const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(category)
      if (isUuid) {
        const { data: byId } = await supabase
          .from('categories')
          .select('id')
          .eq('id', category)
          .maybeSingle()
        resolvedCategoryId = byId?.id
      }
      if (!resolvedCategoryId) {
        const { data: bySlug } = await supabase
          .from('categories')
          .select('id')
          .eq('slug', category)
          .maybeSingle()
        resolvedCategoryId = bySlug?.id
      }
    } catch {}
  }
  for (const file of files) {
    try {
      const isVideo = (file.type || '').startsWith('video/')
      if (isVideo && file.size > 40 * 1024 * 1024) {
        results.push({ error: 'VIDEO_TOO_LARGE' })
        continue
      }
      const ext = (file.name || '').split('.').pop() || 'bin'
      const folder = isVideo ? 'videos' : 'images'
      const path = `works/${folder}/${userId}_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
      const buffer = Buffer.from(await file.arrayBuffer())
      try {
        const { url } = await uploadToCos({
          bucketPrefix: 'work-media',
          objectPath: path,
          body: buffer,
          contentType: file.type || 'application/octet-stream',
        })
        const mediaUrl = url
      const mediaType: 'image' | 'video' = isVideo ? 'video' : 'image'
      const title = (file.name || '').replace(/\.[^/.]+$/, '')
      const patch: Record<string, any> = {
        user_id: userId,
        title,
        media_url: mediaUrl,
        type: mediaType,
        status,
        visibility,
      }
      if (resolvedCategoryId) (patch as any).category = resolvedCategoryId
      else if (category && category !== 'none') {
        try { (patch as any).category = String(category).slice(0, 50) } catch {}
      }
      // 发布状态时补充发布时间
      if (status === 'published') (patch as any).published_at = new Date().toISOString()
      let nextParams: any = undefined
      if (baseConfig && typeof baseConfig === 'object') {
        const cfg = JSON.parse(JSON.stringify(baseConfig))
        const nodes = Array.isArray(cfg?.nodeInfoList) ? cfg.nodeInfoList : []
        const sources = new Set(['image_upload', 'video_upload', 'file_upload', 'work_image'])
        cfg.nodeInfoList = nodes.map((n: any) => {
          const nn = { ...n }
          let sourceKey = String(nn.valueSource || '')
          if (!sourceKey && typeof nn.fieldValue === 'string') {
            sourceKey = TOKEN_TO_SOURCE[nn.fieldValue] || ''
          }
          const shouldAdopt = sources.has(sourceKey) && nn.useUploadedMediaAsDefault !== false
          if (shouldAdopt) nn.defaultValue = mediaUrl
          return nn
        })
        nextParams = { request_json: cfg }
      }
      if (nextParams) (patch as any).generation_params = nextParams
      const { data: ins, error: insErr } = await supabase.from('works').insert(patch).select('*').single()
      if (insErr) { results.push({ error: 'INSERT_FAILED', detail: String((insErr as any)?.message || '') }); continue }
      results.push({ id: (ins as any)?.id, url: mediaUrl })
      } catch { results.push({ error: 'UPLOAD_FAILED' }) }
    } catch { results.push({ error: 'INTERNAL_ERROR' }) }
  }
  const created = results.filter(r => r.id).length
  return NextResponse.json({ success: true, created, results })
}
