import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/middleware/auth'
import { recallMessage } from '@/lib/api/messages'

export async function POST(request: NextRequest, { params }: { params: Promise<{ messageId: string }> }) {
  try {
    const auth = requireAuth(request)
    if ('error' in auth) return NextResponse.json(auth.error, { status: 401 })
    
    // await params to get the actual values
    const { messageId } = await params
    
    const result = await recallMessage(auth.user.userId, messageId, auth.token)
    const status = result.success ? 200 : 400
    return NextResponse.json(result, { status })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'INTERNAL_ERROR', message: '服务器内部错误' }, { status: 500 })
  }
}
