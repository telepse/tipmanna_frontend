import { SITE_URL, getPublicFrontendOrigin } from "@/lib/site-config";
import {
  getAllowedPaymentOrigins,
  getStripeReturnUrl,
} from "@/lib/payment-origin";

/** Dev-only probes for Stripe return URL wiring, API base, env expectations. Non-production gate. */
export default function AuditPage() {
  if (
    typeof process.env.NODE_ENV !== "undefined" &&
    process.env.NODE_ENV === "production"
  ) {
    return (
      <div className="p-8 font-mono text-sm">
        Audit route is unavailable in production.
      </div>
    );
  }

  const api = process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "";
  const stripePk = Boolean(
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim()
  );
  const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY?.trim() ?? "";
  const pusherMasked =
    pusherKey.length > 8
      ? `${pusherKey.slice(0, 4)}…${pusherKey.slice(-4)}`
      : pusherKey || "(unset)";
  let stripeReturnComputed = "(error)";
  try {
    stripeReturnComputed = getStripeReturnUrl();
  } catch {
    stripeReturnComputed = "(getStripeReturnUrl threw)";
  }
  let publicOriginComputed = "(error)";
  try {
    publicOriginComputed = getPublicFrontendOrigin();
  } catch {
    publicOriginComputed = "(getPublicFrontendOrigin threw)";
  }
  let allowlistParsed: string[] = [];
  try {
    allowlistParsed = getAllowedPaymentOrigins();
  } catch {
    allowlistParsed = [];
  }

  const envRows = [
    ["NODE_ENV", process.env.NODE_ENV ?? ""],
    ["NEXT_PUBLIC_BACKEND_API_URL", api],
    ["SITE_URL / marketing", SITE_URL ?? ""],
    ["NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY configured", stripePk ? "yes" : "no"],
    [
      "NEXT_PUBLIC_SITE_URL",
      process.env.NEXT_PUBLIC_SITE_URL?.trim?.() ?? "(unset)",
    ],
    [
      "NEXT_PUBLIC_FRONTEND_APP_URL",
      process.env.NEXT_PUBLIC_FRONTEND_APP_URL?.trim?.() ?? "(unset)",
    ],
    [
      "NEXT_PUBLIC_PAYMENT_ORIGIN_ALLOWLIST",
      process.env.NEXT_PUBLIC_PAYMENT_ORIGIN_ALLOWLIST?.trim?.() ?? "(unset)",
    ],
    [
      "NEXT_PUBLIC_PUSHER_CLUSTER",
      process.env.NEXT_PUBLIC_PUSHER_CLUSTER ?? "(unset)",
    ],
    ["NEXT_PUBLIC_PUSHER_KEY (masked)", pusherMasked],
    ["Computed getPublicFrontendOrigin()", publicOriginComputed],
    ["Computed getStripeReturnUrl()", stripeReturnComputed],
    ["Parsed getAllowedPaymentOrigins() count", String(allowlistParsed.length)],
    ["Parsed origins (comma-sep)", allowlistParsed.join(", ") || "(none)"],
  ] as const;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-8 font-mono text-sm">
      <h1 className="text-xl font-semibold">Tipmanna dev audit</h1>
      <p className="text-muted-foreground">
        Sanity checks for stabilization work — safe to bookmark locally; gated
        from production builds.
      </p>
      <section className="space-y-2 rounded-lg border p-4">
        <h2 className="font-medium">Public env wiring</h2>
        <ul className="space-y-2">
          {envRows.map(([k, v]) => (
            <li
              key={k}
              className="flex flex-wrap gap-2 border-b border-dashed py-2 last:border-0"
            >
              <span className="text-muted-foreground min-w-[12rem]">{k}</span>
              <span className="break-all">{typeof v === "string" ? v : v}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
