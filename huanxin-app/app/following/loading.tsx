export default function FollowingLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="px-4 py-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-3">
            <div className="w-12 h-12 rounded-full bg-muted animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded animate-pulse w-24" />
              <div className="h-3 bg-muted rounded animate-pulse w-32" />
            </div>
            <div className="h-8 w-16 bg-muted rounded-full animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}
