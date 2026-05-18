import { createServiceClient } from '@/lib/supabase/server'

// AI模板相关接口（与数据库设计一致）
export interface AITemplate {
  id: string
  name: string
  description?: string | null
  thumbnail_url: string
  preview_urls?: string[]
  category: string
  sub_category: string
  template_type: string
  tags?: string[]
  is_new: boolean
  is_hot: boolean
  uses_count: number
  energy_cost: number
  config: Record<string, any>
  status: 'active' | 'inactive'
  sort_order: number
  created_at: string
  updated_at: string
}

// AI生成记录接口（ai_generations 表）
export interface AIGeneration {
  id: string
  user_id: string
  template_id?: string | null
  input_type: string
  input_data: Record<string, any>
  source_urls?: string[]
  generation_params?: Record<string, any> | null
  prompt?: string | null
  output_url?: string | null
  output_type?: string | null
  work_id?: string | null
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  error_message?: string | null
  energy_cost: number
  started_at: string
  completed_at?: string | null
  created_at: string
  updated_at?: string | null
}

// AI分身相关接口
export interface AIAvatar {
  id: string
  user_id: string
  name: string
  description: string
  avatar_url?: string
  voice_id?: string
  personality_traits: Record<string, any>
  is_active: boolean
  created_at: string
  updated_at: string
}

// 获取AI模板列表
export async function getAITemplates(category?: string, limit = 20, offset = 0, sub_category?: string) {
  try {
    const supabase = createServiceClient()
    
    let query = supabase
      .from('ai_templates')
      .select('*')
      .eq('status', 'active')
      .order('sort_order', { ascending: false })
      .order('uses_count', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    
    if (category) {
      query = query.eq('category', category)
    }
    if (sub_category) {
      query = query.eq('sub_category', sub_category)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('获取AI模板列表错误:', error)
      return {
        success: false,
        error: 'DATABASE_ERROR',
        message: '获取模板列表失败'
      }
    }
    
    return {
      success: true,
      data: data as unknown as AITemplate[]
    }
  } catch (error) {
    console.error('获取AI模板列表异常:', error)
    return {
      success: false,
      error: 'INTERNAL_ERROR',
      message: '服务器内部错误'
    }
  }
}

// 获取AI模板详情
export async function getAITemplateDetail(templateId: string) {
  try {
    const supabase = createServiceClient()
    
    const { data, error } = await supabase
      .from('ai_templates')
      .select('*')
      .eq('id', templateId)
      .eq('status', 'active')
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') {
        return {
          success: false,
          error: 'TEMPLATE_NOT_FOUND',
          message: '模板不存在'
        }
      }
      console.error('获取AI模板详情错误:', error)
      return {
        success: false,
        error: 'DATABASE_ERROR',
        message: '获取模板详情失败'
      }
    }
    
    return {
      success: true,
      data: data as unknown as AITemplate
    }
  } catch (error) {
    console.error('获取AI模板详情异常:', error)
    return {
      success: false,
      error: 'INTERNAL_ERROR',
      message: '服务器内部错误'
    }
  }
}

// 创建AI生成任务
export async function createAIGenerationTask(userId: string, taskData: {
  template_id: string
  prompt: string
  parameters?: Record<string, any>
  source_urls?: string[]
}) {
  try {
    const supabase = createServiceClient()
    
    // 验证模板是否存在
    const templateResult = await getAITemplateDetail(taskData.template_id)
    if (!templateResult.success) {
      return templateResult
    }
    const energyCost = (templateResult.data as AITemplate).energy_cost || 20
    
    const { data, error } = await supabase
      .from('ai_generations')
      .insert({
        user_id: userId,
        template_id: taskData.template_id,
        input_type: 'image',
        input_data: {},
        source_urls: taskData.source_urls ?? [],
        generation_params: taskData.parameters ?? {},
        prompt: taskData.prompt,
        status: 'pending',
        progress: 0,
        energy_cost: energyCost,
        started_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (error) {
      console.error('创建AI生成任务错误:', error)
      return {
        success: false,
        error: 'DATABASE_ERROR',
        message: '创建生成任务失败'
      }
    }
    
    // TODO: 这里应该调用实际的AI生成服务
    // 暂时模拟异步处理
    setTimeout(async () => {
      await updateAIGenerationTaskStatus(data.id, 'processing', { progress: 30 })
      // 模拟生成完成
      setTimeout(async () => {
        await updateAIGenerationTaskStatus(data.id, 'completed', {
          output_url: `https://example.com/generated/${data.id}.jpg`,
          progress: 100
        })
      }, 5000)
    }, 1000)
    
    return {
      success: true,
      data: data as unknown as AIGeneration
    }
  } catch (error) {
    console.error('创建AI生成任务异常:', error)
    return {
      success: false,
      error: 'INTERNAL_ERROR',
      message: '服务器内部错误'
    }
  }
}

// 更新AI生成任务状态
export async function updateAIGenerationTaskStatus(
  taskId: string,
  status: AIGeneration['status'],
  updates?: {
    output_url?: string
    error_message?: string
    progress?: number
  }
) {
  try {
    const supabase = createServiceClient()
    
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    }
    
    if (updates?.output_url) {
      updateData.output_url = updates.output_url
    }
    
    if (updates?.error_message) {
      updateData.error_message = updates.error_message
    }
    if (typeof updates?.progress === 'number') {
      updateData.progress = updates.progress
    }
    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString()
    }
    
    const { data, error } = await supabase
      .from('ai_generations')
      .update(updateData)
      .eq('id', taskId)
      .select()
      .single()
    
    if (error) {
      console.error('更新AI生成任务状态错误:', error)
      return {
        success: false,
        error: 'DATABASE_ERROR',
        message: '更新任务状态失败'
      }
    }
    
    return {
      success: true,
      data: data as unknown as AIGeneration
    }
  } catch (error) {
    console.error('更新AI生成任务状态异常:', error)
    return {
      success: false,
      error: 'INTERNAL_ERROR',
      message: '服务器内部错误'
    }
  }
}

