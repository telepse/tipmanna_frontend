/* eslint-disable @typescript-eslint/no-explicit-any */

const tvPreloadLinks: HTMLLinkElement[] = [];

export function preloadVideos(items: any[], currentIndex: number) {
  for (const el of tvPreloadLinks) {
    el.remove();
  }
  tvPreloadLinks.length = 0;

  const next = items[currentIndex + 1];
  const afterNext = items[currentIndex + 2];

  [next, afterNext].forEach(video => {
    if (!video) return;

    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "document";
    link.href = video.channel.url;

    document.head.appendChild(link);
    tvPreloadLinks.push(link);
  });
}
