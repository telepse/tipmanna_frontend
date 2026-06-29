export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    return;
  }
}

export async function onRequestError(
  err: Error & { digest?: string },
  request: { path: string; method: string },
  context: { routerKind?: string }
) {
  if (process.env.NODE_ENV !== "production") {
    console.error(
      "[instrumentation]",
      request.method,
      request.path,
      err.message,
      {
        digest: err.digest,
        routerKind: context.routerKind,
      }
    );
  }
}
