import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/middleware/auth'
import { getRecommendedWorks, getRecommendedUsers } from '@/lib/api/search'

// GET /api/recommendations - 获取推荐内容
export async function GET(request: NextRequest) {
  try {
    // 验证用户身份
    const authResult = requireAuth(request)
    if ('error' in authResult) {
      return NextResponse.json(authResult.error, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'works' | 'users' | 'all'
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    
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
    
    const validTypes = ['works', 'users', 'all']
    if (type && !validTypes.includes(type)) {
      return NextResponse.json({
        success: false,
        error: 'INVALID_TYPE',
        message: '无效的推荐类型'
      }, { status: 400 })
    }
    
    try {
      let result
      
      switch (type) {
        case 'works':
          result = await getRecommendedWorks(authResult.user.userId, { limit, offset })
          break
        case 'users':
          result = await getRecommendedUsers(authResult.user.userId, { limit, offset })
          break
        default: // 'all' or null
          // 并行获取推荐作品和用户
          const [worksResult, usersResult] = await Promise.all([
            getRecommendedWorks(authResult.user.userId, { limit: Math.ceil(limit / 2), offset }),
            getRecommendedUsers(authResult.user.userId, { limit: Math.ceil(limit / 2), offset })
          ])
          
          if (!worksResult.success || !usersResult.success) {
            return NextResponse.json({
              success: false,
              error: 'RECOMMENDATION_FAILED',
              message: '获取推荐失败'
            }, { status: 400 })
          }
          
          result = {
            success: true,
            data: {
              works: worksResult.data.works,
              users: usersResult.data.users
            }
          }
          break
      }
      
      if (!result.success) {
        return NextResponse.json(result, { status: 400 })
      }
      
      return NextResponse.json(result)
    } catch (error) {
      console.error('获取推荐内容错误:', error)
      return NextResponse.json({
        success: false,
        error: 'RECOMMENDATION_FAILED',
        message: '获取推荐失败'
      }, { status: 400 })
    }
  } catch (error) {
    console.error('推荐API错误:', error)
    return NextResponse.json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: '服务器内部错误'
    }, { status: 500 })
  }
}