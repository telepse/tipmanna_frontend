/** Skip Tipmanna SSR schedule/catalog only when rendering fullscreen deep link. */
export function shouldSkipSsrTipmannaTvBootstrap(opts: {
  videoId: string | undefined;
  currentChannel: unknown | null;
}): boolean {
  return Boolean(opts.videoId?.trim() && opts.currentChannel);
}
