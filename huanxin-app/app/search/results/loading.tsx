export default function SearchResultsLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background border-b px-4 py-3">
        <div className="h-10 bg-muted rounded-full animate-pulse" />
      </div>
      <div className="p-4 grid grid-cols-2 gap-2">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="aspect-square bg-muted rounded-xl animate-pulse" />
        ))}
      </div>
    </div>
  )
}
