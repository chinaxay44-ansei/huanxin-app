import { NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/middleware/auth'
import { createTask } from '@/lib/comfyui/runninghub'

const TEST_WORKFLOW_ID = process.env.RUNNINGHUB_WORKFLOW_ID_TEST || '1987407383821488130'
const PHOTO_WORKFLOW_ID = process.env.RUNNINGHUB_WORKFLOW_ID_PHOTO || '1988488436044750850'
const WEBHOOK_URL = process.env.RUNNINGHUB_WEBHOOK_URL || 'https://new.nat300.top/api/runninghub/webhook'
const RUNNINGHUB_API_KEY = process.env.RUNNINGHUB_API_KEY || ''

const markStaleGenerations = async (supabase: ReturnType<typeof createServiceClient>, userId?: string) => {
  try {
    const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    const now = new Date().toISOString()
    let staleQuery = supabase
      .from('ai_generations')
      .select('id, generation_params, user_id, created_at, status')
      .in('status', ['pending', 'processing'])
      .lte('created_at', cutoff)
    if (userId) staleQuery = staleQuery.eq('user_id', userId)

    const { data: stale } = await staleQuery
    if (!stale || stale.length === 0) return

    const staleIds = stale.map((g: any) => g.id)
    const workIds = stale
      .map((g: any) => g?.generation_params?.work_id)
      .filter((id: any): id is string => typeof id === 'string')

    await supabase
      .from('ai_generations')
      .update({ status: 'failed', error_message: 'timeout', updated_at: now })
      .in('id', staleIds)

    if (workIds.length > 0) {
      await supabase
        .from('works')
        .update({ status: 'failed', title: '生成失败', updated_at: now })
        .in('id', workIds)
    }
  } catch (err) {
    console.warn('markStaleGenerations failed', err)
  }
}

export async function GET(request: NextRequest) {
  try {
    const authResult = requireAuth(request)
    if ('error' in authResult) {
      return Response.json(authResult.error, { status: 401 })
    }
    const userId = authResult.user.userId

    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get('limit') || '50')

    const supabase = createServiceClient()
    await markStaleGenerations(supabase, userId)
    const { data, error } = await supabase
      .from('ai_generations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    if (Array.isArray(data) && data.length > 0) {
      for (const gen of data) {
        if (gen.status === 'completed' && gen.output_url) {
          try {
            const { data: existingList } = await supabase
              .from('works')
              .select('id')
              .eq('user_id', gen.user_id)
              .eq('media_url', gen.output_url)
              .limit(1)
            const exists = Array.isArray(existingList) && existingList.length > 0
            if (!exists) {
              const lower = (gen.output_url || '').toLowerCase()
              const isImage = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'].some(ext => lower.includes(ext))
              const isVideo = ['.mp4', '.mov', '.webm', '.m4v', '.avi', '.mpeg'].some(ext => lower.includes(ext))
              const mediaType: 'image' | 'video' = isVideo ? 'video' : 'image'
              const title = gen.prompt ? (gen.prompt.length > 20 ? gen.prompt.slice(0, 20) + '…' : gen.prompt) : '用户还没有给作品取名'
              const wfId = (gen.generation_params && gen.generation_params.avatar_id) ? PHOTO_WORKFLOW_ID : TEST_WORKFLOW_ID
              const avatarId = gen.generation_params?.avatar_id || null
              const srcUrls: string[] = Array.isArray(gen.source_urls) ? gen.source_urls : []
              let avatarUrl: string = ''
              if (avatarId) {
                try {
                  const { data: avatar } = await supabase
                    .from('ai_avatars')
                    .select('avatar_url')
                    .eq('id', avatarId)
                    .single()
                  if (avatar?.avatar_url) avatarUrl = avatar.avatar_url
                } catch {}
              }
              const request_json = {
                workflowId: wfId,
                intro: gen.prompt || '',
                nodeInfoList: avatarId ? [
                  { nodeId: 'AVATAR', fieldName: 'image', fieldValue: '__AVATAR_IMAGE__', description: '形象正脸', defaultValue: avatarUrl, visible: true },
                  { nodeId: 'SOURCE', fieldName: 'image', fieldValue: '__IMAGE_UPLOAD__', description: '写真素材', defaultValue: srcUrls[0] || '', visible: true },
                  { nodeId: 'PROMPT', fieldName: 'text', fieldValue: '__PROMPT_TEXT__', description: '描述词', defaultValue: gen.prompt || '', visible: true },
                ] : [
                  { nodeId: 'PROMPT', fieldName: 'text', fieldValue: '__PROMPT_TEXT__', description: '描述词', defaultValue: gen.prompt || '', visible: true },
                ],
              }
              await supabase
                .from('works')
                .insert({
                  user_id: gen.user_id,
                  title,
                  description: null,
                  media_url: gen.output_url,
                  type: mediaType,
                  thumbnail_url: gen.output_url,
                  tags: [],
                  is_ai_generated: true,
                  ai_template_id: gen.template_id ?? null,
                  generation_params: { request_json },
                  status: 'published',
                  visibility: 'private',
                })
            }
          } catch {}
        }
      }
    }
    return Response.json({ success: true, data })
  } catch (e: any) {
    console.error('GET /api/ai/generate error', e)
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
    const template_id = body.template_id || null
    const prompt: string = body.prompt || ''
    const source_urls: string[] = body.source_urls || []
    const generation_params = body.generation_params || {}

    if (source_urls.length === 0) {
      return Response.json({ success: false, message: '请先上传素材图片' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // 免费模式：跳过能量校验与扣减
    const energyCost = 0

    // 预创建生成记录
    const { data: inserted, error: insErr } = await supabase
      .from('ai_generations')
      .insert({
        user_id: userId,
        template_id,
        input_type: 'image',
        input_data: { source_urls, generation_params },
        source_urls,
        generation_params,
        prompt,
        output_type: 'image',
        status: 'pending',
        progress: 0,
        energy_cost: energyCost,
        started_at: new Date().toISOString(),
      })
      .select('*')
      .single()

    if (insErr || !inserted) throw insErr || new Error('创建生成记录失败')

    // 根据参数决定调用的工作流与节点映射：当传入 avatar_id + 图片URL 时，走换脸写真工作流
    const webhookUrl = WEBHOOK_URL ? `${WEBHOOK_URL}` : undefined
    const avatarId: string | null = generation_params?.avatar_id || null
    const faceSwapMode = !!avatarId && Array.isArray(source_urls) && source_urls.length > 0
    let createRes
    if (faceSwapMode) {
      // 读取选中形象的正脸URL
      const { data: avatar } = await supabase
        .from('ai_avatars')
        .select('id, user_id, avatar_url')
        .eq('id', avatarId)
        .single()

      if (!avatar || avatar.user_id !== userId || !avatar.avatar_url) {
        // 更新为失败状态
        await supabase
          .from('ai_generations')
          .update({ status: 'failed', error_message: '形象无效或缺少正脸URL', updated_at: new Date().toISOString() })
          .eq('id', inserted.id)
        return Response.json({ success: false, message: '形象无效或缺少正脸URL' }, { status: 400 })
      }

      // 注入图片节点：nodeId 354 为形象正脸；nodeId 358 为用户上传写真
      createRes = await createTask({
        workflowId: PHOTO_WORKFLOW_ID,
        apiKey: RUNNINGHUB_API_KEY,
        nodeInfoList: [
          { nodeId: '354', fieldName: 'image', fieldValue: avatar.avatar_url },
          { nodeId: '358', fieldName: 'image', fieldValue: source_urls[0] },
        ],
        webhookUrl,
      })
    } else {
      // 默认测试工作流（保留原逻辑）
      createRes = await createTask({
        workflowId: TEST_WORKFLOW_ID,
        nodeInfoList: undefined, // 使用工作流默认参数
        webhookUrl,
      })
    }

    if (createRes.code !== 0 || !createRes.data?.taskId) {
      await supabase
        .from('ai_generations')
        .update({ status: 'failed', error_message: createRes.msg || '创建任务失败', updated_at: new Date().toISOString() })
        .eq('id', inserted.id)

      return Response.json({ success: false, message: createRes.msg || '创建任务失败' }, { status: 500 })
    }

    // 构造占位作品与请求JSON（记录本次使用的参数）
    const uniqueTag = `${userId}-${createRes.data.taskId}-${Date.now()}`
    const placeholderSvg = encodeURI(
      `<svg xmlns='http://www.w3.org/2000/svg' width='512' height='512'><rect fill='#F3F4F6' width='100%' height='100%'/><text x='50%' y='50%' font-size='28' fill='#111827' text-anchor='middle' dominant-baseline='middle'>作品生成中</text><desc>${uniqueTag}</desc></svg>`
    )
    const placeholderUrl = `data:image/svg+xml;utf8,${placeholderSvg}`

    const request_json = {
      workflowId: faceSwapMode ? PHOTO_WORKFLOW_ID : TEST_WORKFLOW_ID,
      intro: prompt || '',
      nodeInfoList: faceSwapMode
        ? [
            { nodeId: 'AVATAR', fieldName: 'image', fieldValue: '__AVATAR_IMAGE__', description: '形象正脸', defaultValue: avatarId ? (await supabase.from('ai_avatars').select('avatar_url').eq('id', avatarId).single()).data?.avatar_url || '' : '', visible: true },
            { nodeId: 'SOURCE', fieldName: 'image', fieldValue: '__IMAGE_UPLOAD__', description: '写真素材', defaultValue: source_urls[0] || '', visible: true },
            { nodeId: 'PROMPT', fieldName: 'text', fieldValue: '__PROMPT_TEXT__', description: '描述词', defaultValue: prompt || '', visible: true },
          ]
        : [
            { nodeId: 'PROMPT', fieldName: 'text', fieldValue: '__PROMPT_TEXT__', description: '描述词', defaultValue: prompt || '', visible: true },
          ],
    }

    const { data: insertedWork } = await supabase
      .from('works')
      .insert({
        user_id: userId,
        title: '作品生成中',
        description: null,
        media_url: placeholderUrl,
        type: 'image',
        thumbnail_url: placeholderUrl,
        tags: [],
        is_ai_generated: true,
        ai_template_id: template_id ?? null,
        generation_params: { request_json },
        status: 'pending',
        visibility: 'private',
      })
      .select('id')
      .single()

    // 将生成任务记录与占位作品绑定，等待 RunningHub webhook 回调
    await supabase
      .from('ai_generations')
      .update({
        external_task_id: createRes.data.taskId,
        status: 'processing',
        generation_params: {
          ...generation_params,
          target: 'work',
          work_id: insertedWork?.id,
          placeholder_url: placeholderUrl,
          prompt,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', inserted.id)

    return Response.json({ success: true, data: { id: inserted.id, workId: insertedWork?.id } })
  } catch (e: any) {
    console.error('POST /api/ai/generate error', e)
    return Response.json({ success: false, message: e.message || '服务器错误' }, { status: 500 })
  }
}
