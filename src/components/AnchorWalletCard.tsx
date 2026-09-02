/**
 * Notarisation fuel.
 *
 * Every stamp on the chain costs a little TEXITcoin, and it comes out of the
 * record-keeper's own pocket. This card shows their personal deposit address,
 * what's in it, and how many more records that buys.
 */

import { Fuel, Copy, RefreshCw, CreditCard } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { useFuel } from "@/lib/useFuel";


export function AnchorWalletCard() {
  const { data, isFetching, refetch } = useFuel();
  const low = data?.ok && data.anchorsRemaining < 5;

  return (
    <section className="mb-6 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Fuel className="size-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Notarisation fuel</h2>
        </div>
        <button
          onClick={() => void refetch()}
          className="rounded-md p-1 text-muted-foreground hover:text-foreground"
          aria-label="Refresh fuel balance"
        >
          <RefreshCw className={`size-4 ${isFetching ? "animate-spin" : ""}`} />
        </button>
      </div>

      {!data ? (
        <p className="mt-2 text-xs text-muted-foreground">Checking your fuel…</p>
      ) : data.ok ? (
        <div className="mt-3 space-y-2">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">{data.balanceTxc.toFixed(4)}</span>
            <span className="text-xs text-muted-foreground">TXC</span>
          </div>
          <p className={`text-xs ${low ? "text-destructive" : "text-muted-foreground"}`}>
            Enough for {data.anchorsRemaining.toLocaleString()} more record
            {data.anchorsRemaining === 1 ? "" : "s"} · {data.costPerAnchorTxc.toFixed(5)} TXC each
          </p>
          <p className="text-[11px] text-muted-foreground">
            Each record costs ${data.serviceFeeUsd.toFixed(2)} for the BEVIS service
            {data.serviceFeeTxc > 0 ? ` (${data.serviceFeeTxc.toFixed(5)} TXC at today's price)` : ""}, plus the
            chain's own network fee and the asset's inbox payment.
          </p>
          <p className="text-[11px] text-muted-foreground">
            Top up with a card, or send TXC straight to this address. It's yours — nothing else spends from it.
          </p>
          <Link
            to="/topup"
            className="flex items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <CreditCard className="size-3.5" /> Top up with a card
          </Link>
          <button
            onClick={() => {
              void navigator.clipboard.writeText(data.address);
              toast.success("Your fuel address is copied");
            }}
            className="flex w-full items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-left"
          >
            <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-foreground">{data.address}</span>
            <Copy className="size-3.5 shrink-0 text-muted-foreground" />
          </button>

        </div>
      ) : (
        <p className="mt-2 text-xs text-destructive">{data.error}</p>
      )}
    </section>
  );
}
