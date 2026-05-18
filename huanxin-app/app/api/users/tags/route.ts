import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/middleware/auth'
import { getUserPersonalTags, updateUserPersonalTags } from '@/lib/api/users'

export async function GET(request: NextRequest) {
  try {
    const authResult = requireAuth(request)
    
    if ('error' in authResult) {
      return NextResponse.json(authResult.error, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || authResult.user.userId

    const result = await getUserPersonalTags(request, userId)
    
    if (result.success) {
      return NextResponse.json(result, { status: 200 })
    } else {
      return NextResponse.json(result, { status: 500 })
    }
  } catch (error) {
    console.error('获取用户个人标签API错误:', error)
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

export async function PUT(request: NextRequest) {
  try {
    const authResult = requireAuth(request)
    
    if ('error' in authResult) {
      return NextResponse.json(authResult.error, { status: 401 })
    }

    const body = await request.json()
    const { tagIds } = body

    if (!Array.isArray(tagIds)) {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_PARAMS',
          message: '标签ID列表格式不正确'
        },
        { status: 400 }
      )
    }

    const result = await updateUserPersonalTags(request, authResult.user.userId, tagIds)
    
    if (result.success) {
      return NextResponse.json(result, { status: 200 })
    } else {
      return NextResponse.json(result, { status: 500 })
    }
  } catch (error) {
    console.error('更新用户个人标签API错误:', error)
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