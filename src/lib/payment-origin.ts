/** Key used to restore the page the user was on before Stripe payment. */
export const PAYMENT_ORIGIN_STORAGE_KEY = "payment_origin";

const DEFAULT_SITE = "https://tipmanna.tv";

let warnedMissingFrontendUrlProduction = false;

function warnFrontendUrlUnsetOnce(): void {
  if (typeof window === "undefined" || process.env.NODE_ENV !== "production")
    return;
  if (process.env.NEXT_PUBLIC_FRONTEND_APP_URL?.trim()) return;
  if (warnedMissingFrontendUrlProduction) return;
  warnedMissingFrontendUrlProduction = true;
  console.error(
    "[payments] NEXT_PUBLIC_FRONTEND_APP_URL is unset in this production build; Stripe return_url falls back to window.origin or NEXT_PUBLIC_SITE_URL"
  );
}

/**
 * Canonical `return_url` for Stripe `confirmPayment` (same origin + `/success`).
 */
export function getStripeReturnUrl(): string {
  warnFrontendUrlUnsetOnce();
  const raw = process.env.NEXT_PUBLIC_FRONTEND_APP_URL?.trim();
  if (raw) {
    try {
      const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
      return `${new URL(normalized).origin}/success`;
    } catch {
      /* fall through */
    }
  }
  if (typeof window !== "undefined" && window.location?.origin)
    return `${window.location.origin}/success`;
  const site = (process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE).replace(
    /\/$/,
    ""
  );
  return `${site}/success`;
}

/**
 * Written immediately before Stripe `confirmPayment` redirect. Survives full page reload and
 * TipDrawer clearing `selectedTips` when TV schedule `eventId` hydrates or changes.
 */
export const PENDING_TIP_BROADCAST_V1_KEY = "pending_tip_broadcast_v1";

const PENDING_TIP_MAX_AGE_MS = 15 * 60 * 1000;

/**
 * After wallet top-up Stripe redirect: full cart + debit snapshot so surfaces can resume PIN pay
 * without re-deriving prices before `tippingCharacters` hydrate.
 */
export const TIP_RESUME_CTX_V1_KEY = "tip_resume_ctx_v1";

export type TipResumeWalletLineV1 = {
  name: string;
  time: string;
  price: number;
  characterId: string;
};

export type TipResumeCtxV1 = {
  v: 1;
  createdAt: number;
  eventId: string;
  paymentSurface: string;
  paymentContentId: string | null;
  selectedTips: string[];
  secondaryText: string;
  textTipActive: boolean;
  walletLines: TipResumeWalletLineV1[];
  walletTotal: number;
  /** Explore sub-tab when wallet top-up was started from /explore */
  exploreFeedTab?: "trends" | "saves" | "tv";
};

function sumWalletLines(lines: TipResumeWalletLineV1[]): number {
  return Math.round(lines.reduce((s, c) => s + Number(c.price), 0) * 100) / 100;
}

export function writeTipResumeCtx(
  payload: Omit<TipResumeCtxV1, "v" | "createdAt">
): void {
  if (typeof window === "undefined") return;
  try {
    if (
      !payload.eventId?.trim() ||
      !payload.selectedTips?.length ||
      !payload.walletLines?.length ||
      !(payload.walletTotal >= 1)
    ) {
      return;
    }
    const declared = sumWalletLines(payload.walletLines);
    if (Math.abs(declared - payload.walletTotal) > 0.02) {
      return;
    }
    const full: TipResumeCtxV1 = {
      v: 1,
      createdAt: Date.now(),
      ...payload,
    };
    localStorage.setItem(TIP_RESUME_CTX_V1_KEY, JSON.stringify(full));
  } catch {
    /* quota / private mode */
  }
}

export function readTipResumeCtx(): TipResumeCtxV1 | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(TIP_RESUME_CTX_V1_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as TipResumeCtxV1;
    if (
      p?.v !== 1 ||
      !p.eventId?.trim() ||
      !Array.isArray(p.selectedTips) ||
      !Array.isArray(p.walletLines) ||
      typeof p.walletTotal !== "number"
    ) {
      localStorage.removeItem(TIP_RESUME_CTX_V1_KEY);
      return null;
    }
    if (Date.now() - (p.createdAt || 0) > PENDING_TIP_MAX_AGE_MS) {
      localStorage.removeItem(TIP_RESUME_CTX_V1_KEY);
      return null;
    }
    return p;
  } catch {
    return null;
  }
}

