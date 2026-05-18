import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

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

function isAuthorized(_req: NextRequest): boolean { return true }

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) return unauthorized()
  const supabase = createServiceClient()
  const body = await req.json()
  const workIds: string[] = Array.isArray(body?.workIds) ? body.workIds : []
  const config = body?.config
  if (!config || typeof config !== 'object') {
    return NextResponse.json({ error: 'Invalid config' }, { status: 400 })
  }
  if (!workIds || workIds.length === 0) {
    return NextResponse.json({ error: 'No workIds' }, { status: 400 })
  }
  const sources = new Set(['image_upload', 'video_upload', 'file_upload', 'work_image'])
  const results: Array<{ id: string; success: boolean }> = []
  for (const wid of workIds) {
    try {
      const { data: w } = await supabase.from('works').select('id, media_url').eq('id', wid).single()
      if (!w) { results.push({ id: wid, success: false }); continue }
      const mediaUrl = (w as any).media_url as string
      const cfg = JSON.parse(JSON.stringify(config))
      const nodes = Array.isArray(cfg?.nodeInfoList) ? cfg.nodeInfoList : []
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
      const { data: row } = await supabase.from('works').select('generation_params').eq('id', wid).single()
      const nextParams = { ...(row as any)?.generation_params, request_json: cfg }
      const { error: updErr } = await supabase
        .from('works')
        .update({ generation_params: nextParams, updated_at: new Date().toISOString() })
        .eq('id', wid)
      if (updErr) { results.push({ id: wid, success: false }); continue }
      results.push({ id: wid, success: true })
    } catch {
      results.push({ id: wid, success: false })
    }
  }
  const ok = results.filter(r => r.success).length
  return NextResponse.json({ success: true, updated: ok, results })
}