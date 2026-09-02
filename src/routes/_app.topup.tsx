/**
 * Buy notarisation fuel with a card.
 *
 * Dollars in, TEXITcoin into your own fuel address. Works signed in or not —
 * a signed-out device tops up the address derived for that device.
 */

import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { ArrowLeft, CheckCircle2, Fuel, Loader2 } from "lucide-react";

import { getStripe, getStripeEnvironment, paymentsConfigured } from "@/lib/stripe";
import { createFuelCheckout, getTopupStatus } from "@/lib/topup.functions";
import { useAuth } from "@/hooks/use-auth";
import { useFuel } from "@/lib/useFuel";
import { getDeviceId } from "@/lib/deviceId";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";

export const Route = createFileRoute("/_app/topup")({
  validateSearch: (search: Record<string, unknown>): { session_id?: string } =>
    typeof search["session_id"] === "string" ? { session_id: search["session_id"] } : {},
  head: () => ({
    meta: [
      { title: "Top up notarisation fuel — BEVIS" },
      {
        name: "description",
        content:
          "Add fuel to your BEVIS account with a card. Your balance pays only for your own records stamped onto the TEXITcoin blockchain.",
      },
      { property: "og:title", content: "Top up notarisation fuel — BEVIS" },
      {
        property: "og:description",
        content: "Buy notarisation fuel with a card — credited straight to your own TEXITcoin fuel address.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TopupPage,
});

const PACKS = [
  { priceId: "fuel_5", label: "$5", blurb: "about 50 records" },
  { priceId: "fuel_10", label: "$10", blurb: "about 100 records" },
  { priceId: "fuel_25", label: "$25", blurb: "about 250 records" },
] as const;

function TopupPage() {
  const { session_id: sessionId } = Route.useSearch();
  if (sessionId) return <TopupReturn sessionId={sessionId} />;
  return <TopupPicker />;
}

function TopupPicker() {
  const { user } = useAuth();
  const { data: fuel } = useFuel();
  const [priceId, setPriceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const configured = paymentsConfigured();

  const fetchClientSecret = async (): Promise<string> => {
    try {
      const ownerKey = user ? `user:${user.id}` : `device:${getDeviceId()}`;
      const result = await createFuelCheckout({
        data: {
          priceId: priceId!,
          ownerKey,
          ...(user?.email ? { customerEmail: user.email } : {}),
          returnUrl: `${window.location.origin}/topup?session_id={CHECKOUT_SESSION_ID}`,
          environment: getStripeEnvironment(),
        },
      });
      if ("error" in result) throw new Error(result.error);
      if (!result.clientSecret) throw new Error("Checkout could not be started.");
      return result.clientSecret;
    } catch (e) {
      setError((e as Error).message || "Checkout could not be started.");
      throw e;
    }
  };

  return (
    <div>
      <PaymentTestModeBanner />
      <div className="px-5 pb-10 pt-6">
        <header className="mb-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">BEVIS</p>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Fuel className="size-5 text-primary" /> Top up your fuel
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pay by card and we credit the equivalent TEXITcoin to your own fuel address. Only your records spend it.
          </p>
        </header>

        {fuel?.ok && (
          <p className="mb-5 rounded-xl border border-border bg-card p-3 text-xs text-muted-foreground">
            Balance <span className="font-mono text-foreground">{fuel.balanceTxc.toFixed(4)} TXC</span> —
            about {fuel.anchorsRemaining} more record{fuel.anchorsRemaining === 1 ? "" : "s"}.
          </p>
        )}

        {!configured ? (
          <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
            Card top-ups aren't switched on for this build yet. You can still fund your fuel address directly with
            TEXITcoin.
          </p>
        ) : !priceId ? (
          <ul className="grid gap-3">
            {PACKS.map(p => (
              <li key={p.priceId}>
                <button
                  onClick={() => {
                    setError(null);
                    setPriceId(p.priceId);
                  }}
                  className="flex w-full items-center justify-between rounded-xl border border-border bg-card p-4 text-left transition hover:border-primary/60"
                >
                  <span className="text-lg font-semibold">{p.label}</span>
                  <span className="text-xs text-muted-foreground">{p.blurb}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="space-y-4">
            <button
              onClick={() => setPriceId(null)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-3.5" /> Choose a different amount
            </button>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div id="checkout">
              <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
                <EmbeddedCheckout />
              </EmbeddedCheckoutProvider>
            </div>
          </div>
        )}

        <p className="mt-6 text-xs text-muted-foreground">
          Fuel is a prepaid balance for the BEVIS notary service — not a tradeable asset. A record costs about $0.10.
        </p>
      </div>
    </div>
  );
}

function TopupReturn({ sessionId }: { sessionId: string }) {
  const { refetch: refetchFuel } = useFuel();
  const { data } = useQuery({
    queryKey: ["topup", sessionId],
    queryFn: () => getTopupStatus({ data: { sessionId } }),
    refetchInterval: q => {
      const s = q.state.data;
      return s && "found" in s && s.found && s.status !== "pending" ? false : 3000;
    },
  });

  const settled = data && "found" in data && data.found && data.status !== "pending";

  useEffect(() => {
    if (settled) void refetchFuel();
  }, [settled, refetchFuel]);

  return (
    <div className="px-5 pb-10 pt-10 text-center">
      {!settled ? (
        <>
          <Loader2 className="mx-auto size-10 animate-spin text-primary" />
          <p className="mt-4 text-sm font-medium">Confirming your payment…</p>
        </>
      ) : (
        <>
          <CheckCircle2 className="mx-auto size-14 text-primary" />
          <h1 className="mt-4 text-xl font-semibold">Payment received</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {data && "found" in data && data.found && data.status === "credited"
              ? `${data.txcAmount?.toFixed(4)} TXC is on its way to your fuel address.`
              : data && "found" in data && data.found && data.status === "test"
                ? "Test-mode purchase — no fuel was credited on-chain."
                : "We're crediting your fuel address; it should appear shortly."}
          </p>
        </>
      )}
      <div className="mt-6 grid gap-2">
        <Link to="/publish" className="rounded-md bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground">
          Create a record
        </Link>
        <Link to="/settings" className="rounded-md border border-border px-4 py-3 text-sm font-semibold">
          Back to settings
        </Link>
      </div>
    </div>
  );
}
