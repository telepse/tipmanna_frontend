/* eslint-disable @typescript-eslint/no-explicit-any */
export function preloadVideos(items: any[], currentIndex: number) {
  const next = items[currentIndex + 1];
  const afterNext = items[currentIndex + 2];

  [next, afterNext].forEach(video => {
    if (!video) return;

    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "document";
    link.href = video.channel.url;

    document.head.appendChild(link);
  });
}
