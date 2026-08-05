import { TvYoutubeSsrPreconnect } from "@/components/tv/tv-youtube-ssr-preconnect";
import TVLayoutClient from "./tv-layout-client";

/** TV route layout — server shell hoists connection hints; client subtree unchanged. */
export default function TVLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TvYoutubeSsrPreconnect />
      <TVLayoutClient>{children}</TVLayoutClient>
    </>
  );
}
