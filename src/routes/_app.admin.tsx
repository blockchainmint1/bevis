/**
 * Operator panel: house wallet health and the card top-up ledger.
 * Admin-only — the server functions refuse anyone without the admin role.
 */

import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Bell, Loader2, RefreshCw, ShieldAlert } from "lucide-react";

import { getAdminOverview, retryTopup, testHouseAlert } from "@/lib/admin.functions";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_app/admin")({
  head: () => ({
    meta: [
      { title: "Operator panel — BEVIS" },
      { name: "description", content: "House wallet balance and card top-up ledger for BEVIS operators." },
      { property: "og:title", content: "Operator panel — BEVIS" },
      { property: "og:description", content: "House wallet balance and card top-up ledger for BEVIS operators." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPage,
});

function money(cents: number, currency = "usd") {
  return `${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`;
}

function AdminPage() {
  const { user, ready } = useAuth();
  const overview = useServerFn(getAdminOverview);
  const retry = useServerFn(retryTopup);
  const alertNow = useServerFn(testHouseAlert);
  const [busy, setBusy] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["admin-overview"],
    queryFn: () => overview(),
    enabled: ready && !!user,
    retry: false,
  });

  async function onRetry(sessionId: string) {
    setBusy(sessionId);
    const t = toast.loading("Sending the coin…");
    try {
      const r = await retry({ data: { sessionId } });
      toast.dismiss(t);
      if (r.ok) {
        toast.success("Credited", { description: r.txid });
        await q.refetch();
      } else {
        toast.error(r.error ?? "Could not credit this top-up.");
      }
    } catch (e) {
      toast.dismiss(t);
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function onAlert() {
    setBusy("alert");
    const t = toast.loading("Checking the house wallet…");
    try {
      const r = await alertNow({ data: { force: true } });
      toast.dismiss(t);
      if (r.alerted) toast.success(`Telegram sent — ${r.balanceTxc.toFixed(2)} TXC`);
      else toast.error(r.alertError ?? `Balance ${r.balanceTxc.toFixed(2)} TXC — no alert sent.`);
    } catch (e) {
      toast.dismiss(t);
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  if (ready && !user) {
    return (
      <div className="px-5 pt-16 text-center">
        <ShieldAlert className="mx-auto size-8 text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">Sign in with an operator account.</p>
        <Link to="/auth" className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          Sign in
        </Link>
      </div>
    );
  }

  const data = q.data;

  return (
    <div className="px-5 pt-10">
      <header className="mb-6 flex items-center gap-3">
        <Link to="/settings" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-5" />
        </Link>
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Operator</p>
          <h1 className="mt-1 font-serif text-3xl text-foreground">Admin</h1>
        </div>
      </header>

      {q.isLoading && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading…
        </p>
      )}
      {q.isError && (
        <p className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          {(q.error as Error).message === "Forbidden"
            ? "This account is not an operator."
            : (q.error as Error).message}
        </p>
      )}

      {data && (
        <>
          <section className="mb-5 rounded-xl border border-border bg-card p-4">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">House wallet</h2>
            {"error" in data.house ? (
              <p className="mt-2 text-sm text-destructive">{data.house.error}</p>
            ) : (
              <>
                <p className={`mt-2 text-2xl ${data.house.low ? "text-destructive" : "text-foreground"}`}>
                  {data.house.balanceTxc.toFixed(4)} TXC
                </p>
                <p className="mt-1 break-all font-mono text-[11px] text-muted-foreground">{data.house.address}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Alert floor {data.house.threshold} TXC · TXC ${data.txcPriceUsd?.toFixed(4) ?? "—"}
                </p>
              </>
            )}
            <button
              onClick={onAlert}
              disabled={busy === "alert"}
              className="mt-3 inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-60"
            >
              {busy === "alert" ? <Loader2 className="size-3.5 animate-spin" /> : <Bell className="size-3.5" />}
              Send test alert
            </button>
          </section>

          <section className="mb-4 grid grid-cols-3 gap-2 text-center">
            {[
              ["Top-ups", String(data.totals.count)],
              ["Gross", money(data.totals.grossCents)],
              ["Failed", String(data.totals.failed)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-border bg-card p-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
                <p className="mt-1 text-sm text-foreground">{value}</p>
              </div>
            ))}
          </section>

          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Top-ups</h2>
            <button onClick={() => q.refetch()} className="text-muted-foreground hover:text-foreground">
              <RefreshCw className={`size-4 ${q.isFetching ? "animate-spin" : ""}`} />
            </button>
          </div>

          <ul className="space-y-3 pb-10">
            {data.topups.length === 0 && <li className="text-sm text-muted-foreground">No top-ups yet.</li>}
            {data.topups.map(t => (
              <li key={t.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-foreground">{money(t.amountCents, t.currency)}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{t.email ?? t.ownerKey}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {new Date(t.createdAt).toLocaleString()} · {t.environment}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${
                      t.status === "credited"
                        ? "bg-primary/10 text-primary"
                        : t.status === "failed"
                          ? "bg-destructive/10 text-destructive"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {t.status}
                  </span>
                </div>

                {t.txcAmount !== null && (
                  <p className="mt-2 text-[11px] text-muted-foreground">{t.txcAmount.toFixed(4)} TXC → <span className="break-all font-mono">{t.address}</span></p>
                )}
                {t.txid && (
                  <a
                    href={`https://mempool.texitcoin.org/tx/${t.txid}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 block break-all font-mono text-[11px] text-primary hover:underline"
                  >
                    {t.txid}
                  </a>
                )}
                {t.error && <p className="mt-2 text-[11px] text-destructive">{t.error}</p>}

                {t.status !== "credited" && (
                  <button
                    onClick={() => onRetry(t.sessionId)}
                    disabled={busy === t.sessionId}
                    className="mt-3 inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                  >
                    {busy === t.sessionId ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
                    {busy === t.sessionId ? "Working…" : "Retry credit"}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
