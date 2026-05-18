import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/middleware/auth'
import { updateUserProfile, UpdateProfileRequest } from '@/lib/api/users'

export async function PUT(request: NextRequest) {
  try {
    const authResult = requireAuth(request)
    
    if ('error' in authResult) {
      return NextResponse.json(authResult.error, { status: 401 })
    }

    const body: UpdateProfileRequest = await request.json()
    
    // 验证请求参数
    if (Object.keys(body).length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_PARAMS',
          message: '没有提供更新数据'
        },
        { status: 400 }
      )
    }
    
    // 验证昵称长度
    if (body.nickname !== undefined) {
      if (body.nickname.length < 2 || body.nickname.length > 20) {
        return NextResponse.json(
          {
            success: false,
            error: 'INVALID_NICKNAME',
            message: '昵称长度应在2-20个字符之间'
          },
          { status: 400 }
        )
      }
    }
    
    // 验证个人简介长度
    if (body.bio !== undefined && body.bio.length > 200) {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_BIO',
          message: '个人简介不能超过200个字符'
        },
        { status: 400 }
      )
    }
    
    // 验证性别值
    if (body.gender !== undefined && !['male', 'female', 'other'].includes(body.gender)) {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_GENDER',
          message: '性别值不正确'
        },
        { status: 400 }
      )
    }
    
    // 验证生日格式
    if (body.birthday !== undefined) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/
      if (!dateRegex.test(body.birthday)) {
        return NextResponse.json(
          {
            success: false,
            error: 'INVALID_BIRTHDAY',
            message: '生日格式不正确，应为YYYY-MM-DD'
          },
          { status: 400 }
        )
      }
    }
    
    const result = await updateUserProfile(request, authResult.user.userId, body)
    
    if (result.success) {
      return NextResponse.json(result, { status: 200 })
    } else {
      const statusCode = result.error === 'USER_NOT_FOUND' ? 404 : 500
      return NextResponse.json(result, { status: statusCode })
    }
  } catch (error) {
    console.error('更新用户资料API错误:', error)
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