export function clearTipResumeCtx(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(TIP_RESUME_CTX_V1_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Written when starting wallet card top-up so /success → payment origin can reopen the tip drawer
 * and wallet modal with a refreshed balance (event room, channel, content, TV, explore).
 */
export const WALLET_TOPUP_RETURN_V1_KEY = "wallet_topup_return_v1";

export type WalletTopupReturnV1 = {
  v: 1;
  createdAt: number;
  /** Event the user was tipping in; must match the surface hook’s `eventId`. */
  eventId: string | null;
};

export function writeWalletTopupReturnIntent(eventId: string | null): void {
  if (typeof window === "undefined") return;
  try {
    const full: WalletTopupReturnV1 = {
      v: 1,
      createdAt: Date.now(),
      eventId: eventId?.trim() ? eventId.trim() : null,
    };
    localStorage.setItem(WALLET_TOPUP_RETURN_V1_KEY, JSON.stringify(full));
  } catch {
    /* ignore */
  }
}

export function readWalletTopupReturnIntent(): WalletTopupReturnV1 | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(WALLET_TOPUP_RETURN_V1_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as WalletTopupReturnV1;
    if (p?.v !== 1) {
      localStorage.removeItem(WALLET_TOPUP_RETURN_V1_KEY);
      return null;
    }
    if (Date.now() - (p.createdAt || 0) > PENDING_TIP_MAX_AGE_MS) {
      localStorage.removeItem(WALLET_TOPUP_RETURN_V1_KEY);
      return null;
    }
    return p;
  } catch {
    return null;
  }
}

export function clearWalletTopupReturnIntent(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(WALLET_TOPUP_RETURN_V1_KEY);
  } catch {
    /* ignore */
  }
}

export type PendingTipBroadcastV1 = {
  v: 1;
  eventId: string;
  selectedTips: string[];
  amount: number;
  secondaryText?: string;
  createdAt: number;
  /** EventChannel id when tipping in video context (explore, TV, channel, content). */
  eventChannelId?: string;
  /** Matches Transaction.id for idempotent POST /messages vs webhook. */
  transactionId?: string;
};

export function writePendingTipBroadcast(
  payload: Omit<PendingTipBroadcastV1, "v" | "createdAt">
): void {
  if (typeof window === "undefined") return;
  try {
    if (
      !payload.eventId?.trim() ||
      !payload.selectedTips?.length ||
      !(payload.amount > 0)
    ) {
      return;
    }
    const full: PendingTipBroadcastV1 = {
      v: 1,
      ...payload,
      createdAt: Date.now(),
    };
    localStorage.setItem(PENDING_TIP_BROADCAST_V1_KEY, JSON.stringify(full));
  } catch {
    /* quota / private mode */
  }
}

export function readPendingTipBroadcast(): PendingTipBroadcastV1 | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PENDING_TIP_BROADCAST_V1_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as PendingTipBroadcastV1;
    if (p?.v !== 1 || !p.eventId?.trim() || !Array.isArray(p.selectedTips)) {
      return null;
    }
    if (Date.now() - (p.createdAt || 0) > PENDING_TIP_MAX_AGE_MS) {
      localStorage.removeItem(PENDING_TIP_BROADCAST_V1_KEY);
      return null;
    }
    return p;
  } catch {
    return null;
  }
}

export function clearPendingTipBroadcast(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(PENDING_TIP_BROADCAST_V1_KEY);
  } catch {
    /* ignore */
  }
}

function parseOriginsFromEnv(): string[] {
  const raw = process.env.NEXT_PUBLIC_PAYMENT_ORIGIN_ALLOWLIST;
  if (!raw?.trim()) return [];
  return raw
    .split(/[\s,]+/)
    .map(s => s.trim())
    .filter(Boolean);
}

/**
 * Origins allowed for post-payment redirect (avoid open redirects).
 */
export function getAllowedPaymentOrigins(): string[] {
  const fromEnv = parseOriginsFromEnv();
  const base = process.env.NEXT_PUBLIC_FRONTEND_APP_URL?.replace(/\/$/, "");
  const set = new Set<string>();
  if (typeof window !== "undefined") {
    set.add(window.location.origin);
  }
  if (base) {
    try {
      set.add(new URL(base).origin);
    } catch {
      /* ignore */
    }
  }
  for (const o of fromEnv) {
    try {
      set.add(new URL(o).origin);
    } catch {
      /* ignore */
    }
  }
  return [...set];
}

export function isAllowedPaymentOrigin(urlString: string): boolean {
  try {
    const u = new URL(urlString);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    const path = u.pathname.replace(/\/$/, "") || "/";
    if (path === "/success") return false;
    return getAllowedPaymentOrigins().includes(u.origin);
  } catch {
    return false;
  }
}

export function savePaymentOrigin(): void {
  if (typeof window === "undefined") return;
  try {
    const href = window.location.href;
    if (!isAllowedPaymentOrigin(href)) return;
    localStorage.setItem(PAYMENT_ORIGIN_STORAGE_KEY, href);
  } catch {
    /* quota / private mode */
  }
}

/** Current Explore sub-tab from URL when pathname is /explore. */
export function readExploreFeedTabFromLocation():
  | "trends"
  | "saves"
  | "tv"
  | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const path = window.location.pathname.replace(/\/$/, "") || "/";
    if (path !== "/explore") return undefined;
    const v = new URLSearchParams(window.location.search).get("feedTab");
    if (v === "trends" || v === "saves" || v === "tv") return v;
  } catch {
    /* ignore */
  }
  return undefined;
}
