import { fetchTvTipCheckoutPublicSession } from "@/lib/tv-tip-checkout-client";
import { TvTipCheckoutPageClient } from "@/components/payments/tv-tip-checkout-page-client";

type Props = { params: Promise<{ token: string }> };

export default async function TvTipCheckoutPayPage({ params }: Props) {
  const { token } = await params;
  try {
    const session = await fetchTvTipCheckoutPublicSession(token);
    return <TvTipCheckoutPageClient session={session} token={token} />;
  } catch (e) {
    const message = e instanceof Error ? e.message : "Checkout unavailable";
    return (
      <div className="mx-auto max-w-md p-6">
        <h1 className="text-xl font-semibold">Tip checkout</h1>
        <p className="mt-4 text-sm text-muted-foreground">{message}</p>
      </div>
    );
  }
}
