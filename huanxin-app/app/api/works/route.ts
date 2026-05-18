import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/middleware/auth'
import { createWork, getWorksList } from '@/lib/api/works'

// GET /api/works - 获取作品列表
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId') || undefined
    const categoryId = searchParams.get('categoryId') || undefined
    const status = searchParams.get('status') as 'draft' | 'published' | 'private' || undefined
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    const sortBy = searchParams.get('sortBy') as 'created_at' | 'updated_at' | 'likes_count' | 'views_count' | 'random' || 'created_at'
    const sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc' || 'desc'
    const type = searchParams.get('type') as 'image' | 'video' || undefined

    const result = await getWorksList({
      userId,
      categoryId,
      type,
      status,
      limit,
      offset,
      sortBy,
      sortOrder
    })
    
    if (!result.success) {
      return NextResponse.json(result, { status: 400 })
    }
    
    return NextResponse.json({
      data: result.data,
      total: result.total,
      hasMore: result.hasMore
    }, {
      headers: {
        'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=300'
      }
    })
  } catch (error) {
    console.error('获取作品列表API错误:', error)
    return NextResponse.json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: '服务器内部错误'
    }, { status: 500 })
  }
}

// POST /api/works - 发布作品
export async function POST(request: NextRequest) {
  try {
    const authResult = requireAuth(request)
    if ('error' in authResult) {
      return NextResponse.json(authResult.error, { status: 401 })
    }
    
    const body = await request.json()
    const { title, description, media_url, media_type, thumbnail_url, category_id, tags, ai_template_id, generation_params } = body
    
    // 验证必填字段
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
    
    if (!media_url || media_url.trim().length === 0) {
      return NextResponse.json({
        success: false,
        error: 'INVALID_MEDIA_URL',
        message: '媒体文件URL不能为空'
      }, { status: 400 })
    }
    
    if (!media_type || !['image', 'video'].includes(media_type)) {
      return NextResponse.json({
        success: false,
        error: 'INVALID_MEDIA_TYPE',
        message: '媒体类型必须是image或video'
      }, { status: 400 })
    }
    
    if (description && description.length > 1000) {
      return NextResponse.json({
        success: false,
        error: 'INVALID_DESCRIPTION',
        message: '作品描述不能超过1000个字符'
      }, { status: 400 })
    }
    
    if (tags && (!Array.isArray(tags) || tags.some(tag => typeof tag !== 'string' || tag.length > 20))) {
      return NextResponse.json({
        success: false,
        error: 'INVALID_TAGS',
        message: '标签必须是字符串数组，每个标签不超过20个字符'
      }, { status: 400 })
    }
    
    if (tags && tags.length > 10) {
      return NextResponse.json({
        success: false,
        error: 'INVALID_TAGS',
        message: '标签数量不能超过10个'
      }, { status: 400 })
    }
    
    // 创建作品
    const result = await createWork(authResult.user.userId, {
      title: title.trim(),
      description: description?.trim(),
      media_url: media_url.trim(),
      media_type,
      thumbnail_url: thumbnail_url?.trim(),
      category_id,
      tags,
      ai_template_id,
      generation_params
    })
    
    if (!result.success) {
      return NextResponse.json(result, { status: 400 })
    }
    
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('发布作品API错误:', error)
    return NextResponse.json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: '服务器内部错误'
    }, { status: 500 })
  }
}
