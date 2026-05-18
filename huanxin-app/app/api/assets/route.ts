import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/middleware/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { createTask } from '@/lib/comfyui/runninghub'

const ASSET_WORKFLOW_ID = process.env.RUNNINGHUB_WORKFLOW_ID_ASSET || '1990361383307014145'
const RUNNINGHUB_API_KEY = process.env.RUNNINGHUB_API_KEY || ''
const WEBHOOK_URL = process.env.RUNNINGHUB_WEBHOOK_URL || 'https://new.nat300.top/api/runninghub/webhook'

export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request)
    if ('error' in auth) return Response.json(auth.error, { status: 401 })
    const userId = auth.user.userId

    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get('limit') || '100')

    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('user_assets')
      .select('id, image_url, title, tags, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return Response.json({ success: true, data })
  } catch (e: any) {
    return Response.json({ success: false, message: e.message || '服务器错误' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = requireAuth(request)
    if ('error' in auth) return Response.json(auth.error, { status: 401 })
    const userId = auth.user.userId

    const body = await request.json()
    const image_url: string = body?.image_url
    const title: string | undefined = body?.title
    const tags: string[] | undefined = body?.tags

    if (!image_url) {
      return Response.json({ success: false, message: '缺少 image_url' }, { status: 400 })
    }

    const createRes = await createTask({
      workflowId: ASSET_WORKFLOW_ID,
      apiKey: RUNNINGHUB_API_KEY,
      nodeInfoList: [
        { nodeId: '253', fieldName: 'image', fieldValue: image_url },
      ],
      webhookUrl: WEBHOOK_URL || undefined,
    })
    if (createRes.code !== 0 || !createRes.data?.taskId) {
      return Response.json({ success: false, message: createRes.msg || '创建资产处理任务失败' }, { status: 500 })
    }

    const taskId = createRes.data.taskId
    const supabase = createServiceClient()
    const { data: generation, error: genErr } = await supabase
      .from('ai_generations')
      .insert({
        user_id: userId,
        template_id: null,
        input_type: 'image',
        input_data: { image_url },
        source_urls: [image_url],
        generation_params: { target: 'asset', title, tags },
        prompt: title || null,
        output_type: 'image',
        status: 'processing',
        progress: 0,
        energy_cost: 0,
        started_at: new Date().toISOString(),
        external_task_id: taskId,
      })
      .select('id')
      .single()

    if (genErr) throw genErr
    return Response.json({ success: true, data: { taskId, generationId: generation?.id } })
  } catch (e: any) {
    return Response.json({ success: false, message: e.message || '服务器错误' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = requireAuth(request)
    if ('error' in auth) return Response.json(auth.error, { status: 401 })
    const userId = auth.user.userId

    const url = new URL(request.url)
    const id = url.searchParams.get('id')
    if (!id) return Response.json({ success: false, message: '缺少 id' }, { status: 400 })

    const supabase = createServiceClient()
    const { data: exist } = await supabase
      .from('user_assets')
      .select('id, user_id')
      .eq('id', id)
      .single()

    if (!exist || (exist as any).user_id !== userId) {
      return Response.json({ success: false, message: '无权删除该资产' }, { status: 403 })
    }

    const { error } = await supabase
      .from('user_assets')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) throw error
    return Response.json({ success: true })
  } catch (e: any) {
    return Response.json({ success: false, message: e.message || '服务器错误' }, { status: 500 })
  }
}
