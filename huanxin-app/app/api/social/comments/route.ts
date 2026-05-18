import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/middleware/auth'
import { createComment, getWorkComments } from '@/lib/api/social'

// GET /api/social/comments - 获取作品评论列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const workId = searchParams.get('work_id')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    const sortParam = (searchParams.get('sort') || 'hot').toLowerCase()
    const sort = sortParam === 'latest' ? 'latest' : 'hot'
    if (!workId) return NextResponse.json({ success: false, error: 'MISSING_WORK_ID', message: '请提供作品ID' }, { status: 400 })
    if (limit < 1 || limit > 50) return NextResponse.json({ success: false, error: 'INVALID_LIMIT', message: '每页数量必须在1-50之间' }, { status: 400 })
    if (offset < 0) return NextResponse.json({ success: false, error: 'INVALID_OFFSET', message: '偏移量不能为负数' }, { status: 400 })
    let userId: string | undefined
    try { const authResult = requireAuth(request); if (!('error' in authResult)) userId = authResult.user.userId } catch {}

    const result = await getWorkComments(workId, userId, limit, offset, sort)
    if (!result.success) return NextResponse.json(result, { status: 400 })
    return NextResponse.json(result)
  } catch (error) {
    console.error('获取评论列表API错误:', error)
    return NextResponse.json({ success: false, error: 'INTERNAL_ERROR', message: '服务器内部错误' }, { status: 500 })
  }
}

// POST /api/social/comments - 创建评论
export async function POST(request: NextRequest) {
  try {
    // 验证用户身份
    const authResult = requireAuth(request)
    if ('error' in authResult) {
      return NextResponse.json(authResult.error, { status: 401 })
    }
    
    const body = await request.json()
    const { work_id, content, parent_id } = body
    
    if (!work_id) {
      return NextResponse.json({
        success: false,
        error: 'MISSING_WORK_ID',
        message: '请提供作品ID'
      }, { status: 400 })
    }
    
    if (!content || content.trim().length === 0) {
      return NextResponse.json({
        success: false,
        error: 'INVALID_CONTENT',
        message: '评论内容不能为空'
      }, { status: 400 })
    }
    
    if (content.length > 500) {
      return NextResponse.json({
        success: false,
        error: 'INVALID_CONTENT',
        message: '评论内容不能超过500个字符'
      }, { status: 400 })
    }
    
    const result = await createComment(authResult.user.userId, {
      work_id,
      content: content.trim(),
      parent_id
    })
    
    if (!result.success) {
      const statusCode = result.error === 'WORK_NOT_FOUND' || result.error === 'PARENT_COMMENT_NOT_FOUND' ? 404 : 400
      return NextResponse.json(result, { status: statusCode })
    }
    
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('创建评论API错误:', error)
    return NextResponse.json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: '服务器内部错误'
    }, { status: 500 })
  }
}
