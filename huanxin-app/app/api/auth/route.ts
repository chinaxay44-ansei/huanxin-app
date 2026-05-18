import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// 发送OTP验证码
export async function POST(request: NextRequest) {
  try {
    const { phone } = await request.json()
    
    if (!phone) {
      return NextResponse.json(
        { error: "手机号不能为空" },
        { status: 400 }
      )
    }
    
    // 验证手机号格式
    const phoneRegex = /^1[3-9]\d{9}$/
    if (!phoneRegex.test(phone)) {
      return NextResponse.json(
        { error: "手机号格式不正确" },
        { status: 400 }
      )
    }
    
    // 创建服务端Supabase客户端
    const supabase = createClient()
    
    // 发送OTP验证码
    const { error } = await supabase.auth.signInWithOtp({
      phone,
      options: {
        channel: 'sms'
      }
    })
    
    if (error) {
      console.error("OTP发送错误:", error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("API错误:", error)
    return NextResponse.json(
      { error: "服务器错误" },
      { status: 500 }
    )
  }
}

// 验证用户会话
export async function GET(request: NextRequest) {
  try {
    // 创建服务端Supabase客户端
    const supabase = createClient()
    
    // 获取当前用户
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      )
    }
    
    // 获取用户详细信息
    const { data: profile, error: profileError } = await supabase
      .rpc('get_current_user')
      .single()
    
    if (profileError) {
      console.error("获取用户资料错误:", profileError)
      return NextResponse.json(
        { authenticated: true, user: { id: user.id } },
        { status: 200 }
      )
    }
    
    return NextResponse.json({
      authenticated: true,
      user: profile
    })
  } catch (error) {
    console.error("API错误:", error)
    return NextResponse.json(
      { error: "服务器错误" },
      { status: 500 }
    )
  }
}