declare global {
  interface Window {
    Tawk_API?: {
      hideWidget?: () => void;
      showWidget?: () => void;
      maximize?: () => void;
      setAttributes?: (
        attrs: { name?: string; email?: string },
        cb?: (err?: unknown) => void
      ) => void;
      visitor?: { name?: string; email?: string };
      embedded?: boolean;
    };
    Tawk_LoadStart?: Date;
  }
}

export function hideTawkWidget(): void {
  if (typeof window === "undefined") return;
  try {
    window.Tawk_API?.hideWidget?.();
  } catch {
    /* best-effort */
  }
}

export function showTawkWidget(): void {
  if (typeof window === "undefined") return;
  try {
    window.Tawk_API?.showWidget?.();
  } catch {
    /* best-effort */
  }
}

export function loadTawkScript(opts?: {
  propertyId?: string;
  widgetId?: string;
  visitor?: { name?: string; email?: string };
}): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();

  const propertyId =
    opts?.propertyId ?? process.env.NEXT_PUBLIC_TAWK_PROPERTY_ID;
  const widgetId = opts?.widgetId ?? process.env.NEXT_PUBLIC_TAWK_WIDGET_ID;
  if (!propertyId || !widgetId) {
    return Promise.reject(new Error("Tawk property/widget id not configured"));
  }

  if (document.getElementById("tawk-script")) {
    hideTawkWidget();
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    window.Tawk_API = window.Tawk_API || {};
    window.Tawk_LoadStart = new Date();
    window.Tawk_API.embedded = true;
    if (opts?.visitor) {
      window.Tawk_API.visitor = opts.visitor;
    }

    const script = document.createElement("script");
    script.id = "tawk-script";
    script.async = true;
    script.src = `https://embed.tawk.to/${propertyId}/${widgetId}`;
    script.charset = "UTF-8";
    script.setAttribute("crossorigin", "*");
    script.onload = () => {
      hideTawkWidget();
      resolve();
    };
    script.onerror = () => reject(new Error("Failed to load Tawk"));
    document.body.appendChild(script);
  });
}

export function buildTawkChatUrl(params: {
  name: string;
  email: string;
  message?: string;
  propertyId?: string;
  widgetId?: string;
}): string {
  const propertyId =
    params.propertyId ?? process.env.NEXT_PUBLIC_TAWK_PROPERTY_ID ?? "";
  const widgetId =
    params.widgetId ?? process.env.NEXT_PUBLIC_TAWK_WIDGET_ID ?? "";
  const base = `https://tawk.to/chat/${propertyId}/${widgetId}`;
  const q = new URLSearchParams({
    name: params.name,
    email: params.email,
  });
  if (params.message?.trim()) {
    q.set("message", params.message.trim());
  }
  return `${base}?${q.toString()}`;
}
