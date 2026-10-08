export function WatchUnavailable() {
  return (
    <div className="flex min-h-[100vh] items-center justify-center bg-black px-6 text-center text-white">
      <div className="max-w-md space-y-4">
        <h1 className="text-2xl font-bold">Watch portal unavailable</h1>
        <p className="text-white/70">
          This feature is not enabled in this environment.
        </p>
      </div>
    </div>
  );
}
