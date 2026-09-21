import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Camera, FileText, Home, Car, HeartHandshake, Palette } from "lucide-react";
import { AssetLookup } from "@/components/site/AssetLookup";

export const Route = createFileRoute("/_site/personal")({
  head: () => ({
    meta: [
      { title: "BEVIS for people — proof for the things you own" },
      {
        name: "description",
        content:
          "Record receipts, valuations, service history, contracts and photos to a public blockchain so you can prove what you own, when you owned it, and what it was.",
      },
      { property: "og:title", content: "BEVIS for people — proof for the things you own" },
      { property: "og:description", content: "Permanent, timestamped proof for receipts, valuations, contracts and photos." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://app.bevis.sg/personal" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://app.bevis.sg/personal" }],
  }),
  component: Personal,
});

const USES = [
  { Icon: Car, title: "Your car", body: "Service records, mileage photos, the purchase invoice — a history a buyer can actually trust." },
  { Icon: Palette, title: "Collectibles & art", body: "Provenance, condition photos, valuations and certificates, all tied to one asset ID." },
  { Icon: Home, title: "Property & renovations", body: "Contracts, permits, before-and-after photos and payment receipts, timestamped as they happen." },
  { Icon: FileText, title: "Important documents", body: "Wills, agreements, IP drafts and letters — prove the exact contents existed on a given day." },
  { Icon: HeartHandshake, title: "Life events", body: "Marriages, births, promises and milestones, kept in a record book that can't be rewritten." },
  { Icon: Camera, title: "Anything you photograph", body: "Damage, deliveries, meter readings, hand-offs. Snap it, record it, prove it later." },
];

function Personal() {
  return (
    <>
      <section className="border-b border-border/60 bg-gradient-to-b from-secondary/60 to-background">
        <div className="mx-auto w-full max-w-4xl px-5 py-16 text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Personal</p>
          <h1 className="mt-3 font-serif text-5xl leading-tight text-foreground">
            Proof for the things you own.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Receipts fade, emails vanish, folders get lost. A BEVIS record is timestamped on a public ledger the
            day you make it — and stays there.
          </p>
          <Link
            to="/app/publish"
            className="mt-8 inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            Record your first file <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-5 py-20">
        <h2 className="font-serif text-4xl text-foreground">What people record</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {USES.map(({ Icon, title, body }) => (
            <div key={title} className="rounded-xl border border-border bg-card p-6">
              <Icon className="size-6 text-primary" />
              <h3 className="mt-4 font-serif text-xl text-foreground">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-border/60 bg-secondary/30">
        <div className="mx-auto w-full max-w-4xl px-5 py-20">
          <h2 className="font-serif text-4xl text-foreground">How it works</h2>
          <ol className="mt-8 space-y-6">
            {[
              ["Pick a file", "A photo, a PDF, a video, a voice note — anything on your phone or computer."],
              ["Choose your privacy", "Publish it openly, or encrypt it so only the fingerprint goes public."],
              ["We fingerprint and anchor it", "BEVIS pins the file, writes its fingerprint to the chain, and hands you a certificate."],
              ["Share the link", "Anyone can verify it — no account, no app, no permission needed."],
            ].map(([title, body], i) => (
              <li key={title} className="flex gap-5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary font-mono text-sm font-semibold text-primary-foreground">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-semibold text-foreground">{title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto w-full max-w-3xl px-5 py-20">
        <h2 className="font-serif text-3xl text-foreground">Already have an asset ID?</h2>
        <AssetLookup className="mt-6" />
      </section>
    </>
  );
}
