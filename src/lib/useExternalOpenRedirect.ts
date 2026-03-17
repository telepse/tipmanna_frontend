import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function useExternalOpenRedirect(targetUrl: string, enable = true) {
  const router = useRouter();

  useEffect(() => {
    if (!enable || typeof window === "undefined") return;

    const referrer = document.referrer;
    const sameDomain = referrer.includes(window.location.host);

    if (!referrer || !sameDomain) {
      router.replace(targetUrl);
    }
  }, [enable, targetUrl, router]);
}
