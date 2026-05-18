import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/middleware/auth'
import { uploadAvatar } from '@/lib/api/upload'
import { updateUserProfile } from '@/lib/api/users'

export async function POST(request: NextRequest) {
  try {
    const authResult = requireAuth(request)
    
    if ('error' in authResult) {
      return NextResponse.json(authResult.error, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('avatar') as File
    
    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_PARAMS',
          message: '请选择要上传的头像文件'
        },
        { status: 400 }
      )
    }
    
    // 上传头像文件
    const uploadResult = await uploadAvatar(file, authResult.user.userId)
    
    if (!uploadResult.success) {
      return NextResponse.json(uploadResult, { 
        status: uploadResult.error === 'INVALID_FILE_TYPE' || uploadResult.error === 'FILE_TOO_LARGE' ? 400 : 500 
      })
    }
    
    // 更新用户资料中的头像URL
    const updateResult = await updateUserProfile(request, authResult.user.userId, {
      avatar_url: uploadResult.data!.url
    })
    
    if (!updateResult.success) {
      // 上传成功但更新资料失败，仍然返回上传结果
      console.error('更新头像URL失败:', updateResult.error)
    }
    
    return NextResponse.json(
      {
        success: true,
        data: {
          avatar_url: uploadResult.data!.url,
          path: uploadResult.data!.path
        },
        message: '头像上传成功'
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('头像上传API错误:', error)
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