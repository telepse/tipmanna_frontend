export function preloadVideo(videoId: string) {
  new Image().src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}
