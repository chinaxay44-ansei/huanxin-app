import { createServiceClient } from '@/lib/supabase/server'

export interface Conversation {
  id: string
  type?: 'direct' | 'system'
  status?: 'active' | 'archived' | 'blocked'
  last_message?: Message
  unread_count?: number
  participant_1_id?: string
  participant_2_id?: string
  last_message_content?: string
  last_message_at?: string
  last_sender_id?: string
  last_message_id?: string | null
  last_message_type?: string | null
  last_message_media_url?: string | null
  created_at: string
  updated_at: string
  other_user?: {
    id: string
    nickname: string
    avatar_url?: string | null
  }
  is_mutual?: boolean
}

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  message_type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'system'
  media_url?: string | null
  media_type?: string | null
  media_size?: number | null
  media_name?: string | null
  reply_to_message_id?: string | null
  status?: 'sent' | 'delivered' | 'read'
  is_recalled?: boolean
  recalled_at?: string | null
  delivered_at?: string | null
  read_at?: string | null
  metadata?: Record<string, any> | null
  client_message_id?: string | null
  is_read: boolean
  created_at: string
  updated_at?: string
  receiver_id?: string
  sender?: {
    id: string
    nickname: string
    avatar_url?: string | null
  }
}

export interface Notification {
  id: string
  user_id: string
  type: 'like' | 'comment' | 'follow' | 'message' | 'system'
  title: string
  content: string
  data?: Record<string, any>
  is_read: boolean
  created_at: string
}

export async function createPrivateConversation(userId: string, targetUserId: string, authToken?: string) {
  try {
    const supabase = createServiceClient({ jwt: authToken, forceServiceRole: true })

    // 自己不能和自己创建会话
    if (!targetUserId || userId === targetUserId) {
      return { success: false, error: 'INVALID_TARGET', message: '不能与自己创建会话' }
    }

    // 确认目标用户存在
    const { data: targetUser, error: targetErr } = await supabase
      .from('users')
      .select('id, nickname, avatar_url')
      .eq('id', targetUserId)
      .maybeSingle()
    if (targetErr && targetErr.code !== 'PGRST116') {
      console.error('查询目标用户失败:', targetErr)
    }
    if (!targetUser) {
      return { success: false, error: 'TARGET_NOT_FOUND', message: '目标用户不存在' }
    }

    // 确保 participant_1_id < participant_2_id (数据库约束要求)
    const [p1, p2] = userId < targetUserId ? [userId, targetUserId] : [targetUserId, userId]
    const direct_key = `${p1}:${p2}`

    // 先尝试查找已存在的会话 (包括使用 direct_key 查找)
    const { data: existing } = await supabase
      .from('conversations')
      .select('*')
      .eq('direct_key', direct_key)
      .eq('type', 'direct')
      .is('deleted_at', null)
      .maybeSingle()

    if (existing) {
      // 如果会话被归档或阻止，重新激活
      if (existing.status !== 'active') {
        const { data: updated } = await supabase
          .from('conversations')
          .update({ status: 'active', updated_at: new Date().toISOString() })
          .eq('id', existing.id)
          .select('*')
          .single()
        return { success: true, data: (updated || existing) as Conversation, message: '会话已存在' }
      }
      // 会话已存在且正常,直接返回
      return { success: true, data: existing as Conversation, message: '会话已存在' }
    }

    // 创建新会话
    const { data: created, error: createError } = await supabase
      .from('conversations')
      .insert({
        participant_1_id: p1,
        participant_2_id: p2,
        initiator_id: userId,
        type: 'direct',
        status: 'active',
        unread_count_p1: 0,
        unread_count_p2: 0,
        metadata: {},
      })
      .select('*')
      .maybeSingle()

    if (createError) {
      // 可能是并发创建导致唯一约束冲突,再次尝试查询
      if (createError.code === '23505') {
        // 等待一小段时间后重试查询
        await new Promise(resolve => setTimeout(resolve, 100))
        const { data: retry } = await supabase
          .from('conversations')
          .select('*')
          .eq('direct_key', direct_key)
          .eq('type', 'direct')
          .is('deleted_at', null)
          .maybeSingle()
        if (retry) {
          return { success: true, data: retry as Conversation, message: '会话已存在' }
        }
      }
      console.error('createPrivateConversation error', createError)
      return { success: false, error: 'DATABASE_ERROR', message: `创建会话失败: ${createError.message}` }
    }

    if (!created) {
      return { success: false, error: 'DATABASE_ERROR', message: '创建会话失败，未返回数据' }
    }

    return { success: true, data: created as Conversation, message: '会话创建成功' }
  } catch (error) {
    console.error('createPrivateConversation exception:', error)
    return { success: false, error: 'INTERNAL_ERROR', message: '服务器内部错误' }
  }
}

