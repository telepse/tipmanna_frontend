import Link from "next/link";

export default function NotFound() {
  return (
    <main
      id="main-content"
      className="flex min-h-[70vh] flex-col items-center justify-center gap-6 px-6 py-16 text-center"
    >
      <p className="text-sm font-medium tracking-wide text-neutral-500 uppercase">
        404
      </p>
      <h1 className="text-2xl font-semibold sm:text-3xl">Page not found</h1>
      <p className="max-w-md text-sm text-neutral-600">
        The page you are looking for does not exist or may have moved.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/explore"
          className="rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white"
        >
          Explore Tipmanna
        </Link>
        <Link
          href="/discover"
          className="rounded-lg border border-neutral-300 px-5 py-2.5 text-sm font-medium"
        >
          Discover content
        </Link>
        <Link
          href="/partner"
          className="rounded-lg border border-neutral-300 px-5 py-2.5 text-sm font-medium"
        >
          Partner home
        </Link>
      </div>
    </main>
  );
}
