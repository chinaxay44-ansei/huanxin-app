'use client'

import { useState, useEffect } from 'react'
import { X, Camera } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useUserProfile } from '@/lib/hooks/useUserProfile'
import { useAuth } from '@/lib/auth'
import { toast } from 'sonner'

interface EditProfileModalProps {
  isOpen: boolean
  onClose: () => void
}

export function EditProfileModal({ isOpen, onClose }: EditProfileModalProps) {
  const { getCurrentUserId } = useAuth()
  const currentUserId = getCurrentUserId()
  
  const { profile, updateProfile, refetch } = useUserProfile(currentUserId)
  
  const [formData, setFormData] = useState({
    nickname: '',
    bio: '',
    location: '',
    website: '',
    education: '',
    birthday: '',
    gender: '',
    relationship_status: '',
    mbti: '',
    personality_description: '',
    favorite_quote: '',
    hobbies: '',
    languages: '',
  })
  
  const [isLoading, setIsLoading] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarInputEl, setAvatarInputEl] = useState<HTMLInputElement | null>(null)
  

  // 初始化表单数据
  useEffect(() => {
    if (profile) {
      const user = profile.user
      const userProfile = profile.profile
      
      setFormData({
        nickname: user?.nickname || '',
        bio: user?.bio || userProfile?.bio || '',
        location: user?.location || userProfile?.location || '',
        website: userProfile?.website || '',
        education: userProfile?.education || '',
        birthday: user?.birthday || userProfile?.birthday || '',
        gender: (user?.gender || userProfile?.gender || '') as string,
        relationship_status: userProfile?.relationship_status || '',
        mbti: userProfile?.mbti || '',
        personality_description: userProfile?.personality_description || '',
        favorite_quote: userProfile?.favorite_quote || '',
        hobbies: userProfile?.hobbies || '',
        languages: userProfile?.languages || '',
      })
    }
  }, [profile])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    setIsLoading(true)
    try {
      await updateProfile(formData)
      toast.success('个人资料更新成功')
      onClose()
    } catch (error) {
      console.error('更新个人资料失败:', error)
      toast.error('更新失败，请重试')
    } finally {
      setIsLoading(false)
    }
  }

  const triggerAvatarSelect = () => {
    if (avatarInputEl) avatarInputEl.click()
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const previewUrl = URL.createObjectURL(file)
    setAvatarPreview(previewUrl)
    setIsUploadingAvatar(true)
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null
      const headers: Record<string, string> = {}
      if (token) headers['Authorization'] = `Bearer ${token}`
      const fd = new FormData()
      fd.append('avatar', file)
      const res = await fetch('/api/upload/avatar', { method: 'POST', headers, body: fd })
      const result = await res.json()
      if (result?.success) {
        toast.success('头像上传成功')
        await refetch()
        setAvatarPreview(null)
      } else {
        toast.error(result?.message || '头像上传失败')
      }
    } catch (err) {
      toast.error('头像上传失败，请重试')
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-50 animate-in fade-in duration-200" onClick={onClose} />

      <div className="fixed top-0 bottom-0 left-1/2 -translate-x-1/2 z-50 bg-white animate-in slide-in-from-bottom duration-300 overflow-y-auto w-full max-w-[480px] md:max-w-[540px] shadow-xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-4 py-4 flex items-center justify-between">
          <button onClick={onClose}>
            <X className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-bold">编辑资料</h1>
          <Button 
            size="sm" 
            onClick={handleSave} 
            disabled={isLoading}
            className="bg-pink-500 hover:bg-pink-600"
          >
            {isLoading ? '保存中...' : '保存'}
          </Button>
        </div>

        <div className="px-4 py-6">
            <>
              {/* Avatar */}
              <div className="flex justify-center mb-8">
                <div className="relative">
                  <img
                    src={avatarPreview || profile?.user?.avatar_url || profile?.profile?.avatar_url || "/placeholder.svg?height=120&width=120"}
                    alt="Avatar"
                    className="w-30 h-30 rounded-full object-cover"
                  />
                  <button disabled={isUploadingAvatar} onClick={triggerAvatarSelect} className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center">
                    <Camera className="w-5 h-5 text-white" />
                  </button>
                  <input ref={setAvatarInputEl} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                </div>
              </div>

              {/* Basic Info */}
              <div className="space-y-6">
                <div>
                  <Label htmlFor="nickname" className="text-sm text-gray-600 mb-2 block">昵称</Label>
                  <Input
                    id="nickname"
                    value={formData.nickname}
                    onChange={(e) => handleInputChange('nickname', e.target.value)}
                    placeholder="请输入昵称"
                    className="rounded-xl"
                  />
                </div>

                <div>
                  <Label htmlFor="bio" className="text-sm text-gray-600 mb-2 block">简介</Label>
                  <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => handleInputChange('bio', e.target.value)}
                    placeholder="介绍一下自己吧..."
                    rows={3}
                    className="rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="gender" className="text-sm text-gray-600 mb-2 block">性别</Label>
                    <Select value={formData.gender} onValueChange={(value) => handleInputChange('gender', value)}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="选择性别" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">男</SelectItem>
                        <SelectItem value="female">女</SelectItem>
                        <SelectItem value="other">其他</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="birthday" className="text-sm text-gray-600 mb-2 block">生日</Label>
                    <Input
                      id="birthday"
                      type="date"
                      value={formData.birthday}
                      onChange={(e) => handleInputChange('birthday', e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="location" className="text-sm text-gray-600 mb-2 block">所在地</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    placeholder="请输入所在地"
                    className="rounded-xl"
                  />
                </div>

                

                <div>
                  <Label htmlFor="mbti" className="text-sm text-gray-600 mb-2 block">MBTI类型</Label>
                  <Input
                    id="mbti"
                    value={formData.mbti}
                    onChange={(e) => handleInputChange('mbti', e.target.value)}
                    placeholder="如：INFP"
                    className="rounded-xl"
                  />
                </div>

                
              </div>
            </>
          
        </div>
      </div>
    </>
  )
}
