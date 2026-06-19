export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-semibold">You&apos;re offline</h1>
      <p className="text-muted-foreground max-w-md text-sm">
        Tipmanna needs a connection for live TV and tipping. Reconnect to
        continue, or reopen the app when you&apos;re back online.
      </p>
      <a
        href="/explore"
        className="bg-primary rounded-md px-4 py-2 text-sm text-white"
      >
        Try again
      </a>
    </main>
  );
}
