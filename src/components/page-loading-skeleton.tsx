import { Skeleton } from "@/components/ui/skeleton"

export function PageLoadingSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-6 px-4 py-4 lg:px-6">
      <div className="rounded-3xl border bg-card/60 p-6 shadow-sm">
        <div className="flex flex-wrap gap-3">
          <Skeleton className="h-6 w-28 rounded-full" />
          <Skeleton className="h-6 w-36 rounded-full" />
          <Skeleton className="h-6 w-32 rounded-full" />
        </div>
        <div className="mt-5 space-y-3">
          <Skeleton className="h-8 w-72 max-w-full" />
          <Skeleton className="h-4 w-[34rem] max-w-full" />
          <Skeleton className="h-4 w-[26rem] max-w-full" />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={`page-skeleton-card-${index}`}
            className="rounded-3xl border bg-card p-5 shadow-xs"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-7 w-20" />
              </div>
              <Skeleton className="h-8 w-24 rounded-full" />
            </div>
            <div className="mt-6 space-y-3">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
              <Skeleton className="h-3 w-3/5" />
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-3xl border bg-card p-6 shadow-xs">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="mt-3 h-4 w-80 max-w-full" />
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={`page-skeleton-row-${index}`}
              className="rounded-2xl border p-4"
            >
              <Skeleton className="h-5 w-32" />
              <Skeleton className="mt-4 h-4 w-full" />
              <Skeleton className="mt-2 h-4 w-4/5" />
              <Skeleton className="mt-5 h-10 w-32" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