export async function getUserConversations(userId: string, limit = 20, offset = 0, authToken?: string) {
  try {
    const supabase = createServiceClient({ jwt: authToken, forceServiceRole: true })

    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .or(`participant_1_id.eq.${userId},participant_2_id.eq.${userId}`)
      .eq('status', 'active')
      .eq('type', 'direct')
      .is('deleted_at', null)
      .order('last_message_at', { ascending: false, nullsLast: true })
      .order('updated_at', { ascending: false, nullsLast: true })
      .range(offset, offset + limit - 1)
    if (error) {
      return { success: false, error: 'DATABASE_ERROR', message: '获取会话列表失败' }
    }

    const conversations = data || []
    const conversationIds = conversations.map((c) => c.id)
    const otherIds = conversations
      .map((c) => (c.participant_1_id === userId ? c.participant_2_id : c.participant_1_id))
      .filter(Boolean) as string[]

    const otherUsersMap = new Map<string, any>()
    if (otherIds.length > 0) {
      const { data: others } = await supabase
        .from('users')
        .select('id, nickname, avatar_url')
        .in('id', otherIds)
      ;(others || []).forEach((u: any) => otherUsersMap.set(u.id, u))
    }

    const latestMap = new Map<string, any>()
    if (conversationIds.length > 0) {
      const { data: latest } = await supabase
        .from('messages')
        .select('id, conversation_id, sender_id, content, message_type, media_url, is_recalled, created_at, status, delivered_at')
        .in('conversation_id', conversationIds)
        .order('conversation_id', { ascending: true })
        .order('created_at', { ascending: false })
      if (latest) {
        for (const row of latest) {
          if (!latestMap.has(row.conversation_id)) {
            latestMap.set(row.conversation_id, row)
          }
        }
      }
    }

    const followingSet = new Set<string>()
    const followersSet = new Set<string>()
    if (otherIds.length > 0) {
      const { data: followings } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', userId)
        .in('following_id', otherIds)
      const { data: followers } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('following_id', userId)
        .in('follower_id', otherIds)
      ;(followings || []).forEach((f: any) => followingSet.add(f.following_id))
      ;(followers || []).forEach((f: any) => followersSet.add(f.follower_id))
    }

    const withDetails = conversations.map((c) => {
      const otherId = c.participant_1_id === userId ? c.participant_2_id : c.participant_1_id
      const unread = c.participant_1_id === userId ? c.unread_count_p1 || 0 : c.unread_count_p2 || 0
      const latest = latestMap.get(c.id)
      const lastFromCache =
        c.last_message_id && c.last_message_at
          ? {
              id: c.last_message_id,
              conversation_id: c.id,
              sender_id: c.last_sender_id,
              content: c.last_message_content || '',
              message_type: (c.last_message_type as Message['message_type']) || 'text',
              media_url: c.last_message_media_url || undefined,
              created_at: c.last_message_at,
            }
          : c.last_message_content && c.last_message_at
            ? {
                id: 'preview',
                conversation_id: c.id,
                sender_id: c.last_sender_id,
                content: c.last_message_content,
                message_type: 'text',
                created_at: c.last_message_at,
              }
            : null
      return {
        ...c,
        last_message: latest || lastFromCache,
        unread_count: unread,
        other_user: otherId ? otherUsersMap.get(otherId) : null,
        is_mutual: otherId ? followingSet.has(otherId) && followersSet.has(otherId) : false,
      }
    })
    return { success: true, data: withDetails as Conversation[] }
  } catch (error) {
    return { success: false, error: 'INTERNAL_ERROR', message: '服务器内部错误' }
  }
}

