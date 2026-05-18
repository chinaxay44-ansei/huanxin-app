import { NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/middleware/auth'
import { createTask } from '@/lib/comfyui/runninghub'

// 工作流ID（用户提供）可从环境变量读取，未配置时回落到用户提供的默认ID
const AVATAR_WORKFLOW_ID = process.env.RUNNINGHUB_WORKFLOW_ID_AVATAR || '2004080078793416705'
const RUNNINGHUB_API_KEY = process.env.RUNNINGHUB_API_KEY || ''
const WEBHOOK_URL = process.env.RUNNINGHUB_WEBHOOK_URL || 'https://new.nat300.top/api/runninghub/webhook'

export async function GET(request: NextRequest) {
  try {
    const authResult = requireAuth(request)
    if ('error' in authResult) {
      return Response.json(authResult.error, { status: 401 })
    }
    const userId = authResult.user.userId

    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get('limit') || '20')

    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('ai_avatars')
      .select('id, name, avatar_url')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return Response.json({ success: true, data })
  } catch (e: any) {
    console.error('GET /api/ai/avatars error', e)
    return Response.json({ success: false, message: e.message || '服务器错误' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = requireAuth(request)
    if ('error' in authResult) {
      return Response.json(authResult.error, { status: 401 })
    }
    const userId = authResult.user.userId

    const body = await request.json()
    const name: string = body?.name?.trim()
    let avatar_url: string | undefined = body?.avatar_url || body?.front_face_url

    if (!name) {
      return Response.json({ success: false, message: '缺少形象名称 name' }, { status: 400 })
    }
    if (!avatar_url) {
      return Response.json({ success: false, message: '缺少头像图片 avatar_url 或 front_face_url' }, { status: 400 })
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
    avatar_url = norm(avatar_url)
    if (!avatar_url || !(avatar_url.startsWith('http://') || avatar_url.startsWith('https://'))) {
      return Response.json({ success: false, message: '图片URL不可用' }, { status: 400 })
    }
    try {
      const head = await fetch(avatar_url, { method: 'HEAD' })
      if (!head.ok) return Response.json({ success: false, message: '图片URL无法访问' }, { status: 400 })
    } catch {
      return Response.json({ success: false, message: '图片URL无法访问' }, { status: 400 })
    }

    // 1) 调用 RunningHub 创建任务（设置工作流参数：将上传后的图片URL注入到 nodeId=28 的 image 字段）
    const createRes = await createTask({
      workflowId: AVATAR_WORKFLOW_ID,
      apiKey: RUNNINGHUB_API_KEY,
      nodeInfoList: [
        {
          nodeId: '304',
          fieldName: 'image',
          fieldValue: avatar_url,
        },
      ],
      webhookUrl: WEBHOOK_URL || undefined,
    })

    if (createRes.code !== 0 || !createRes.data?.taskId) {
      return Response.json({ success: false, message: createRes.msg || '创建处理任务失败' }, { status: 500 })
    }

    const taskId = createRes.data.taskId
    const supabase = createServiceClient()
    const { data: generation, error: genErr } = await supabase
      .from('ai_generations')
      .insert({
        user_id: userId,
        template_id: null,
        input_type: 'image',
        input_data: { avatar_url },
        source_urls: [avatar_url],
        generation_params: { target: 'avatar', name },
        prompt: name,
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
    console.error('POST /api/ai/avatars error', e)
    return Response.json({ success: false, message: e.message || '服务器错误' }, { status: 500 })
  }
}

// 删除指定形象（仅限本人），同时删除该形象下的所有穿搭
export async function DELETE(request: NextRequest) {
  try {
    const authResult = requireAuth(request)
    if ('error' in authResult) {
      return Response.json(authResult.error, { status: 401 })
    }
    const userId = authResult.user.userId

    const url = new URL(request.url)
    const id = url.searchParams.get('id')

    if (!id) {
      return Response.json({ success: false, message: '缺少参数 id' }, { status: 400 })
    }

    const supabase = createServiceClient()
    // 验证形象归属
    const { data: avatar, error: getErr } = await supabase
      .from('ai_avatars')
      .select('id, user_id')
      .eq('id', id)
      .single()

    if (getErr) throw getErr
    if (!avatar || avatar.user_id !== userId) {
      return Response.json({ success: false, message: '无权删除该形象' }, { status: 403 })
    }

    // 先删除该形象下的所有穿搭
    const { error: delOutfitsErr } = await supabase
      .from('avatar_outfits')
      .delete()
      .eq('avatar_id', id)
      .eq('user_id', userId)

    if (delOutfitsErr) throw delOutfitsErr

    // 再删除形象记录
    const { error: delAvatarErr } = await supabase
      .from('ai_avatars')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (delAvatarErr) throw delAvatarErr

    return Response.json({ success: true })
  } catch (e: any) {
    console.error('DELETE /api/ai/avatars error', e)
    return Response.json({ success: false, message: e.message || '服务器错误' }, { status: 500 })
  }
}
