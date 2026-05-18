"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useRouter } from "next/navigation"
import { Switch } from "@/components/ui/switch"
import { EditProfileModal } from "@/components/edit-profile-modal"
import { AuthGuard } from "@/components/auth-guard"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/auth"
import type { JSX } from "react/jsx-runtime"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

function SettingsContent() {
  const router = useRouter()
  const { toast } = useToast()
  const { user } = useAuth()
  const [noWatermark, setNoWatermark] = useState(false)
  const [showEditProfile, setShowEditProfile] = useState(false)
  const [showQr, setShowQr] = useState(false)

  const handleCopyUserId = async () => {
    const userId = user?.id
    if (!userId) {
      toast({ title: "暂未获取到用户ID" })
      return
    }
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(userId)
        toast({ title: "用户ID已复制" })
        return
      }
      const textarea = document.createElement("textarea")
      textarea.value = userId
      textarea.setAttribute("readonly", "")
      textarea.style.position = "fixed"
      textarea.style.top = "-9999px"
      textarea.style.left = "-9999px"
      document.body.appendChild(textarea)
      textarea.select()
      textarea.setSelectionRange(0, textarea.value.length)
      const ok = document.execCommand("copy")
      document.body.removeChild(textarea)
      if (!ok) throw new Error("copy_failed")
      toast({ title: "用户ID已复制" })
    } catch {
      toast({ title: "复制失败，请手动复制id" })
    }
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: '焕星 - AI写真生成',
        text: '快来体验焕星，生成你的专属AI写真！',
        url: window.location.origin
      }).catch(() => {
        // 如果分享失败，复制链接到剪贴板
        navigator.clipboard.writeText(window.location.origin)
        toast({
          title: "链接已复制",
          description: "分享链接已复制到剪贴板"
        })
      })
    } else {
      // 浏览器不支持原生分享，复制链接
      navigator.clipboard.writeText(window.location.origin)
      toast({
        title: "链接已复制",
        description: "分享链接已复制到剪贴板"
      })
    }
  }

  const handleContact = () => {
    setShowQr(true)
  }

  const settingsGroups = [
    {
      items: [
        { icon: "user", label: "编辑资料", onClick: () => setShowEditProfile(true) },
        { icon: "lock", label: "隐私设置", onClick: () => toast({ title: "功能开发中", description: "隐私设置功能即将上线" }) },
        {
          icon: "download",
          label: '保存时无"AI生成"水印',
          hasSwitch: true,
          value: noWatermark,
          onChange: setNoWatermark,
        },
      ],
    },
    {
      items: [
        { icon: "heart", label: "分享焕星给好友", onClick: handleShare },
        { icon: "message", label: "加入交流群", onClick: handleContact },
      ],
    },
    {
      items: [
        { icon: "file", label: "合法声明", onClick: () => toast({ title: "合法声明", description: "本平台官方发布的内容除音频外均由ai生成，所使用人像均不存在于现实世界，无意侵犯他人权益，如有疑问，请联系平台删除" }) },
        { icon: "users", label: "三方信息共享清单", onClick: () => toast({ title: "功能开发中", description: "三方信息共享清单即将上线" }) },
        { icon: "shield", label: "焕星使用技巧", onClick: () => toast({ title: "焕星使用技巧", description: "1、ai生成具有随机性，一般抽两次卡就能看出来这个功能到底好不好用\n2、图片生成一般2分钟内会出结果。动作迁移、人物替换处理的时间约等于你视频的秒数乘以分钟，如15秒视频就等待15分钟\n3、人物替换对身材一致性要求较高，选择和自己身材相似的模板进行替换制作，成功率才会更高哦\n4、制作同款写真时，认真挑选相同风格的穿搭，才更容易成功哦，强行制作跨风格、跨性别、跨物种的写真会有很大失败风险。\n5、使用动作迁移、人物替换功能时，人物在画面的占比越大越好，占比太小会显著影响效果\n6、焕星是一站式内容创作、分发、触达、社交平台。您可以借助它强大的功能实现您多彩的创意，系统会记录每一个作品的创作路径，方便他人做同款复刻，未来您将可以从中获得收益。您在发布作品时需要将关键制作参数“允许复用”，将非关键参数（如你个人的形象、穿搭）取消“允许复用”。\n7、平台已开启内容核审，色情等非法内容将直接制作失败" }) },
        { icon: "info", label: "关于焕星", onClick: () => toast({ title: "焕星 v1.0.0", description: "面向下一代的模板内容社交平台" }) },
      ],
    },
  ]

  const getIcon = (iconName: string) => {
    const icons: Record<string, JSX.Element> = {
      user: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
        </svg>
      ),
      lock: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
            clipRule="evenodd"
          />
        </svg>
      ),
      download: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      ),
      heart: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
            clipRule="evenodd"
          />
        </svg>
      ),
      mail: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
          <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
        </svg>
      ),
      message: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
          <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
        </svg>
      ),
      file: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
            clipRule="evenodd"
          />
        </svg>
      ),
      users: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
        </svg>
      ),
      shield: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
      ),
      info: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
            clipRule="evenodd"
          />
        </svg>
      ),
    }
    return icons[iconName] || icons.info
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background border-b px-4 py-4">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()}>
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold">设置</h1>
        </div>
      </header>

      <div className="p-4 space-y-4">
        <div className="bg-card rounded-2xl overflow-hidden shadow-sm">
          <button
            onClick={handleCopyUserId}
            className="w-full flex items-center justify-between p-4 hover:bg-accent transition-colors border-b last:border-b-0 border-input"
          >
            <div className="flex items-center gap-3">
              <div className="text-muted-foreground">{getIcon("user")}</div>
              <span className="text-base">用户ID</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground max-w-[160px] truncate">{user?.id || "-"}</span>
              <span className="text-xs text-primary">复制</span>
            </div>
          </button>
        </div>
        {settingsGroups.map((group, groupIndex) => (
          <div key={groupIndex} className="bg-card rounded-2xl overflow-hidden shadow-sm">
            {group.items.map((item, itemIndex) => (
              <button
                key={itemIndex}
                onClick={item.onClick}
                className="w-full flex items-center justify-between p-4 hover:bg-accent transition-colors border-b last:border-b-0 border-input"
              >
                <div className="flex items-center gap-3">
                  <div className="text-muted-foreground">{getIcon(item.icon)}</div>
                  <span className="text-base">{item.label}</span>
                </div>
                {item.hasSwitch ? (
                  <Switch checked={item.value} onCheckedChange={item.onChange} />
                ) : (
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                )}
              </button>
            ))}
          </div>
        ))}
        <div className="pt-2">
          <button
            onClick={async () => {
              try {
                await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
              } catch {}
              try { localStorage.removeItem('auth-token') } catch {}
              router.replace('/login')
            }}
            className="w-full h-10 rounded-full bg-destructive text-destructive-foreground"
          >
            退出登录
          </button>
        </div>
      </div>

      <EditProfileModal isOpen={showEditProfile} onClose={() => setShowEditProfile(false)} />

      <Dialog open={showQr} onOpenChange={setShowQr}>
        <DialogHeader>
          <DialogTitle></DialogTitle>
        </DialogHeader>
        <DialogContent className="max-w-sm">
          <div className="p-2">
            <img src="/20251121-142953.png" alt="交流群二维码" className="w-full h-auto rounded-md" />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <AuthGuard>
      <SettingsContent />
    </AuthGuard>
  )
}
