export default function TipLinkLoading() {
  return (
    <div className="tiplink-landing-bg min-h-screen text-white">
      <div className="sticky top-0 z-50 border-b border-white/10 bg-black/40 backdrop-blur-xl">
        <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="h-9 w-28 animate-pulse rounded-full bg-white/10" />
          <div className="h-8 w-32 animate-pulse rounded bg-white/10" />
        </header>
        <div className="h-8 animate-pulse bg-white/5" />
      </div>
      <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6">
        <div className="h-24 animate-pulse rounded-2xl border border-white/10 bg-black/25" />
        <div className="aspect-video animate-pulse rounded-2xl border border-white/10 bg-black/25" />
        <div className="h-40 animate-pulse rounded-2xl border border-white/10 bg-black/25" />
      </main>
    </div>
  );
}
