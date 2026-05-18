import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/middleware/auth'
import { markNotificationAsRead } from '@/lib/api/messages'

// POST /api/messages/notifications/[notificationId]/read - 标记通知为已读
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ notificationId: string }> }
) {
  try {
    // 验证用户身份
    const authResult = requireAuth(request)
    if ('error' in authResult) {
      return NextResponse.json(authResult.error, { status: 401 })
    }
    
    // await params to get the actual values
    const { notificationId } = await params
    
    if (!notificationId) {
      return NextResponse.json({
        success: false,
        error: 'MISSING_NOTIFICATION_ID',
        message: '请提供通知ID'
      }, { status: 400 })
    }
    
    const result = await markNotificationAsRead(authResult.user.userId, notificationId, authResult.token)
    
    if (!result.success) {
      return NextResponse.json(result, { status: 400 })
    }
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('标记通知已读API错误:', error)
    return NextResponse.json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: '服务器内部错误'
    }, { status: 500 })
  }
}
