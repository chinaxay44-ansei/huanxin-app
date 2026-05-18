import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/middleware/auth'
import { getUserWorks } from '@/lib/api/users'

export async function GET(request: NextRequest) {
  try {
    const authResult = requireAuth(request)
    
    if ('error' in authResult) {
      return NextResponse.json(authResult.error, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || authResult.user.userId
    let visibility = searchParams.get('visibility') as 'public' | 'private' | undefined
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    const isSelf = userId === authResult.user.userId

    // 验证参数
    if (visibility && !['public', 'private'].includes(visibility)) {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_VISIBILITY',
          message: '可见性参数不正确'
        },
        { status: 400 }
      )
    }

    // 访问控制：仅本人可查看私密作品；访问他人作品时强制为 public
    if (!isSelf) {
      if (visibility === 'private') {
        return NextResponse.json(
          {
            success: false,
            error: 'FORBIDDEN',
            message: '仅可查看自己的私密作品'
          },
          { status: 403 }
        )
      }
      visibility = 'public'
    }

    if (limit > 100) {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_LIMIT',
          message: '每页数量不能超过100'
        },
        { status: 400 }
      )
    }

    const result = await getUserWorks(request, userId, visibility, limit, offset)
    
    if (result.success) {
      return NextResponse.json(result, { status: 200 })
    } else {
      return NextResponse.json(result, { status: 500 })
    }
  } catch (error) {
    console.error('获取用户作品列表API错误:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: '服务器内部错误'
      },
      { status: 500 }
    )
  }
}