import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck, ScanLine, FileSearch } from "lucide-react";
import { AssetLookup } from "@/components/site/AssetLookup";

export const Route = createFileRoute("/_site/verify/")({
  head: () => ({
    meta: [
      { title: "Verify an asset — BEVIS" },
      {
        name: "description",
        content:
          "Enter a BEVIS asset ID or public key to see every file, fingerprint, IPFS reference and blockchain transaction attached to it. No account required.",
      },
      { property: "og:title", content: "Verify an asset — BEVIS" },
      { property: "og:description", content: "Check any BEVIS record against the public blockchain." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://app.bevis.sg/verify" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://app.bevis.sg/verify" }],
  }),
  component: VerifyLanding,
});

function VerifyLanding() {
  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-16">
      <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Verify</p>
      <h1 className="mt-3 font-serif text-5xl text-foreground">Check the proof yourself.</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        Every BEVIS record is public. Enter the 6-digit asset ID printed on the item — or the public key it was
        recorded against — and read the whole history.
      </p>

      <AssetLookup className="mt-8" label="Asset ID or public key" hint="No account required." />

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {[
          { Icon: FileSearch, title: "Every file", body: "Names, types, sizes and fingerprints of everything ever attached." },
          { Icon: ShieldCheck, title: "Chain anchors", body: "The transactions that timestamped each record, linked to the explorer." },
          { Icon: ScanLine, title: "Certificates", body: "Download the verification certificate for your own files." },
        ].map(({ Icon, title, body }) => (
          <div key={title} className="rounded-lg border border-border bg-card p-5">
            <Icon className="size-5 text-primary" />
            <h2 className="mt-3 text-sm font-semibold text-foreground">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{body}</p>
          </div>
        ))}
      </div>

      <p className="mt-10 text-sm text-muted-foreground">
        Have a QR code instead?{" "}
        <Link to="/app/lookup" className="text-primary hover:underline">Scan it with the app</Link>.
      </p>
    </div>
  );
}
