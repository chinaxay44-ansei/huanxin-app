import { uploadToCos, deleteCosObjects } from '@/lib/cos'

export interface UploadResponse {
  success: boolean
  data?: {
    url: string
    path: string
  }
  error?: string
  message?: string
}

// 上传头像
export async function uploadAvatar(file: File, userId: string): Promise<UploadResponse> {
  try {
    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      return {
        success: false,
        error: 'INVALID_FILE_TYPE',
        message: '只支持 JPEG、PNG、WebP、GIF 格式的图片'
      }
    }
    
    // 验证文件大小 (5MB)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      return {
        success: false,
        error: 'FILE_TOO_LARGE',
        message: '文件大小不能超过5MB'
      }
    }
    
    // 生成文件名（兼容没有扩展名的情况）
    const nameExt = file.name.includes('.') ? file.name.split('.').pop() : undefined
    const typeExt = (() => {
      switch (file.type) {
        case 'image/jpeg': return 'jpg'
        case 'image/png': return 'png'
        case 'image/webp': return 'webp'
        case 'image/gif': return 'gif'
        default: return 'bin'
      }
    })()
    const fileExt = nameExt || typeExt
    const fileName = `${userId}_${Date.now()}.${fileExt}`
    const filePath = `avatars/${fileName}`

    const buffer = Buffer.from(await file.arrayBuffer())
    const { url } = await uploadToCos({
      bucketPrefix: 'work-media',
      objectPath: filePath,
      body: buffer,
      contentType: file.type || 'application/octet-stream',
    })
    
    return {
      success: true,
      data: {
        url,
        path: filePath
      },
      message: '头像上传成功'
    }
  } catch (error) {
    console.error('头像上传服务错误:', error)
    return {
      success: false,
      error: 'INTERNAL_ERROR',
      message: '服务器内部错误'
    }
  }
}

// 上传作品媒体文件
export async function uploadWorkMedia(file: File, userId: string, workId?: string): Promise<UploadResponse> {
  try {
    // 验证文件类型
    const allowedTypes = [
      // 图片
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
      // 视频
      'video/mp4', 'video/webm', 'video/quicktime'
    ]
    
    if (!allowedTypes.includes(file.type)) {
      return {
        success: false,
        error: 'INVALID_FILE_TYPE',
        message: '只支持图片（JPEG、PNG、WebP、GIF）和视频（MP4、WebM、MOV）格式'
      }
    }
    
    // 验证文件大小
    const isVideo = file.type.startsWith('video/')
    const maxSize = isVideo ? 100 * 1024 * 1024 : 10 * 1024 * 1024 // 视频100MB，图片10MB
    
    if (file.size > maxSize) {
      const maxSizeText = isVideo ? '100MB' : '10MB'
      return {
        success: false,
        error: 'FILE_TOO_LARGE',
        message: `文件大小不能超过${maxSizeText}`
      }
    }
    
    // 生成文件名
    const fileExt = file.name.split('.').pop()
    const timestamp = Date.now()
    const fileName = workId 
      ? `${workId}_${timestamp}.${fileExt}`
      : `${userId}_${timestamp}.${fileExt}`
    
    const folder = isVideo ? 'videos' : 'images'
    const filePath = `works/${folder}/${fileName}`

    const buffer = Buffer.from(await file.arrayBuffer())
    const { url } = await uploadToCos({
      bucketPrefix: 'work-media',
      objectPath: filePath,
      body: buffer,
      contentType: file.type || 'application/octet-stream',
    })
    
    return {
      success: true,
      data: {
        url,
        path: filePath
      },
      message: '媒体文件上传成功'
    }
  } catch (error) {
    console.error('作品媒体文件上传服务错误:', error)
    return {
      success: false,
      error: 'INTERNAL_ERROR',
      message: '服务器内部错误'
    }
  }
}

// 删除文件
export async function deleteFile(filePath: string): Promise<UploadResponse> {
  try {
    const normalized = (() => {
      if (!filePath) return ''
      const unixPath = filePath.replaceAll('\\', '/')
      let trimmed = unixPath
      while (trimmed.startsWith('/')) {
        trimmed = trimmed.slice(1)
      }
      return trimmed
    })()

    await deleteCosObjects([`work-media/${normalized}`])
    return {
      success: true,
      message: '文件删除成功'
    }
  } catch (error) {
    console.error('文件删除服务错误:', error)
    return {
      success: false,
      error: 'INTERNAL_ERROR',
      message: '服务器内部错误'
    }
  }
}
