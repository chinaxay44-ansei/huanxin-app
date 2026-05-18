import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/middleware/auth'
import { getCommentReplies } from '@/lib/api/social'

interface RouteParams {
  params: {
    commentId: string
  }
}

// GET /api/social/comments/[commentId]/replies - 获取评论回复列表
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { commentId } = params
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')
    
    if (!commentId) {
      return NextResponse.json({
        success: false,
        error: 'MISSING_COMMENT_ID',
        message: '请提供评论ID'
      }, { status: 400 })
    }
    
    if (limit < 1 || limit > 50) {
      return NextResponse.json({
        success: false,
        error: 'INVALID_LIMIT',
        message: '每页数量必须在1-50之间'
      }, { status: 400 })
    }
    
    if (offset < 0) {
      return NextResponse.json({
        success: false,
        error: 'INVALID_OFFSET',
        message: '偏移量不能为负数'
      }, { status: 400 })
    }
    
    // 尝试获取当前用户ID（用于判断是否点赞）
    let userId: string | undefined
    try {
      const authResult = requireAuth(request)
      if (!('error' in authResult)) {
        userId = authResult.user.userId
      }
    } catch (error) {
      // 忽略认证错误，允许未登录用户查看回复
    }
    
    const result = await getCommentReplies(commentId, userId, limit, offset)
    
    if (!result.success) {
      return NextResponse.json(result, { status: 400 })
    }
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('获取评论回复API错误:', error)
    return NextResponse.json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: '服务器内部错误'
    }, { status: 500 })
  }
}