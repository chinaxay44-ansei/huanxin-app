import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { registerUser, RegisterRequest } from '@/lib/api/auth'

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<RegisterRequest> & { avatar_url?: string }
    const { username, password, nickname, avatar_url } = body

    if (!username || !password || !nickname) {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_PARAMS',
          message: '缺少必要参数'
        },
        { status: 400 }
      )
    }

    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/
    if (!usernameRegex.test(username)) {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_USERNAME',
          message: '用户名格式不正确（3-20位，字母数字下划线）'
        },
        { status: 400 }
      )
    }

    if (password.length < 6 || password.length > 64) {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_PASSWORD',
          message: '密码长度需在6-64位之间'
        },
        { status: 400 }
      )
    }

    if (nickname.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_NICKNAME',
          message: '昵称不能为空'
        },
        { status: 400 }
      )
    }

    const result = await registerUser({
      username,
      password,
      nickname: nickname.trim(),
      avatar_url
    })

    if (result.success && result.data?.user) {
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
          expiresIn: '30d'
        }
      )

      const response = NextResponse.json(
        {
          ...result,
          data: {
            ...result.data,
            token
          }
        },
        { status: 200 }
      )

      response.cookies.set('auth-token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 30 * 24 * 60 * 60
      })

      return response
    }

    const statusCode = result.error === 'USERNAME_EXISTS' ? 409 : 500
    return NextResponse.json(result, { status: statusCode })
  } catch (error) {
    console.error('用户注册API错误:', error)
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
