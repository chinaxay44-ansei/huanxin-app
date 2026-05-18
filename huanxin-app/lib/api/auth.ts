import { createClient } from '@/lib/supabase/client'
import { createServiceClient } from '@/lib/supabase/server'
import { Database } from '@/lib/types/database'
import bcrypt from 'bcryptjs'
import { ensureOfficialFriend } from '@/lib/api/messages'
import { ensureOfficialMutualFollow } from '@/lib/api/social'

type User = Database['public']['Tables']['users']['Row']
type UserInsert = Database['public']['Tables']['users']['Insert']

export interface AuthResponse {
  success: boolean
  data?: any
  error?: string
  message?: string
}

export interface LoginRequest {
  username: string
  password: string
}

export interface RegisterRequest {
  username: string
  password: string
  nickname: string
  avatar_url?: string
}

export interface SendSmsRequest {
  phone: string
  type: 'register' | 'login' | 'reset_password'
}

export interface VerifyCodeRequest {
  phone: string
  code: string
  type: 'register' | 'login' | 'reset_password'
}

export interface ResetPasswordRequest {
  phone: string
  newPassword: string
  verificationCode: string
}

// 发送短信验证码
export async function sendSmsCode(request: SendSmsRequest): Promise<AuthResponse> {
  try {
    const supabase = createServiceClient()
    const DEFAULT_USER_AVATAR = "/默认头像.png"
    const resolvedAvatarUrl = typeof request.avatar_url === "string" && request.avatar_url.trim().length > 0
      ? request.avatar_url.trim()
      : DEFAULT_USER_AVATAR
    
    // 生成6位随机验证码
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    
    // 验证码有效期5分钟
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString()
    
    // 检查手机号是否已存在（仅注册时检查）
    if (request.type === 'register') {
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('phone', request.phone)
        .single()
      
      if (existingUser) {
        return {
          success: false,
          error: 'PHONE_EXISTS',
          message: '手机号已存在'
        }
      }
    }
    
    // 存储验证码到系统配置表（临时存储）
    const codeKey = `sms_code_${request.phone}_${request.type}`
    await supabase
      .from('system_configs')
      .upsert({
        key: codeKey,
        value: JSON.stringify({ code, expiresAt }),
        value_type: 'json',
        description: `SMS verification code for ${request.phone}`,
        group_name: 'sms_codes'
      })
    
    // TODO: 这里应该调用实际的短信服务API发送验证码
    // 目前只是模拟发送成功
    console.log(`发送验证码 ${code} 到手机号 ${request.phone}`)
    
    return {
      success: true,
      message: '验证码发送成功',
      data: { 
        // 开发环境下返回验证码，生产环境不应返回
        ...(process.env.NODE_ENV === 'development' && { code })
      }
    }
  } catch (error) {
    console.error('发送短信验证码失败:', error)
    return {
      success: false,
      error: 'SMS_SEND_FAILED',
      message: '验证码发送失败'
    }
  }
}

// 验证短信验证码
export async function verifySmsCode(request: VerifyCodeRequest): Promise<AuthResponse> {
  try {
    const supabase = createServiceClient()
    
    const codeKey = `sms_code_${request.phone}_${request.type}`
    
    // 获取存储的验证码
    const { data: configData } = await supabase
      .from('system_configs')
      .select('value')
      .eq('key', codeKey)
      .single()
    
    if (!configData) {
      return {
        success: false,
        error: 'CODE_NOT_FOUND',
        message: '验证码不存在或已过期'
      }
    }
    
    const codeData = JSON.parse(configData.value)
    
    // 检查验证码是否过期
    if (new Date() > new Date(codeData.expiresAt)) {
      // 删除过期的验证码
      await supabase
        .from('system_configs')
        .delete()
        .eq('key', codeKey)
      
      return {
        success: false,
        error: 'CODE_EXPIRED',
        message: '验证码已过期'
      }
    }
    
    // 验证验证码
    if (codeData.code !== request.code) {
      return {
        success: false,
        error: 'CODE_INVALID',
        message: '验证码错误'
      }
    }
    
    // 验证成功，删除验证码
    await supabase
      .from('system_configs')
      .delete()
      .eq('key', codeKey)
    
    return {
      success: true,
      message: '验证码验证成功'
    }
  } catch (error) {
    console.error('验证短信验证码失败:', error)
    return {
      success: false,
      error: 'CODE_VERIFY_FAILED',
      message: '验证码验证失败'
    }
  }
}

