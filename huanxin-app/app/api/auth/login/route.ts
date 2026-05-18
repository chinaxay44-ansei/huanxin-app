import { NextRequest, NextResponse } from 'next/server'
import { loginUser, LoginRequest } from '@/lib/api/auth'
import jwt from 'jsonwebtoken'

export async function POST(request: NextRequest) {
  try {
    const body: LoginRequest = await request.json()
    
    // 验证请求参数
    if (!body.username || !body.password) {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_PARAMS',
          message: '缺少必要参数'
        },
        { status: 400 }
      )
    }
    
    // 验证用户名格式（3-20位，字母数字下划线）
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/
    if (!usernameRegex.test(body.username)) {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_USERNAME',
          message: '用户名格式不正确（3-20位，字母数字下划线）'
        },
        { status: 400 }
      )
    }
    
    const result = await loginUser(body)
    
    if (result.success && result.data?.user) {
      // 生成JWT token
      const jwtSecret = process.env.JWT_SECRET
      if (!jwtSecret) {
        console.error('JWT_SECRET 环境变量未设置')
        return NextResponse.json(
          {
            success: false,
            error: 'CONFIG_ERROR',
            message: '服务器配置错误'
          },
          { status: 500 }
        )
      }
      
      const token = jwt.sign(
        { 
          userId: result.data.user.id,
          username: result.data.user.username
        },
        jwtSecret,
        { 
          expiresIn: '30d' // token 30天有效期，减少频繁登录
        }
      )
      
      // 设置 HTTP-only cookie
      const response = NextResponse.json({
        ...result,
        data: {
          ...result.data,
          token
        }
      }, { status: 200 })
      
      response.cookies.set('auth-token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 30 * 24 * 60 * 60 // 30天
      })
      
      return response
    } else {
      const statusCode = ['USER_NOT_FOUND', 'PASSWORD_INVALID', 'PASSWORD_NOT_SET'].includes(result.error || '') ? 401 : 500
      return NextResponse.json(result, { status: statusCode })
    }
  } catch (error) {
    console.error('用户登录API错误:', error)
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
