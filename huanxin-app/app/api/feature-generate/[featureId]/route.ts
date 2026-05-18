import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/middleware/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { createTask } from '@/lib/comfyui/runninghub'

const WEBHOOK_URL = process.env.RUNNINGHUB_WEBHOOK_URL || 'https://new.nat300.top/api/runninghub/webhook'

interface RouteParams { params: Promise<{ featureId: string }> }

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = requireAuth(request)
    if ('error' in auth) return Response.json(auth.error, { status: 401 })
    const { featureId } = await params

    const body = await request.json()
    const resolvedValues: string[] = body?.resolvedValues || []
    const promptText: string | undefined = body?.promptText
    const instanceType: string | undefined = body?.instanceType
    const usePersonalQueue: boolean | undefined = body?.usePersonalQueue

    const supabase = createServiceClient()
    const { data: feature } = await supabase
      .from('generation_features')
      .select('config')
      .or(`id.eq.${featureId},slug.eq.${featureId}`)
      .maybeSingle()
    const reqJson = (feature as any)?.config || {}
    const nodeConfigs: any[] = Array.isArray(reqJson?.nodeInfoList) ? reqJson.nodeInfoList : []
    const apiKey: string = reqJson?.apiKey || process.env.RUNNINGHUB_API_KEY || ''
    const workflowId: string = reqJson?.workflowId || process.env.RUNNINGHUB_WORKFLOW_ID_TEST || ''
    const webhookUrl: string | undefined = WEBHOOK_URL || undefined
    if (!workflowId) return Response.json({ success: false, message: '未配置 workflowId' }, { status: 400 })

    const TOKENS = {
      IMAGE_UPLOAD: '__IMAGE_UPLOAD__',
      OUTFIT_IMAGE: '__OUTFIT_IMAGE__',
      VIDEO_UPLOAD: '__VIDEO_UPLOAD__',
      PROMPT_TEXT: '__PROMPT_TEXT__',
      CUSTOM_VALUE: '__CUSTOM_VALUE__',
      FILE_UPLOAD: '__FILE_UPLOAD__',
      AVATAR_IMAGE: '__AVATAR_IMAGE__',
      ASSET_IMAGE: '__ASSET_IMAGE__',
      WORK_IMAGE: '__WORK_IMAGE__',
      NUMBER_SELECT: '__NUMBER_SELECT__',
    }
    const asNumber = (v: any) => {
      const n = Number(v)
      return Number.isFinite(n) ? n : null
    }
    const norm = (u: string | undefined) => {
      if (!u) return ''
      if (u.startsWith('/api/media/proxy?u=')) {
        const p = new URL('http://local'+u)
        const raw = p.searchParams.get('u') || ''
        try { return decodeURIComponent(raw) } catch { return raw }
      }
      return u
    }
    const nodeInfoList = nodeConfigs.map((nc, idx) => {
      const raw = String(nc.fieldValue ?? '')
      let fv = raw
      const isToken = [TOKENS.IMAGE_UPLOAD, TOKENS.OUTFIT_IMAGE, TOKENS.VIDEO_UPLOAD, TOKENS.FILE_UPLOAD, TOKENS.AVATAR_IMAGE, TOKENS.ASSET_IMAGE, TOKENS.WORK_IMAGE, TOKENS.NUMBER_SELECT].includes(raw) || raw === TOKENS.PROMPT_TEXT || raw === TOKENS.CUSTOM_VALUE
      if (isToken) {
        const visible = (nc as any)?.visible !== false
        if (raw === TOKENS.PROMPT_TEXT) {
          fv = visible ? (resolvedValues[idx] || '') : ((nc as any)?.defaultValue ?? '')
        } else if (raw === TOKENS.CUSTOM_VALUE) {
          fv = (nc as any)?.defaultValue ?? String((nc as any)?.fieldValue ?? '')
        } else if (raw === TOKENS.NUMBER_SELECT) {
          const picked = asNumber(resolvedValues[idx])
          const fallback = asNumber((nc as any)?.defaultValue)
          fv = visible ? (picked ?? (fallback ?? '')) : (fallback ?? '')
        } else {
          fv = visible ? norm(resolvedValues[idx]) : ((nc as any)?.defaultValue ?? '')
        }
      }
      return { nodeId: String(nc.nodeId), fieldName: String(nc.fieldName), fieldValue: fv }
    })

    const createRes = await createTask({ workflowId, apiKey, nodeInfoList, webhookUrl, instanceType, usePersonalQueue })
    if (createRes.code !== 0 || !createRes.data?.taskId) {
      return Response.json({ success: false, message: createRes.msg || '创建任务失败' }, { status: 500 })
    }

    const taskId = createRes.data.taskId!
    const uniqueTag = `${auth.user.userId}-${taskId}-${Date.now()}`
    const placeholderSvg = encodeURI(
      `<svg xmlns='http://www.w3.org/2000/svg' width='512' height='512'><rect fill='#F3F4F6' width='100%' height='100%'/><text x='50%' y='50%' font-size='28' fill='#111827' text-anchor='middle' dominant-baseline='middle'>作品生成中</text><desc>${uniqueTag}</desc></svg>`
    )
    const placeholderUrl = `data:image/svg+xml;utf8,${placeholderSvg}`

    const request_json = {
      apiKey,
      workflowId,
      intro: reqJson?.intro || '',
      nodeInfoList: nodeConfigs.map((nc, idx) => {
        const raw = String(nc.fieldValue ?? '')
        const visible = (nc as any)?.visible !== false
        let defVal = ''
        if (raw === TOKENS.PROMPT_TEXT) defVal = visible ? (resolvedValues[idx] || '') : ((nc as any)?.defaultValue ?? '')
        else if (raw === TOKENS.CUSTOM_VALUE) defVal = (nc as any)?.defaultValue ?? String((nc as any)?.fieldValue ?? '')
        else if ([TOKENS.IMAGE_UPLOAD, TOKENS.OUTFIT_IMAGE, TOKENS.VIDEO_UPLOAD, TOKENS.FILE_UPLOAD, TOKENS.AVATAR_IMAGE, TOKENS.ASSET_IMAGE, TOKENS.WORK_IMAGE].includes(raw)) defVal = visible ? (resolvedValues[idx] || '') : ((nc as any)?.defaultValue ?? '')
        else if (raw === TOKENS.NUMBER_SELECT) {
          const picked = asNumber(resolvedValues[idx])
          const fallback = asNumber((nc as any)?.defaultValue)
          defVal = visible ? (picked ?? (fallback ?? '')) : (fallback ?? '')
        } else defVal = String(nc.fieldValue ?? '')
        return { nodeId: String(nc.nodeId), fieldName: String(nc.fieldName), fieldValue: raw, description: (nc as any)?.description || '', defaultValue: defVal, visible }
      })
    }

    const { data: insertedWork, error: insErr } = await supabase
      .from('works')
      .insert({
        user_id: auth.user.userId,
        title: '作品生成中',
        description: null,
        media_url: placeholderUrl,
        type: 'image',
        thumbnail_url: placeholderUrl,
        tags: [],
        is_ai_generated: true,
        generation_params: { request_json },
        status: 'pending',
        visibility: 'private',
      })
      .select('id')
      .single()
    if (insErr) return Response.json({ success: false, message: `保存占位作品失败：${insErr.message}` }, { status: 500 })

    const { data: genRecord, error: genErr } = await supabase
      .from('ai_generations')
      .insert({
        user_id: auth.user.userId,
        template_id: featureId,
        input_type: 'image',
        input_data: { resolvedValues, promptText, featureId },
        source_urls: [],
        generation_params: { request_json, target: 'work', work_id: insertedWork.id, prompt: promptText, feature_id: featureId },
        prompt: promptText,
        output_type: 'image',
        status: 'processing',
        progress: 0,
        energy_cost: 0,
        started_at: new Date().toISOString(),
        external_task_id: taskId,
      })
      .select('id')
      .single()
    if (genErr) {
      return Response.json({ success: false, message: `创建生成记录失败：${genErr.message}` }, { status: 500 })
    }

    return Response.json({ success: true, data: { taskId, workId: insertedWork.id, generationId: genRecord.id } })
  } catch (e: any) {
    return Response.json({ success: false, message: e.message || '服务器错误' }, { status: 500 })
  }
}