// 用户注册
export async function registerUser(request: RegisterRequest): Promise<AuthResponse> {
  try {
    const supabase = createServiceClient()
    
    // 默认头像与兜底头像处理
    const DEFAULT_USER_AVATAR = "/默认头像.png"
    const resolvedAvatarUrl = request.avatar_url && request.avatar_url.trim().length > 0
      ? request.avatar_url.trim()
      : DEFAULT_USER_AVATAR
    
    // 检查用户名或占位手机号是否已存在
    const placeholderPhone = `u_${request.username}`
    const { data: existingUserByUsername } = await supabase
      .from('users')
      .select('id')
      .or(`username.eq.${request.username},phone.eq.${placeholderPhone}`)
      .maybeSingle()
    
    if (existingUserByUsername) {
      return {
        success: false,
        error: 'USERNAME_EXISTS',
        message: '用户名已存在'
      }
    }
    
    // 加密密码
    const passwordHash = await bcrypt.hash(request.password, 12)
    
    // 创建用户
    const userData: UserInsert = {
      // 兼容旧架构：phone 为 NOT NULL UNIQUE，这里使用基于用户名的占位手机号保证唯一
      phone: placeholderPhone,
      username: request.username,
      password_hash: passwordHash,
      nickname: request.nickname,
      avatar_url: resolvedAvatarUrl,
      status: 'active',
      energy_balance: 100,
      is_verified: false
    }
    
    const { data: newUser, error } = await supabase
      .from('users')
      .insert(userData)
      .select()
      .single()
    
    if (error) {
      console.error('创建用户失败:', error)
      return {
        success: false,
        error: 'USER_CREATE_FAILED',
        message: '用户创建失败'
      }
    }
    
    // 创建用户资料
    await supabase
      .from('user_profiles')
      .insert({
        user_id: newUser.id,
        privacy_settings: {
          show_phone: false,
          show_location: false,
          allow_message: true
        },
        social_links: {}
      })
    const officialId = '00000000-0000-0000-0000-000000000001'
    const { data: official } = await supabase
      .from('users')
      .select('id')
      .eq('id', officialId)
      .maybeSingle()
    if (!official) {
      const placeholderPhoneOfficial = `u_official`
      await supabase
        .from('users')
        .insert({ id: officialId as any, phone: placeholderPhoneOfficial, username: 'official', nickname: '焕星官方', status: 'active', is_verified: true, verified_type: 'official' })
    }
    await ensureOfficialMutualFollow(newUser.id)
    await ensureOfficialFriend(newUser.id)

    try {
      const DEFAULT_AVATAR_MALE = 'https://objectstorageapi.hzh.sealos.run/s3k94e4s-hx/初始形象男.png'
      const DEFAULT_AVATAR_FEMALE = 'https://objectstorageapi.hzh.sealos.run/s3k94e4s-hx/初始形象女.png'
      const DEFAULT_OOTD_MALE = 'https://objectstorageapi.hzh.sealos.run/s3k94e4s-hx/初始形象男穿搭.png'
      const DEFAULT_OOTD_FEMALE = 'https://objectstorageapi.hzh.sealos.run/s3k94e4s-hx/初始形象女穿搭.png'

      const { data: av1 } = await supabase
        .from('ai_avatars')
        .insert({ user_id: newUser.id, name: '初始形象男', avatar_url: DEFAULT_AVATAR_MALE, status: 'active', is_active: false })
        .select('id')
        .single()
      const { data: av2 } = await supabase
        .from('ai_avatars')
        .insert({ user_id: newUser.id, name: '初始形象女', avatar_url: DEFAULT_AVATAR_FEMALE, status: 'active', is_active: false })
        .select('id')
        .single()

      if (av1?.id) {
        await supabase
          .from('avatar_outfits')
          .insert({ avatar_id: av1.id, user_id: newUser.id, image_url: DEFAULT_OOTD_MALE, title: '初始穿搭男' })
      }
      if (av2?.id) {
        await supabase
          .from('avatar_outfits')
          .insert({ avatar_id: av2.id, user_id: newUser.id, image_url: DEFAULT_OOTD_FEMALE, title: '初始穿搭女' })
      }
    } catch {}
    
    // 返回用户信息（不包含密码）
    const { password_hash, ...userWithoutPassword } = newUser
    
    return {
      success: true,
      message: '注册成功',
      data: { user: userWithoutPassword }
    }
  } catch (error) {
    console.error('用户注册失败:', error)
    return {
      success: false,
      error: 'REGISTER_FAILED',
      message: '注册失败'
    }
  }
}

