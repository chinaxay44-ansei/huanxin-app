import { NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/middleware/auth'
import { createTask } from '@/lib/comfyui/runninghub'

// RunningHub 工作流ID（新建穿搭）：用户提供的ID
const OUTFIT_WORKFLOW_ID = process.env.RUNNINGHUB_WORKFLOW_ID_OUTFIT || '1998293598359683074'
// RunningHub API 密钥（建议配置到环境变量）
const RUNNINGHUB_API_KEY = process.env.RUNNINGHUB_API_KEY || ''
const WEBHOOK_URL = process.env.RUNNINGHUB_WEBHOOK_URL || 'https://new.nat300.top/api/runninghub/webhook'

// 获取指定形象的穿搭列表
export async function GET(request: NextRequest) {
  try {
    const authResult = requireAuth(request)
    if ('error' in authResult) {
      return Response.json(authResult.error, { status: 401 })
    }
    const userId = authResult.user.userId

    const url = new URL(request.url)
    const avatarId = url.searchParams.get('avatarId')
    const limit = parseInt(url.searchParams.get('limit') || '100')

    if (!avatarId) {
      return Response.json({ success: false, message: '缺少参数 avatarId' }, { status: 400 })
    }

    const supabase = createServiceClient()
    // 验证形象归属
    const { data: avatar, error: avatarErr } = await supabase
      .from('ai_avatars')
      .select('id, user_id')
      .eq('id', avatarId)
      .single()

    if (avatarErr) throw avatarErr
    if (!avatar || avatar.user_id !== userId) {
      return Response.json({ success: false, message: '无权访问该形象的穿搭' }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('avatar_outfits')
      .select('id, image_url, title, created_at')
      .eq('avatar_id', avatarId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return Response.json({ success: true, data })
  } catch (e: any) {
    console.error('GET /api/outfits error', e)
    return Response.json({ success: false, message: e.message || '服务器错误' }, { status: 500 })
  }
}

// 新建穿搭图片记录
export async function POST(request: NextRequest) {
  try {
    const authResult = requireAuth(request)
    if ('error' in authResult) {
      return Response.json(authResult.error, { status: 401 })
    }
    const userId = authResult.user.userId

    const body = await request.json()
    const avatar_id: string = body?.avatar_id
    let image_url: string = body?.image_url
    const title: string | undefined = body?.title

    if (!avatar_id || !image_url) {
      return Response.json({ success: false, message: '缺少 avatar_id 或 image_url' }, { status: 400 })
    }

    const supabase = createServiceClient()
    // 验证形象归属
    const { data: avatar, error: avatarErr } = await supabase
      .from('ai_avatars')
      .select('id, user_id, avatar_url')
      .eq('id', avatar_id)
      .single()

    if (avatarErr) throw avatarErr
    if (!avatar || avatar.user_id !== userId) {
      return Response.json({ success: false, message: '无权为该形象新增穿搭' }, { status: 403 })
    }

    // 1) 读取形象的正脸照片URL（当前库无 front_face_url，使用 avatar_url）
    const faceUrl: string | undefined = (avatar as any)?.avatar_url
    const norm = (u: string | undefined) => {
      if (!u) return ''
      if (u.startsWith('/api/media/proxy?u=')) {
        const p = new URL('http://local'+u)
        const raw = p.searchParams.get('u') || ''
        try { return decodeURIComponent(raw) } catch { return raw }
      }
      return u
    }
    image_url = norm(image_url)
    if (!image_url || !(image_url.startsWith('http://') || image_url.startsWith('https://'))) {
      return Response.json({ success: false, message: '穿搭图片URL不可用' }, { status: 400 })
    }
    try {
      const head = await fetch(image_url, { method: 'HEAD' })
      if (!head.ok) return Response.json({ success: false, message: '穿搭图片URL无法访问' }, { status: 400 })
    } catch {
      return Response.json({ success: false, message: '穿搭图片URL无法访问' }, { status: 400 })
    }
    if (!faceUrl) {
      return Response.json({ success: false, message: '该形象缺少正脸照片URL' }, { status: 400 })
    }

    const createRes = await createTask({
      workflowId: OUTFIT_WORKFLOW_ID,
      apiKey: RUNNINGHUB_API_KEY,
      nodeInfoList: [
        { nodeId: '253', fieldName: 'image', fieldValue: faceUrl },
        { nodeId: '254', fieldName: 'image', fieldValue: image_url },
      ],
      webhookUrl: WEBHOOK_URL || undefined,
    })
    if (createRes.code !== 0 || !createRes.data?.taskId) {
      return Response.json({ success: false, message: createRes.msg || '创建穿搭处理任务失败' }, { status: 500 })
    }

    const taskId = createRes.data.taskId
    const { data: generation, error: genErr } = await supabase
      .from('ai_generations')
      .insert({
        user_id: userId,
        template_id: null,
        input_type: 'image',
        input_data: { avatar_id, face_url: faceUrl, image_url },
        source_urls: [image_url],
        generation_params: { target: 'outfit', avatar_id, title },
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
    console.error('POST /api/outfits error', e)
    return Response.json({ success: false, message: e.message || '服务器错误' }, { status: 500 })
  }
}

// 删除指定穿搭（仅限本人）
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
    // 验证记录归属
    const { data: outfit, error: getErr } = await supabase
      .from('avatar_outfits')
      .select('id, user_id')
      .eq('id', id)
      .single()

    if (getErr) throw getErr
    if (!outfit || outfit.user_id !== userId) {
      return Response.json({ success: false, message: '无权删除该穿搭' }, { status: 403 })
    }

    const { error: delErr } = await supabase
      .from('avatar_outfits')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (delErr) throw delErr
    return Response.json({ success: true })
  } catch (e: any) {
    console.error('DELETE /api/outfits error', e)
    return Response.json({ success: false, message: e.message || '服务器错误' }, { status: 500 })
  }
}
