import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/middleware/auth'
import { updateAIAvatar, deleteAIAvatar } from '@/lib/api/ai'

interface RouteParams {
  params: {
    avatarId: string
  }
}

// PUT /api/ai/avatars/[avatarId] - 更新AI分身
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { avatarId } = params
    
    if (!avatarId) {
      return NextResponse.json({
        success: false,
        error: 'MISSING_AVATAR_ID',
        message: '请提供分身ID'
      }, { status: 400 })
    }
    
    // 验证用户身份
    const authResult = requireAuth(request)
    if ('error' in authResult) {
      return NextResponse.json(authResult.error, { status: 401 })
    }
    
    const body = await request.json()
    const { name, description, avatar_url, voice_id, personality_traits, is_active } = body
    
    const updates: any = {}
    
    if (name !== undefined) {
      if (!name || name.trim().length === 0) {
        return NextResponse.json({
          success: false,
          error: 'INVALID_NAME',
          message: '分身名称不能为空'
        }, { status: 400 })
      }
      
      if (name.length > 50) {
        return NextResponse.json({
          success: false,
          error: 'INVALID_NAME',
          message: '分身名称不能超过50个字符'
        }, { status: 400 })
      }
      
      updates.name = name.trim()
    }
    
    if (description !== undefined) {
      if (!description || description.trim().length === 0) {
        return NextResponse.json({
          success: false,
          error: 'INVALID_DESCRIPTION',
          message: '分身描述不能为空'
        }, { status: 400 })
      }
      
      if (description.length > 500) {
        return NextResponse.json({
          success: false,
          error: 'INVALID_DESCRIPTION',
          message: '分身描述不能超过500个字符'
        }, { status: 400 })
      }
      
      updates.description = description.trim()
    }
    
    if (avatar_url !== undefined) {
      updates.avatar_url = avatar_url
    }
    
    if (voice_id !== undefined) {
      updates.voice_id = voice_id
    }
    
    if (personality_traits !== undefined) {
      updates.personality_traits = personality_traits
    }
    
    if (is_active !== undefined) {
      updates.is_active = is_active
    }
    
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({
        success: false,
        error: 'NO_UPDATES',
        message: '没有提供要更新的字段'
      }, { status: 400 })
    }
    
    const result = await updateAIAvatar(authResult.user.userId, avatarId, updates)
    
    if (!result.success) {
      const statusCode = result.error === 'AVATAR_NOT_FOUND' ? 404 : 400
      return NextResponse.json(result, { status: statusCode })
    }
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('更新AI分身API错误:', error)
    return NextResponse.json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: '服务器内部错误'
    }, { status: 500 })
  }
}

// DELETE /api/ai/avatars/[avatarId] - 删除AI分身
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { avatarId } = params
    
    if (!avatarId) {
      return NextResponse.json({
        success: false,
        error: 'MISSING_AVATAR_ID',
        message: '请提供分身ID'
      }, { status: 400 })
    }
    
    // 验证用户身份
    const authResult = requireAuth(request)
    if ('error' in authResult) {
      return NextResponse.json(authResult.error, { status: 401 })
    }
    
    const result = await deleteAIAvatar(authResult.user.userId, avatarId)
    
    if (!result.success) {
      return NextResponse.json(result, { status: 400 })
    }
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('删除AI分身API错误:', error)
    return NextResponse.json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: '服务器内部错误'
    }, { status: 500 })
  }
}