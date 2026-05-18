import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/middleware/auth'
import { markMessagesAsRead } from '@/lib/api/messages'

// UUID v4 验证正则
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function POST(request: NextRequest, { params }: { params: Promise<{ conversationId: string }> }) {
  try {
    const auth = requireAuth(request)
    if ('error' in auth) return NextResponse.json(auth.error, { status: 401 })
    
    // await params to get the actual values
    const { conversationId } = await params
    
    // 验证 conversationId 格式
    if (!conversationId || !UUID_REGEX.test(conversationId)) {
      console.error('[POST read] 无效的会话ID:', conversationId)
      return NextResponse.json({ 
        success: false, 
        error: 'INVALID_CONVERSATION_ID', 
        message: `无效的会话ID格式: ${conversationId}` 
      }, { status: 400 })
    }
    
    const result = await markMessagesAsRead(auth.user.userId, conversationId, auth.token)
    let status = result.success ? 200 : 400
    if (!result.success) {
      if (result.error === 'CONVERSATION_NOT_FOUND') status = 404
      else if (result.error === 'NOT_PARTICIPANT') status = 403
    }
    return NextResponse.json(result, { status })
  } catch (e) {
    console.error('[POST read] 异常:', e)
    return NextResponse.json({ success: false, error: 'INTERNAL_ERROR', message: '服务器内部错误' }, { status: 500 })
  }
}
