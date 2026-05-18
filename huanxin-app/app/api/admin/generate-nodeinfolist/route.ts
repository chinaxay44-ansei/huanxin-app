import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

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

type ValueSource = 'image_upload' | 'outfit_image' | 'video_upload' | 'prompt_text' | 'custom_value' | 'file_upload'

function randomNodeConfigs(): Array<{ nodeId: string; fieldName: string; fieldValue: string; valueSource: ValueSource }> {
  const TOKENS = {
    image_upload: '__IMAGE_UPLOAD__',
    outfit_image: '__OUTFIT_IMAGE__',
    video_upload: '__VIDEO_UPLOAD__',
    prompt_text: '__PROMPT_TEXT__',
    custom_value: '__CUSTOM_VALUE__',
    file_upload: '__FILE_UPLOAD__',
  }
  const candidates: Array<{ nodeId: string; fieldName: string; valueSource: ValueSource; fieldValue?: string; description: string }> = [
    { nodeId: '6', fieldName: 'image', valueSource: 'image_upload', description: '上传图片作为输入图' },
    { nodeId: '71', fieldName: 'seed', valueSource: 'custom_value', fieldValue: String(Math.floor(Math.random() * 1000000)), description: '随机种子（无需用户输入）' },
    { nodeId: '34', fieldName: 'mp3', valueSource: 'file_upload', description: '上传文件作为音频输入' },
    { nodeId: '23', fieldName: 'video', valueSource: 'video_upload', description: '上传视频作为输入视频' },
    { nodeId: '8', fieldName: 'text', valueSource: 'prompt_text', description: '输入提示词文本' },
  ]
  const count = 3 + Math.floor(Math.random() * 3)
  const chosen: Array<{ nodeId: string; fieldName: string; fieldValue: string; valueSource: ValueSource; description: string }> = []
  const pool = [...candidates]
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length)
    const picked = pool.splice(idx, 1)[0]
    const fv = picked.fieldValue ?? TOKENS[picked.valueSource]
    chosen.push({ nodeId: picked.nodeId, fieldName: picked.fieldName, fieldValue: fv, valueSource: picked.valueSource, description: picked.description })
  }
  return chosen
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) return unauthorized()
  const supabase = createServiceClient()
  const { searchParams } = new URL(req.url)
  const limit = Math.min(Number(searchParams.get('limit') || 50), 200)

  const { data: works, error } = await supabase
    .from('works')
    .select('id, generation_params')
    .limit(limit)
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let updated = 0
  for (const w of works || []) {
    const gp = (w as any)?.generation_params || {}
    const req = gp.request_json || {}
    const hasList = Array.isArray(req.nodeInfoList) && req.nodeInfoList.length > 0
    if (hasList) continue
    const nodeConfigs = randomNodeConfigs()
    const nextReq = {
      apiKey: (req.apiKey as string) || process.env.RUNNINGHUB_API_KEY || '',
      workflowId: (req.workflowId as string) || (process.env.RUNNINGHUB_WORKFLOW_ID_TEST || ''),
      nodeInfoList: nodeConfigs,
    }
    const nextParams = { ...gp, request_json: nextReq }
    const { error: updErr } = await supabase
      .from('works')
      .update({ generation_params: nextParams, updated_at: new Date().toISOString() })
      .eq('id', w.id)
    if (!updErr) updated += 1
  }

  return NextResponse.json({ success: true, updated })
}
