/** Skeleton shown while a page's data loads. */
export default function Loading() {
  return (
    <div role="status" aria-label="Loading" className="animate-pulse">
      <div className="h-8 w-56 rounded-lg bg-border" />
      <div className="mt-2 h-4 w-80 max-w-full rounded bg-border/70" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-28 rounded-xl border border-border bg-surface" />
        ))}
      </div>
      <div className="mt-6 h-80 rounded-xl border border-border bg-surface" />
    </div>
  );
}
