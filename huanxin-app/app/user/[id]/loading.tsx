export default function UserProfileLoading() {
  return (
    <div className="min-h-screen bg-white">
      <div className="px-4 py-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-20 h-20 rounded-full bg-muted animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-6 bg-muted rounded animate-pulse w-32" />
            <div className="h-4 bg-muted rounded animate-pulse w-48" />
          </div>
        </div>
      </div>
    </div>
  )
}
