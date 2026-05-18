import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/middleware/auth'
import { getWorkDetail, updateWork, deleteWork } from '@/lib/api/works'

interface RouteParams { params: Promise<{ workId: string }> }

// GET /api/works/[workId] - 获取作品详情
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { workId } = await params
    
    if (!workId) {
      return NextResponse.json({
        success: false,
        error: 'INVALID_WORK_ID',
        message: '作品ID不能为空'
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
      // 忽略认证错误，允许未登录用户查看作品
    }
    
    const result = await getWorkDetail(workId, userId)
    
    if (!result.success) {
      const statusCode = result.error === 'WORK_NOT_FOUND' ? 404 : 400
      return NextResponse.json(result, { status: statusCode })
    }
    
    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, max-age=0, s-maxage=30, stale-while-revalidate=300'
      }
    })
  } catch (error) {
    console.error('获取作品详情API错误:', error)
    return NextResponse.json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: '服务器内部错误'
    }, { status: 500 })
  }
}

// PUT /api/works/[workId] - 更新作品
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    // 验证用户身份
    const authResult = requireAuth(request)
    if ('error' in authResult) {
      return NextResponse.json(authResult.error, { status: 401 })
    }
    
    const { workId } = await params
    
    if (!workId) {
      return NextResponse.json({
        success: false,
        error: 'INVALID_WORK_ID',
        message: '作品ID不能为空'
      }, { status: 400 })
    }
    
    const body = await request.json()
    const { title, description, thumbnail_url, category_id, tags, status, visibility, generation_params } = body
    
    // 验证更新字段
    if (title !== undefined) {
      if (!title || title.trim().length === 0) {
        return NextResponse.json({
          success: false,
          error: 'INVALID_TITLE',
          message: '作品标题不能为空'
        }, { status: 400 })
      }
      
      if (title.length > 100) {
        return NextResponse.json({
          success: false,
          error: 'INVALID_TITLE',
          message: '作品标题不能超过100个字符'
        }, { status: 400 })
      }
    }
    
    if (description !== undefined && description.length > 1000) {
      return NextResponse.json({
        success: false,
        error: 'INVALID_DESCRIPTION',
        message: '作品描述不能超过1000个字符'
      }, { status: 400 })
    }
    
    if (tags !== undefined) {
      if (!Array.isArray(tags) || tags.some(tag => typeof tag !== 'string' || tag.length > 20)) {
        return NextResponse.json({
          success: false,
          error: 'INVALID_TAGS',
          message: '标签必须是字符串数组，每个标签不超过20个字符'
        }, { status: 400 })
      }
      
      if (tags.length > 10) {
        return NextResponse.json({
          success: false,
          error: 'INVALID_TAGS',
          message: '标签数量不能超过10个'
        }, { status: 400 })
      }
    }
    
    const allowedStatus = ['draft', 'published', 'reviewing', 'rejected', 'pending', 'failed'] as const
    if (status !== undefined && !allowedStatus.includes(status)) {
      return NextResponse.json({
        success: false,
        error: 'INVALID_STATUS',
        message: '作品状态必须是 draft/published/reviewing/rejected/pending/failed'
      }, { status: 400 })
    }

    if (visibility !== undefined && !['public', 'private'].includes(visibility)) {
      return NextResponse.json({
        success: false,
        error: 'INVALID_VISIBILITY',
        message: '作品可见性必须是public或private'
      }, { status: 400 })
    }
    
    // 构建更新数据
    const updates: any = {}
    if (title !== undefined) updates.title = title.trim()
    if (description !== undefined) updates.description = description.trim()
    if (thumbnail_url !== undefined) updates.thumbnail_url = thumbnail_url?.trim()
    if (category_id !== undefined) updates.category_id = category_id
    if (tags !== undefined) updates.tags = tags
    // 若传入 status=private，转换为 published + visibility=private 以匹配枚举
    if (status === 'private') {
      updates.status = 'published'
      updates.visibility = 'private'
    } else if (status !== undefined) {
      updates.status = status
    }
    if (visibility !== undefined) updates.visibility = visibility
    
    // 更新作品
    const result = await updateWork(workId, authResult.user.userId, { ...updates, generation_params } as any)
    
    if (!result.success) {
      const statusCode = result.error === 'WORK_NOT_FOUND' ? 404 : 400
      return NextResponse.json(result, { status: statusCode })
    }
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('更新作品API错误:', error)
    return NextResponse.json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: '服务器内部错误'
    }, { status: 500 })
  }
}

// DELETE /api/works/[workId] - 删除作品
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // 验证用户身份
    const authResult = requireAuth(request)
    if ('error' in authResult) {
      return NextResponse.json(authResult.error, { status: 401 })
    }
    
    const { workId } = await params
    
    if (!workId) {
      return NextResponse.json({
        success: false,
        error: 'INVALID_WORK_ID',
        message: '作品ID不能为空'
      }, { status: 400 })
    }
    
    // 删除作品
    const result = await deleteWork(workId, authResult.user.userId)
    
    if (!result.success) {
      const statusCode = result.error === 'WORK_NOT_FOUND' ? 404 : 400
      return NextResponse.json(result, { status: statusCode })
    }
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('删除作品API错误:', error)
    return NextResponse.json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: '服务器内部错误'
    }, { status: 500 })
  }
}
