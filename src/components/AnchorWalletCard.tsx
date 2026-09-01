/**
 * Anchoring budget monitor.
 *
 * Every notarisation spends a little TEXITcoin. Nobody watches a node wallet
 * until it silently stops paying, so the balance and remaining runway are
 * shown here in plain sight, with the address to top up.
 */

import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Fuel, Copy, RefreshCw } from "lucide-react";
import { getAnchorWalletStatus } from "@/lib/bevis.functions";
import { toast } from "sonner";

export function AnchorWalletCard() {
  const fetchStatus = useServerFn(getAnchorWalletStatus);
  const { data, isFetching, refetch } = useQuery({
    queryKey: ["anchor-wallet"],
    queryFn: () => fetchStatus({}),
    staleTime: 60_000,
  });

  const low = data?.ok && data.anchorsRemaining < 25;

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Fuel className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Notarisation fuel</h2>
        </div>
        <button
          onClick={() => void refetch()}
          className="rounded-md p-1 text-muted-foreground hover:text-foreground"
          aria-label="Refresh anchoring balance"
        >
          <RefreshCw className={`size-4 ${isFetching ? "animate-spin" : ""}`} />
        </button>
      </div>

      {!data ? (
        <p className="mt-2 text-xs text-muted-foreground">Checking the anchoring wallet…</p>
      ) : data.ok ? (
        <div className="mt-3 space-y-2">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">{data.balanceTxc.toFixed(4)}</span>
            <span className="text-xs text-muted-foreground">TXC</span>
          </div>
          <p className={`text-xs ${low ? "text-destructive" : "text-muted-foreground"}`}>
            ≈ {data.anchorsRemaining.toLocaleString()} more notarisations
            {low ? " — top this up soon." : ""}
          </p>
          <button
            onClick={() => {
              void navigator.clipboard.writeText(data.address);
              toast.success("Anchoring address copied");
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
