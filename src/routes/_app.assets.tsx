import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { FileStack, Plus, ShieldCheck, Clock, ScanLine } from "lucide-react";

import { listMyBevisAssets } from "@/lib/bevis.functions";
import { useAuth } from "@/hooks/use-auth";
import { ThemeToggle } from "@/components/ThemeToggle";

export const Route = createFileRoute("/_app/assets")({
  head: () => ({
    meta: [
      { title: "Your notarised assets — BEVIS" },
      {
        name: "description",
        content: "Every file you've stamped onto the TEXITcoin blockchain, with its asset ID, public key and chain proof.",
      },
      { property: "og:title", content: "Your notarised assets — BEVIS" },
      { property: "og:description", content: "Your blockchain notary records, all in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AssetsPage,
});

function AssetsPage() {
  const { user, ready } = useAuth();
  const navigate = useNavigate();
  const listFn = useServerFn(listMyBevisAssets);

  const { data, isLoading } = useQuery({
    queryKey: ["bevis-assets", user?.id],
    queryFn: () => listFn(),
    enabled: !!user,
  });

  return (
    <div className="px-5 pb-10 pt-6">
      <header className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">BEVIS</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Your assets</h1>
        </div>
        <ThemeToggle />
      </header>

      {ready && !user && (
        <EmptyState
          title="Sign in to see your records"
          body="Your notarised assets are tied to your account."
          action={{ label: "Sign in", onClick: () => navigate({ to: "/auth" }) }}
        />
      )}

      {user && isLoading && <p className="py-16 text-center text-sm text-muted-foreground">Loading…</p>}

      {user && !isLoading && (data?.length ?? 0) === 0 && (
        <EmptyState
          title="Nothing notarised yet"
          body="Choose or capture a file and BEVIS will stamp its fingerprint onto the TEXITcoin chain."
          action={{ label: "Notarise a file", onClick: () => navigate({ to: "/publish" }) }}
        />
      )}

      <ul className="space-y-3">
        {(data ?? []).map(a => (
          <li key={a.id}>
            <Link
              to="/asset/$assetId"
              params={{ assetId: a.assetId }}
              className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/60"
            >
              <div className="grid size-12 shrink-0 place-items-center rounded-lg bg-secondary">
                <FileStack className="size-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{a.name ?? a.latestFileName ?? "Untitled asset"}</p>
                <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{a.assetId}</p>
                <p className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span>{a.fileCount} file{a.fileCount === 1 ? "" : "s"}</span>
                  {a.anchoredCount === a.fileCount ? (
                    <span className="inline-flex items-center gap-1 text-primary">
                      <ShieldCheck className="size-3" /> anchored
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-amber-500">
                      <Clock className="size-3" /> {a.fileCount - a.anchoredCount} pending
                    </span>
                  )}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {user && (
        <div className="mt-6 grid gap-2">
          <Link
            to="/publish"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground"
          >
            <Plus className="size-4" /> Notarise a file
          </Link>
          <Link
            to="/lookup"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-border px-4 py-3 text-sm font-semibold"
          >
            <ScanLine className="size-4" /> Scan a BEVIS code
          </Link>
        </div>
      )}
    </div>
  );
}

function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action: { label: string; onClick: () => void };
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border px-6 py-14 text-center">
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">{body}</p>
      <button
        onClick={action.onClick}
        className="mt-6 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
      >
        {action.label}
      </button>
    </div>
  );
}
