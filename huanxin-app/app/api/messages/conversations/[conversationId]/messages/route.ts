import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/middleware/auth'
import { getConversationMessages, sendMessage } from '@/lib/api/messages'

// UUID v4 验证正则
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function GET(request: NextRequest, { params }: { params: Promise<{ conversationId: string }> }) {
  try {
    const auth = requireAuth(request)
    if ('error' in auth) return NextResponse.json(auth.error, { status: 401 })
    
    // await params to get the actual values
    const { conversationId } = await params
    
    // 验证 conversationId 格式
    if (!conversationId || !UUID_REGEX.test(conversationId)) {
      console.error('[GET messages] 无效的会话ID:', conversationId)
      return NextResponse.json({ 
        success: false, 
        error: 'INVALID_CONVERSATION_ID', 
        message: `无效的会话ID格式: ${conversationId}` 
      }, { status: 400 })
    }
    
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    if (limit < 1 || limit > 100) {
      return NextResponse.json({ success: false, error: 'INVALID_LIMIT', message: '每页数量必须在1-100之间' }, { status: 400 })
    }
    if (offset < 0) {
      return NextResponse.json({ success: false, error: 'INVALID_OFFSET', message: '偏移量不能为负数' }, { status: 400 })
    }
    const result = await getConversationMessages(auth.user.userId, conversationId, limit, offset, auth.token)
    let status = 200
    if (!result.success) {
      if (result.error === 'CONVERSATION_NOT_FOUND') status = 404
      else if (result.error === 'NOT_PARTICIPANT') status = 403
      else status = 400
    }
    return NextResponse.json(result, { status })
  } catch (e) {
    console.error('[GET messages] 异常:', e)
    return NextResponse.json({ success: false, error: 'INTERNAL_ERROR', message: '服务器内部错误' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ conversationId: string }> }) {
  try {
    const auth = requireAuth(request)
    if ('error' in auth) return NextResponse.json(auth.error, { status: 401 })
    
    // await params to get the actual values
    const { conversationId } = await params
    
    // 验证 conversationId 格式
    if (!conversationId || !UUID_REGEX.test(conversationId)) {
      console.error('[POST message] 无效的会话ID:', conversationId)
      return NextResponse.json({ 
        success: false, 
        error: 'INVALID_CONVERSATION_ID', 
        message: `无效的会话ID格式: ${conversationId}` 
      }, { status: 400 })
    }
    
    const body = await request.json()
    const content = (body?.content ?? '') as string
    const message_type = (body?.message_type ?? 'text') as 'text' | 'image' | 'video' | 'audio' | 'file' | 'system'
    const media_url = body?.media_url as string | undefined
    const reply_to = body?.reply_to as string | undefined
    if (message_type === 'text') {
      if (!content || typeof content !== 'string' || content.trim().length === 0) {
        return NextResponse.json({ success: false, error: 'MISSING_CONTENT', message: '内容不能为空' }, { status: 400 })
      }
    } else {
      if (!media_url || typeof media_url !== 'string') {
        return NextResponse.json({ success: false, error: 'MISSING_MEDIA', message: '媒体内容缺失' }, { status: 400 })
      }
    }
    const result = await sendMessage(auth.user.userId, {
      conversation_id: conversationId,
      content: content || '',
      message_type,
      media_url,
      reply_to
    }, auth.token)
    let status = result.success ? 201 : 400
    if (!result.success) {
      if (result.error === 'CONVERSATION_NOT_FOUND') status = 404
      else if (result.error === 'NOT_PARTICIPANT' || result.error === 'CONVERSATION_BLOCKED') status = 403
    }
    return NextResponse.json(result, { status })
  } catch (e) {
    console.error('[POST message] 异常:', e)
    return NextResponse.json({ success: false, error: 'INTERNAL_ERROR', message: '服务器内部错误' }, { status: 500 })
  }
}
