export default function SetlistLoading() {
  return (
    <div className="px-4 sm:px-6 py-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="h-5 w-16 bg-muted rounded animate-pulse" />
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 bg-muted rounded animate-pulse" />
          <div className="h-9 w-9 bg-muted rounded animate-pulse" />
          <div className="h-9 w-16 bg-muted rounded-lg animate-pulse" />
        </div>
      </div>

      <div className="h-8 w-48 bg-muted rounded animate-pulse mb-4" />
      <div className="h-5 w-32 bg-muted/60 rounded animate-pulse mb-6" />

      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-14 bg-muted/50 border border-border rounded-lg animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}
