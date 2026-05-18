import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/middleware/auth'
import { likeComment, unlikeComment } from '@/lib/api/social'

// POST /api/social/comments/like - 点赞评论
export async function POST(request: NextRequest) {
  try {
    // 验证用户身份
    const authResult = requireAuth(request)
    if ('error' in authResult) {
      return NextResponse.json(authResult.error, { status: 401 })
    }
    
    const body = await request.json()
    const { comment_id } = body
    
    if (!comment_id) {
      return NextResponse.json({
        success: false,
        error: 'MISSING_COMMENT_ID',
        message: '请提供要点赞的评论ID'
      }, { status: 400 })
    }
    
    const result = await likeComment(authResult.user.userId, comment_id)
    
    if (!result.success) {
      const statusCode = result.error === 'COMMENT_NOT_FOUND' ? 404 : 400
      return NextResponse.json(result, { status: statusCode })
    }
    
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('点赞评论API错误:', error)
    return NextResponse.json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: '服务器内部错误'
    }, { status: 500 })
  }
}

// DELETE /api/social/comments/like - 取消点赞评论
export async function DELETE(request: NextRequest) {
  try {
    // 验证用户身份
    const authResult = requireAuth(request)
    if ('error' in authResult) {
      return NextResponse.json(authResult.error, { status: 401 })
    }
    
    const body = await request.json()
    const { comment_id } = body
    
    if (!comment_id) {
      return NextResponse.json({
        success: false,
        error: 'MISSING_COMMENT_ID',
        message: '请提供要取消点赞的评论ID'
      }, { status: 400 })
    }
    
    const result = await unlikeComment(authResult.user.userId, comment_id)
    
    if (!result.success) {
      return NextResponse.json(result, { status: 400 })
    }
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('取消点赞评论API错误:', error)
    return NextResponse.json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: '服务器内部错误'
    }, { status: 500 })
  }
}