// 获取用户的AI生成任务列表
export async function getUserAIGenerationTasks(userId: string, limit = 20, offset = 0) {
  try {
    const supabase = createServiceClient()
    
    const { data, error } = await supabase
      .from('ai_generations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    
    if (error) {
      console.error('获取用户AI生成任务列表错误:', error)
      return {
        success: false,
        error: 'DATABASE_ERROR',
        message: '获取任务列表失败'
      }
    }
    
    return {
      success: true,
      data: data as unknown as AIGeneration[]
    }
  } catch (error) {
    console.error('获取用户AI生成任务列表异常:', error)
    return {
      success: false,
      error: 'INTERNAL_ERROR',
      message: '服务器内部错误'
    }
  }
}

// 获取AI生成任务详情
export async function getAIGenerationTaskDetail(taskId: string, userId?: string) {
  try {
    const supabase = createServiceClient()
    
    let query = supabase
      .from('ai_generations')
      .select('*')
      .eq('id', taskId)
    
    if (userId) {
      query = query.eq('user_id', userId)
    }
    
    const { data, error } = await query.single()
    
    if (error) {
      if (error.code === 'PGRST116') {
        return {
          success: false,
          error: 'TASK_NOT_FOUND',
          message: '任务不存在'
        }
      }
      console.error('获取AI生成任务详情错误:', error)
      return {
        success: false,
        error: 'DATABASE_ERROR',
        message: '获取任务详情失败'
      }
    }
    
    return {
      success: true,
      data: data as unknown as AIGeneration
    }
  } catch (error) {
    console.error('获取AI生成任务详情异常:', error)
    return {
      success: false,
      error: 'INTERNAL_ERROR',
      message: '服务器内部错误'
    }
  }
}

// 创建AI分身
export async function createAIAvatar(userId: string, avatarData: {
  name: string
  description: string
  avatar_url?: string
  voice_id?: string
  personality_traits?: Record<string, any>
}) {
  try {
    const supabase = createServiceClient()
    
    const { data, error } = await supabase
      .from('ai_avatars')
      .insert({
        user_id: userId,
        name: avatarData.name,
        description: avatarData.description,
        avatar_url: avatarData.avatar_url,
        voice_id: avatarData.voice_id,
        personality_traits: avatarData.personality_traits || {},
        is_active: true
      })
      .select()
      .single()
    
    if (error) {
      console.error('创建AI分身错误:', error)
      return {
        success: false,
        error: 'DATABASE_ERROR',
        message: '创建AI分身失败'
      }
    }
    
    return {
      success: true,
      data: data as AIAvatar
    }
  } catch (error) {
    console.error('创建AI分身异常:', error)
    return {
      success: false,
      error: 'INTERNAL_ERROR',
      message: '服务器内部错误'
    }
  }
}

// 获取我的AI分身列表
export async function getUserAIAvatars(userId: string, limit = 50, offset = 0) {
  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('ai_avatars')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('获取AI分身列表错误:', error)
      return {
        success: false,
        error: 'DATABASE_ERROR',
        message: '获取分身列表失败'
      }
    }

    return {
      success: true,
      data: data as AIAvatar[]
    }
  } catch (error) {
    console.error('获取AI分身列表异常:', error)
    return {
      success: false,
      error: 'INTERNAL_ERROR',
      message: '服务器内部错误'
    }
  }
}

// 更新AI分身
export async function updateAIAvatar(userId: string, avatarId: string, updates: {
  name?: string
  description?: string
  avatar_url?: string
  voice_id?: string
  personality_traits?: Record<string, any>
  is_active?: boolean
}) {
  try {
    const supabase = createServiceClient()
    
    const { data, error } = await supabase
      .from('ai_avatars')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', avatarId)
      .eq('user_id', userId)
      .select()
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') {
        return {
          success: false,
          error: 'AVATAR_NOT_FOUND',
          message: 'AI分身不存在'
        }
      }
      console.error('更新AI分身错误:', error)
      return {
        success: false,
        error: 'DATABASE_ERROR',
        message: '更新AI分身失败'
      }
    }
    
    return {
      success: true,
      data: data as AIAvatar
    }
  } catch (error) {
    console.error('更新AI分身异常:', error)
    return {
      success: false,
      error: 'INTERNAL_ERROR',
      message: '服务器内部错误'
    }
  }
}

// 删除AI分身
export async function deleteAIAvatar(userId: string, avatarId: string) {
  try {
    const supabase = createServiceClient()
    
    const { error } = await supabase
      .from('ai_avatars')
      .update({ is_active: false })
      .eq('id', avatarId)
      .eq('user_id', userId)
    
    if (error) {
      console.error('删除AI分身错误:', error)
      return {
        success: false,
        error: 'DATABASE_ERROR',
        message: '删除AI分身失败'
      }
    }
    
    return {
      success: true,
      message: 'AI分身已删除'
    }
  } catch (error) {
    console.error('删除AI分身异常:', error)
    return {
      success: false,
      error: 'INTERNAL_ERROR',
      message: '服务器内部错误'
    }
  }
}