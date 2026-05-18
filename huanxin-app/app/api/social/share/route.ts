import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/middleware/auth'
import { shareWork } from '@/lib/api/social'

// POST /api/social/share - 分享作品
export async function POST(request: NextRequest) {
  try {
    // 验证用户身份
    const authResult = requireAuth(request)
    if ('error' in authResult) {
      return NextResponse.json(authResult.error, { status: 401 })
    }
    
    const body = await request.json()
    const { work_id, platform } = body
    
    if (!work_id) {
      return NextResponse.json({
        success: false,
        error: 'MISSING_WORK_ID',
        message: '请提供要分享的作品ID'
      }, { status: 400 })
    }
    
    // 验证分享平台（可选）
    if (platform && !['app', 'wechat', 'weibo', 'qq', 'douyin', 'other'].includes(platform)) {
      return NextResponse.json({
        success: false,
        error: 'INVALID_PLATFORM',
        message: '不支持的分享平台'
      }, { status: 400 })
    }
    
    const result = await shareWork(authResult.user.userId, work_id, platform)
    
    if (!result.success) {
      const statusCode = result.error === 'WORK_NOT_FOUND' ? 404 : 400
      return NextResponse.json(result, { status: statusCode })
    }
    
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('分享作品API错误:', error)
    return NextResponse.json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: '服务器内部错误'
    }, { status: 500 })
  }
}