import { createFileRoute, Link } from "@tanstack/react-router";
import { Footer } from "@/components/Footer";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/manifesto")({
  head: () => ({
    meta: [
      { title: "Manifesto — BEVIS" },
      { name: "description", content: "Proof should outlive the paperwork. Why BEVIS records evidence to a permanent public ledger." },
      { property: "og:title", content: "The BEVIS Manifesto" },
      { property: "og:description", content: "Proof should outlive the paperwork." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Manifesto,
});

function Manifesto() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <Link to="/" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Home
      </Link>
      <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Manifesto</p>
      <h1 className="mt-2 font-serif text-5xl text-foreground">Proof should outlive the paperwork.</h1>

      <div className="prose prose-invert mt-8 space-y-5 text-muted-foreground">
        <p className="text-lg text-foreground">
          <span className="font-serif italic">bevis</span> /bee-vus/ — Swedish for proof; evidence; that which tends to prove
          or disprove something. We made it a verb: to record something to the blockchain for permanent, undisputable proof.
        </p>

        <h2 className="mt-8 font-serif text-2xl text-foreground">Records belong to the thing, not the company.</h2>
        <p>A car, a painting, a pallet of parts, a deed — the history should travel with the asset, not live in a vendor's database that can be sold, breached, or shut down. Every BEVIS record is written to a public ledger and pinned to IPFS. If we disappeared tomorrow, your proof would still be there.</p>

        <h2 className="mt-8 font-serif text-2xl text-foreground">Two buttons — that's all you need.</h2>
        <p>READ: scan a code and see everything ever filed against that asset. WRITE: add the receipt, the service record, the certificate, the photo. Blockchain should feel like a filing cabinet, not a cryptography exam.</p>

        <h2 className="mt-8 font-serif text-2xl text-foreground">Append, never rewrite.</h2>
        <p>A record book is only worth something if nobody can quietly edit the past. Records are added, timestamped, and anchored. Corrections are new entries, visible alongside what they correct. The chain keeps us all honest — including us.</p>

        <h2 className="mt-8 font-serif text-2xl text-foreground">Private by default, public by choice.</h2>
        <p>Files are encrypted before they leave your device. You decide what is open to anyone with the asset ID and what stays sealed to you. We don't sell your records, your addresses, or your activity — not to advertisers, not to analytics vendors, not to chain-analysis firms.</p>

        <h2 className="mt-8 font-serif text-2xl text-foreground">Transparency beats trust.</h2>
        <p>Counterfeits, altered odometers, phantom service histories and paper certificates all rely on the same thing: you having to take someone's word for it. Verifiable provenance ends the argument. That's better for buyers, and better for anyone with nothing to hide.</p>

        <h2 className="mt-8 font-serif text-2xl text-foreground">We answer to the holder.</h2>
        <p>Not to a regulator. Not to a payment processor. Not to an analytics partner. To the person holding the asset. Always.</p>
      </div>

      <Footer />
    </div>
  );
}
