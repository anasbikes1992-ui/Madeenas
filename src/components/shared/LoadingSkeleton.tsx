export function LoadingSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse ${className}`}>
      <div className="h-4 bg-slate-200 rounded w-3/4 mb-3"></div>
      <div className="h-4 bg-slate-200 rounded w-1/2"></div>
    </div>
  )
}

export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="animate-pulse">
      <div className="h-10 bg-slate-200 rounded mb-4"></div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 mb-3">
          {Array.from({ length: columns }).map((_, j) => (
            <div key={j} className="h-8 bg-slate-200 rounded flex-1"></div>
          ))}
        </div>
      ))}
    </div>
  )
}

export function CardSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse ${className}`}>
      <div className="bg-white rounded-lg shadow p-6">
        <div className="h-6 bg-slate-200 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-slate-200 rounded"></div>
          <div className="h-4 bg-slate-200 rounded w-5/6"></div>
          <div className="h-4 bg-slate-200 rounded w-4/6"></div>
        </div>
      </div>
    </div>
  )
}

export function ProductCardSkeleton() {
  return (
    <div className="animate-pulse bg-white rounded-lg shadow overflow-hidden">
      <div className="h-48 bg-slate-200"></div>
      <div className="p-4">
        <div className="h-4 bg-slate-200 rounded w-3/4 mb-3"></div>
        <div className="h-3 bg-slate-200 rounded w-1/2 mb-4"></div>
        <div className="h-8 bg-slate-200 rounded"></div>
      </div>
    </div>
  )
}