export async function sendMessage(
  userId: string,
  messageData: {
    conversation_id: string
    content: string
    message_type?: Message['message_type']
    media_url?: string
    media_type?: string
    media_size?: number
    media_name?: string
    reply_to?: string
    client_message_id?: string
    metadata?: Record<string, any>
  },
  authToken?: string
) {
  try {
    const supabase = createServiceClient({ jwt: authToken, forceServiceRole: true })
    
    // 查询会话
    const { data: convo, error: convoError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', messageData.conversation_id)
      .is('deleted_at', null)
      .maybeSingle()
    
    if (convoError && convoError.code !== 'PGRST116') {
      console.error('查询会话失败:', convoError)
      return { success: false, error: 'DATABASE_ERROR', message: `查询会话失败: ${convoError.message}` }
    }
    if (!convo) {
      return { success: false, error: 'CONVERSATION_NOT_FOUND', message: '会话不存在' }
    }
    if (convo.status === 'blocked') {
      return { success: false, error: 'CONVERSATION_BLOCKED', message: '会话已被限制发送' }
    }
    if (convo.participant_1_id !== userId && convo.participant_2_id !== userId) {
      return { success: false, error: 'NOT_PARTICIPANT', message: '您不是此会话的参与者' }
    }
    
    const receiverId = convo.participant_1_id === userId ? convo.participant_2_id : convo.participant_1_id
    
    // 如果回复某条消息，验证该消息存在
    if (messageData.reply_to) {
      const { data: ref, error: refErr } = await supabase
        .from('messages')
        .select('id')
        .eq('id', messageData.reply_to)
        .eq('conversation_id', messageData.conversation_id)
        .maybeSingle()
      if (refErr || !ref) {
        return { success: false, error: 'REPLY_MESSAGE_NOT_FOUND', message: '被回复的消息不存在' }
      }
    }
    
    const cleanContent = typeof messageData.content === 'string' ? messageData.content.trim() : ''
    const msgType = messageData.message_type || 'text'
    
    // 插入消息
    const { data: msg, error: msgErr } = await supabase
      .from('messages')
      .insert({
        conversation_id: messageData.conversation_id,
        sender_id: userId,
        content: cleanContent,
        message_type: msgType,
        media_url: messageData.media_url || null,
        media_type: messageData.media_type || null,
        media_size: messageData.media_size || null,
        media_name: messageData.media_name || null,
        reply_to_message_id: messageData.reply_to || null,
        client_message_id: messageData.client_message_id || null,
        metadata: messageData.metadata || {},
        status: 'sent',
        is_read: false,
        is_recalled: false,
        delivered_at: new Date().toISOString(),
      })
      .select('*')
      .single()
    
    if (msgErr) {
      console.error('发送消息失败:', msgErr)
      return { success: false, error: 'DATABASE_ERROR', message: `发送消息失败: ${msgErr.message}` }
    }

    // 生成预览文本
    const previewText = (msgType: Message['message_type'], text: string) => {
      if (msgType === 'text') return text || ''
      if (msgType === 'image') return '[图片]'
      if (msgType === 'video') return '[视频]'
      if (msgType === 'audio') return '[语音]'
      if (msgType === 'file') return '[文件]'
      return '[消息]'
    }

    // 更新会话最后消息和未读数
    const unread_p1 = convo.unread_count_p1 || 0
    const unread_p2 = convo.unread_count_p2 || 0
    const nowUnread =
      receiverId === convo.participant_1_id 
        ? { unread_count_p1: unread_p1 + 1 } 
        : { unread_count_p2: unread_p2 + 1 }

    const { error: updateErr } = await supabase
      .from('conversations')
      .update({
        last_message_content: previewText(msgType, cleanContent),
        last_message_at: msg.created_at,
        last_sender_id: userId,
        last_message_id: msg.id,
        last_message_type: msgType,
        last_message_media_url: msg.media_url || null,
        updated_at: new Date().toISOString(),
        status: 'active', // 确保会话是活跃状态
        ...nowUnread,
      })
      .eq('id', messageData.conversation_id)

    if (updateErr) {
      console.error('更新会话失败:', updateErr)
      // 消息已发送，更新失败不影响返回结果
    }

    return { success: true, data: { ...msg, receiver_id: receiverId } as Message }
  } catch (error) {
    console.error('sendMessage exception:', error)
    return { success: false, error: 'INTERNAL_ERROR', message: '服务器内部错误' }
  }
}

export async function getConversationMessages(userId: string, conversationId: string, limit = 20, offset = 0, authToken?: string) {
  try {
    const supabase = createServiceClient({ jwt: authToken, forceServiceRole: true })
    
    // 查询会话
    const { data: convo, error: convoError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .is('deleted_at', null)
      .maybeSingle()
    
    if (convoError && convoError.code !== 'PGRST116') {
      console.error('查询会话失败:', convoError)
      return { success: false, error: 'DATABASE_ERROR', message: `查询会话失败: ${convoError.message}` }
    }
    if (!convo) {
      return { success: false, error: 'CONVERSATION_NOT_FOUND', message: '会话不存在' }
    }
    if (convo.participant_1_id !== userId && convo.participant_2_id !== userId) {
      return { success: false, error: 'NOT_PARTICIPANT', message: '您不是此会话的参与者' }
    }
    
    // 查询消息列表
    const { data, error } = await supabase
      .from('messages')
      .select(
        `id, conversation_id, sender_id, content, message_type, media_url, media_type, media_size, media_name, is_read, is_recalled, recalled_at, created_at, updated_at, reply_to_message_id, read_at, metadata, client_message_id, status, delivered_at`
      )
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    
    if (error) {
      console.error('获取消息列表失败:', error)
      return { success: false, error: 'DATABASE_ERROR', message: `获取消息列表失败: ${error.message}` }
    }

    // 获取发送者信息
    const senderIds = Array.from(new Set((data || []).map((m: any) => m.sender_id).filter(Boolean)))
    const senderMap = new Map<string, any>()
    if (senderIds.length > 0) {
      const { data: senders } = await supabase
        .from('users')
        .select('id, nickname, avatar_url')
        .in('id', senderIds)
      ;(senders || []).forEach((u: any) => senderMap.set(u.id, u))
    }

    // 获取对方用户信息
    const otherId = convo.participant_1_id === userId ? convo.participant_2_id : convo.participant_1_id
    let otherUser: any = null
    if (otherId) {
      const { data: other } = await supabase
        .from('users')
        .select('id, nickname, avatar_url')
        .eq('id', otherId)
        .maybeSingle()
      otherUser = other || null
    }

    return {
      success: true,
      data: (data || []).reverse().map((m: any) => ({
        ...m,
        sender: senderMap.get(m.sender_id) || null,
      })) as Message[],
      conversation: {
        ...convo,
        other_user: otherUser,
      } as Conversation,
    }
  } catch (error) {
    console.error('getConversationMessages exception:', error)
    return { success: false, error: 'INTERNAL_ERROR', message: '服务器内部错误' }
  }
}

export async function markMessagesAsRead(userId: string, conversationId: string, authToken?: string) {
  try {
    const supabase = createServiceClient({ jwt: authToken, forceServiceRole: true })
    const { data: convo, error: convoError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .is('deleted_at', null)
      .maybeSingle()
    if (convoError && convoError.code !== 'PGRST116') {
      console.error('查询会话失败:', convoError)
    }
    if (!convo) {
      return { success: false, error: 'CONVERSATION_NOT_FOUND', message: '会话不存在' }
    }
    if (convo.participant_1_id !== userId && convo.participant_2_id !== userId) {
      return { success: false, error: 'NOT_PARTICIPANT', message: '您不是此会话的参与者' }
    }
    await supabase
      .from('messages')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .neq('sender_id', userId)
      .eq('is_read', false)
    await supabase
      .from('messages')
      .update({ status: 'read' })
      .eq('conversation_id', conversationId)
      .neq('sender_id', userId)
      .in('status', ['sent', 'delivered'])
    const field = convo.participant_1_id === userId ? 'unread_count_p1' : 'unread_count_p2'
    await supabase
      .from('conversations')
      .update({ [field]: 0 })
      .eq('id', conversationId)
    return { success: true, message: '消息已标记为已读' }
  } catch (error) {
    return { success: false, error: 'INTERNAL_ERROR', message: '服务器内部错误' }
  }
}

export async function recallMessage(userId: string, messageId: string, authToken?: string) {
  try {
    const supabase = createServiceClient({ jwt: authToken, forceServiceRole: true })
    const { data: message, error: msgErr } = await supabase
      .from('messages')
      .select('id, sender_id, conversation_id, created_at')
      .eq('id', messageId)
      .single()
    if (msgErr || !message) {
      return { success: false, error: 'MESSAGE_NOT_FOUND', message: '消息不存在' }
    }
    if (message.sender_id !== userId) {
      return { success: false, error: 'FORBIDDEN', message: '只能撤回自己发送的消息' }
    }
    const { data: updated, error: updErr } = await supabase
      .from('messages')
      .update({ is_recalled: true, recalled_at: new Date().toISOString() })
      .eq('id', messageId)
      .select('*')
      .single()
    if (updErr) {
      return { success: false, error: 'DATABASE_ERROR', message: '撤回失败' }
    }
    const { data: latest } = await supabase
      .from('messages')
      .select('id, content, created_at, sender_id')
      .eq('conversation_id', message.conversation_id)
      .eq('is_recalled', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    const previewText = latest
      ? latest.content
      : '消息已撤回'
    await supabase
      .from('conversations')
      .update({
        last_message_content: previewText,
        last_message_at: latest?.created_at || message.created_at,
        last_sender_id: latest?.sender_id || userId,
        updated_at: new Date().toISOString()
      })
      .eq('id', message.conversation_id)
    return { success: true, data: updated }
  } catch (error) {
    return { success: false, error: 'INTERNAL_ERROR', message: '服务器内部错误' }
  }
}

export async function ensureOfficialFriend(userId: string, authToken?: string) {
  try {
    const supabase = createServiceClient({ jwt: authToken, forceServiceRole: true })
    const officialId = '00000000-0000-0000-0000-000000000001'
    if (userId === officialId) return { success: true }
    const [p1, p2] = userId < officialId ? [userId, officialId] : [officialId, userId]
    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .eq('participant_1_id', p1)
      .eq('participant_2_id', p2)
      .limit(1)
      .maybeSingle()
    if (!existing) {
      const { data: created } = await supabase
        .from('conversations')
        .insert({ participant_1_id: p1, participant_2_id: p2 })
        .select('*')
        .single()
      if (created) {
        await supabase
          .from('messages')
          .insert({ conversation_id: created.id, sender_id: officialId, content: '欢迎加入焕星', message_type: 'text', is_read: false })
      }
    }
    return { success: true }
  } catch (e) {
    return { success: false, error: 'INTERNAL_ERROR' }
  }
}

export async function createNotification(notificationData: { user_id: string; type: Notification['type']; title: string; content: string; data?: Record<string, any> }, authToken?: string) {
  try {
    const supabase = createServiceClient({ jwt: authToken, forceServiceRole: true })
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: notificationData.user_id,
        type: notificationData.type,
        title: notificationData.title,
        content: notificationData.content,
        data: notificationData.data || {},
        is_read: false
      })
      .select('*')
      .single()
    if (error) {
      return { success: false, error: 'DATABASE_ERROR', message: '创建通知失败' }
    }
    return { success: true, data: data as Notification }
  } catch (error) {
    return { success: false, error: 'INTERNAL_ERROR', message: '服务器内部错误' }
  }
}

export async function getUserNotifications(userId: string, options: { limit?: number; offset?: number; type?: Notification['type'] | null; unread_only?: boolean } | number = 20, offset = 0, authToken?: string) {
  try {
    const supabase = createServiceClient({ jwt: authToken, forceServiceRole: true })
    let limit = 20
    let type: Notification['type'] | null = null
    let unread_only = false
    if (typeof options === 'number') {
      limit = options
    } else {
      limit = options.limit ?? 20
      offset = options.offset ?? 0
      type = options.type ?? null
      unread_only = options.unread_only ?? false
    }
    let query = supabase.from('notifications').select('*').eq('user_id', userId)
    if (type) query = query.eq('type', type)
    if (unread_only) query = query.eq('is_read', false)
    const { data, error } = await query.order('created_at', { ascending: false }).range(offset, offset + limit - 1)
    if (error) {
      return { success: false, error: 'DATABASE_ERROR', message: '获取通知列表失败' }
    }
    return { success: true, data: data as Notification[] }
  } catch (error) {
    return { success: false, error: 'INTERNAL_ERROR', message: '服务器内部错误' }
  }
}

export async function markNotificationAsRead(userId: string, notificationId: string, authToken?: string) {
  try {
    const supabase = createServiceClient({ jwt: authToken, forceServiceRole: true })
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', userId)
      .select('*')
      .single()
    if (error) {
      return { success: false, error: 'DATABASE_ERROR', message: '标记通知已读失败' }
    }
    return { success: true, data: data as Notification }
  } catch (error) {
    return { success: false, error: 'INTERNAL_ERROR', message: '服务器内部错误' }
  }
}

export async function getUnreadNotificationCount(userId: string, authToken?: string) {
  try {
    const supabase = createServiceClient({ jwt: authToken, forceServiceRole: true })
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false)
    if (error) {
      return { success: false, error: 'DATABASE_ERROR', message: '获取未读通知数量失败' }
    }
    return { success: true, data: { count: count || 0 } }
  } catch (error) {
    return { success: false, error: 'INTERNAL_ERROR', message: '服务器内部错误' }
  }
}
