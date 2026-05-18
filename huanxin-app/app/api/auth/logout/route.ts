import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // 清除认证 cookie
    const response = NextResponse.json(
      {
        success: true,
        message: '登出成功'
      },
      { status: 200 }
    )
    
    response.cookies.set('auth-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0 // 立即过期
    })
    
    return response
  } catch (error) {
    console.error('用户登出API错误:', error)
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