// 用户登录
export async function loginUser(request: LoginRequest): Promise<AuthResponse> {
  try {
    const supabase = createServiceClient()
    
    // 查找用户
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', request.username)
      .eq('status', 'active')
      .single()
    
    if (error || !user) {
      return {
        success: false,
        error: 'USER_NOT_FOUND',
        message: '用户不存在或已被禁用'
      }
    }
    
    // 验证密码
    if (!user.password_hash) {
      return {
        success: false,
        error: 'PASSWORD_NOT_SET',
        message: '用户未设置密码'
      }
    }
    
    const isPasswordValid = await bcrypt.compare(request.password, user.password_hash)
    
    if (!isPasswordValid) {
      return {
        success: false,
        error: 'PASSWORD_INVALID',
        message: '密码错误'
      }
    }
    
    // 更新最后登录时间
    await supabase
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', user.id)
    
    // 返回用户信息（不包含密码）
    const { password_hash, ...userWithoutPassword } = user
    
    return {
      success: true,
      message: '登录成功',
      data: { user: userWithoutPassword }
    }
  } catch (error) {
    console.error('用户登录失败:', error)
    return {
      success: false,
      error: 'LOGIN_FAILED',
      message: '登录失败'
    }
  }
}

// 重置密码
export async function resetPassword(request: ResetPasswordRequest): Promise<AuthResponse> {
  try {
    // 先验证验证码
    const codeVerification = await verifySmsCode({
      phone: request.phone,
      code: request.verificationCode,
      type: 'reset_password'
    })
    
    if (!codeVerification.success) {
      return codeVerification
    }
    
    const supabase = createServiceClient()
    
    // 查找用户
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('phone', request.phone)
      .eq('status', 'active')
      .single()
    
    if (!user) {
      return {
        success: false,
        error: 'USER_NOT_FOUND',
        message: '用户不存在'
      }
    }
    
    // 加密新密码
    const passwordHash = await bcrypt.hash(request.newPassword, 12)
    
    // 更新密码
    const { error } = await supabase
      .from('users')
      .update({ 
        password_hash: passwordHash,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
    
    if (error) {
      console.error('重置密码失败:', error)
      return {
        success: false,
        error: 'PASSWORD_RESET_FAILED',
        message: '密码重置失败'
      }
    }
    
    return {
      success: true,
      message: '密码重置成功'
    }
  } catch (error) {
    console.error('重置密码失败:', error)
    return {
      success: false,
      error: 'PASSWORD_RESET_FAILED',
      message: '密码重置失败'
    }
  }
}

// 获取用户信息
export async function getUserInfo(userId: string): Promise<AuthResponse> {
  try {
    const supabase = createServiceClient()
    
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (error || !user) {
      if (error) {
        console.error('getUserInfo 查询错误:', error)
      } else {
        console.warn('getUserInfo 未找到用户，userId=', userId)
      }
      return {
        success: false,
        error: 'USER_NOT_FOUND',
        message: '用户不存在'
      }
    }
    
    // 关联用户资料（单独查询以避免嵌套选择造成的 not single 错误）
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    // 返回用户信息（不包含密码）
    const { password_hash, ...userWithoutPassword } = user
    const userWithProfile = {
      ...userWithoutPassword,
      user_profiles: profile ? [profile] : []
    }
    
    return {
      success: true,
      data: { user: userWithProfile }
    }
  } catch (error) {
    console.error('获取用户信息失败:', error)
    return {
      success: false,
      error: 'GET_USER_FAILED',
      message: '获取用户信息失败'
    }
  }
}

// 通过手机号获取用户信息（用于回退）
export async function getUserInfoByPhone(phone: string): Promise<AuthResponse> {
  try {
    const supabase = createServiceClient()

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('phone', phone)
      .single()

    if (error || !user) {
      if (error) {
        console.error('getUserInfoByPhone 查询错误:', error)
      } else {
        console.warn('getUserInfoByPhone 未找到用户，phone=', phone)
      }
      return {
        success: false,
        error: 'USER_NOT_FOUND',
        message: '用户不存在'
      }
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    const { password_hash, ...userWithoutPassword } = user
    const userWithProfile = {
      ...userWithoutPassword,
      user_profiles: profile ? [profile] : []
    }

    return {
      success: true,
      data: { user: userWithProfile }
    }
  } catch (error) {
    console.error('通过手机号获取用户信息失败:', error)
    return {
      success: false,
      error: 'GET_USER_FAILED',
      message: '获取用户信息失败'
    }
  }
}
