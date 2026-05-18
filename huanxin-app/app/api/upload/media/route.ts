import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/middleware/auth'
import { uploadWorkMedia } from '@/lib/api/upload'

// POST /api/upload/media - 上传作品媒体文件
export async function POST(request: NextRequest) {
  try {
    // 验证用户身份
    const authResult = requireAuth(request)
    if ('error' in authResult) {
      return NextResponse.json(authResult.error, { status: 401 })
    }
    
    const formData = await request.formData()
    const file = formData.get('file') as File
    const type = formData.get('type') as string // 'image' 或 'video'
    
    if (!file) {
      return NextResponse.json({
        success: false,
        error: 'NO_FILE',
        message: '请选择要上传的文件'
      }, { status: 400 })
    }
    
    if (!type || !['image', 'video'].includes(type)) {
      return NextResponse.json({
        success: false,
        error: 'INVALID_TYPE',
        message: '文件类型必须是image或video'
      }, { status: 400 })
    }
    
    // 验证文件类型
    if (type === 'image') {
      const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
      if (!allowedImageTypes.includes(file.type)) {
        return NextResponse.json({
          success: false,
          error: 'INVALID_FILE_TYPE',
          message: '图片格式不支持，请上传JPEG、PNG、GIF或WebP格式的图片'
        }, { status: 400 })
      }
    } else if (type === 'video') {
      const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime']
      if (!allowedVideoTypes.includes(file.type)) {
        return NextResponse.json({
          success: false,
          error: 'INVALID_FILE_TYPE',
          message: '视频格式不支持，请上传MP4、WebM、OGG或MOV格式的视频'
        }, { status: 400 })
      }
    }
    
    // 验证文件大小
    const maxSize = type === 'image' ? 10 * 1024 * 1024 : 100 * 1024 * 1024 // 图片10MB，视频100MB
    if (file.size > maxSize) {
      const maxSizeText = type === 'image' ? '10MB' : '100MB'
      return NextResponse.json({
        success: false,
        error: 'FILE_TOO_LARGE',
        message: `文件大小不能超过${maxSizeText}`
      }, { status: 400 })
    }
    
    // 上传文件
    const result = await uploadWorkMedia(file, authResult.user.userId, type as 'image' | 'video')
    
    if (!result.success) {
      return NextResponse.json(result, { status: 400 })
    }
    
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('上传媒体文件API错误:', error)
    return NextResponse.json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: '服务器内部错误'
    }, { status: 500 })
  }
}