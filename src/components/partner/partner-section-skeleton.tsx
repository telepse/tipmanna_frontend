export function PartnerSectionSkeleton({ rows = 1 }: { rows?: number }) {
  return (
    <div
      className="wrapper section animate-pulse py-12"
      aria-hidden
    >
      <div className="bg-muted mb-6 h-8 w-48 rounded" />
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="bg-muted h-48 min-w-[280px] flex-1 rounded-2xl"
          />
        ))}
      </div>
    </div>
  );
}
