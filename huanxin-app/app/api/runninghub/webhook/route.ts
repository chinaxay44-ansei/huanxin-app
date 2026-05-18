import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { uploadToCos, buildPublicUrl } from '@/lib/cos'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const event: string = body?.event
    const taskId: string = body?.taskId
    const eventDataStr: string = body?.eventData
    if (!event || !taskId || !eventDataStr) return NextResponse.json({ success: false }, { status: 400 })
    if (event !== 'TASK_END') return NextResponse.json({ success: true })

    let payload: any = null
    try { payload = JSON.parse(eventDataStr) } catch { payload = null }
    if (!payload || payload.code !== 0 || !Array.isArray(payload.data) || payload.data.length === 0) {
      return NextResponse.json({ success: true })
    }
    const first = payload.data[0]
    const remoteUrl: string = first.fileUrl

    const supabase = createServiceClient()
    const { data: gen } = await supabase
      .from('ai_generations')
      .select('*')
      .eq('external_task_id', taskId)
      .maybeSingle()
    if (!gen) return NextResponse.json({ success: true })
    if (gen.status === 'completed') return NextResponse.json({ success: true })

    const userId: string = gen.user_id
    const target: string | undefined = gen.generation_params?.target
    const now = new Date().toISOString()

    const bucket = 'work-media'
    const ext = (remoteUrl.split('?')[0].split('.').pop() || 'png').toLowerCase()
    const filename = `${Date.now()}.${ext}`

    let path = `ai-generations/${userId}/${gen.id}.${ext}`
    if (target === 'avatar') path = `ai-avatars/${userId}/${filename}`
    if (target === 'outfit') path = `ai-outfits/${userId}/${gen.generation_params?.avatar_id || 'unknown'}/${filename}`
    if (target === 'asset') path = `user-assets/${userId}/${filename}`

    try {
      const resp = await fetch(remoteUrl)
      const buf = await resp.arrayBuffer()
      await uploadToCos({
        bucketPrefix: bucket,
        objectPath: path,
        body: buf,
        contentType: ext === 'png' ? 'image/png' : 'image/jpeg',
      })
    } catch {
      await supabase
        .from('ai_generations')
        .update({ status: 'failed', error_message: 'upload_failed', updated_at: now })
        .eq('id', gen.id)
      if (!target || target === 'work') {
        const workId = gen.generation_params?.work_id
        if (workId) {
          await supabase.from('works').update({ status: 'failed', title: '生成失败', updated_at: now }).eq('id', workId)
        }
      }
      return NextResponse.json({ success: true })
    }

    const finalUrl = buildPublicUrl(`${bucket}/${path}`)

    await supabase
      .from('ai_generations')
      .update({ output_url: finalUrl, status: 'completed', completed_at: now, progress: 100, updated_at: now })
      .eq('id', gen.id)

    // 通知用户：生成成功
    const notify = async (title: string, content: string, data?: Record<string, any>) => {
      try {
        await supabase.from('notifications').insert({
          user_id: userId,
          type: 'system',
          title,
          content,
          data: data || {},
          is_read: false,
        })
      } catch {
        // ignore notification failure
      }
    }

    if (!target || target === 'work') {
      const workId: string | undefined = gen.generation_params?.work_id
      if (workId) {
        const lower = (finalUrl || '').toLowerCase()
        const isVideo = ['.mp4', '.mov', '.webm', '.m4v', '.avi', '.mpeg'].some(ext => lower.includes(ext))
        const mediaType: 'image' | 'video' = isVideo ? 'video' : 'image'
        const title =
          gen.prompt ? (gen.prompt.length > 20 ? gen.prompt.slice(0, 20) + '…' : gen.prompt) : (gen.generation_params?.title || '焕星生成')
        await supabase
          .from('works')
          .update({
            title,
            media_url: finalUrl,
            thumbnail_url: finalUrl,
            status: 'published',
            type: mediaType,
            updated_at: now,
          })
          .eq('id', workId)
        await notify('作品生成完成', title, { work_id: workId, output_url: finalUrl })
      }
    } else if (target === 'avatar') {
      const name: string | undefined = gen.generation_params?.name
      await supabase
        .from('ai_avatars')
        .insert({ user_id: userId, name, avatar_url: finalUrl, status: 'active', is_active: false })
      await notify('形象生成完成', name || '新形象', { avatar_url: finalUrl })
    } else if (target === 'outfit') {
      const avatarId: string | undefined = gen.generation_params?.avatar_id
      const title: string | undefined = gen.generation_params?.title
      await supabase
        .from('avatar_outfits')
        .insert({ avatar_id: avatarId, user_id: userId, image_url: finalUrl, title })
      await notify('穿搭生成完成', title || '新穿搭', { avatar_id: avatarId, image_url: finalUrl })
    } else if (target === 'asset') {
      const title: string | undefined = gen.generation_params?.title
      const tags: string[] | undefined = gen.generation_params?.tags
      await supabase
        .from('user_assets')
        .insert({ user_id: userId, image_url: finalUrl, title, tags })
      await notify('素材生成完成', title || '新素材', { image_url: finalUrl })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
