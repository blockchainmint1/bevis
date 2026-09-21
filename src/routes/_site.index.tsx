import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ScanLine, FilePlus2, ShieldCheck, Factory, Lock, Clock, Globe2, ArrowRight,
} from "lucide-react";
import { AssetLookup } from "@/components/site/AssetLookup";
import { ContactForm } from "@/components/site/ContactForm";
import { Faq } from "@/components/site/Faq";

export const Route = createFileRoute("/_site/")({
  head: () => ({
    meta: [
      { title: "BEVIS — Blockchain for everyone" },
      {
        name: "description",
        content:
          "Add an unprecedented level of proof to your documents, receipts, records and supply chain data. Read and write to a permanent public ledger with two buttons.",
      },
      { property: "og:title", content: "BEVIS — Blockchain for everyone" },
      {
        property: "og:description",
        content: "Permanent, verifiable proof for documents, receipts, products and supply chain data.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://app.bevis.sg/" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "BEVIS — Blockchain for everyone" },
      { name: "twitter:description", content: "Permanent, verifiable proof for the things that matter." },
    ],
    links: [{ rel: "canonical", href: "https://app.bevis.sg/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "Rearden Metals Pte Ltd",
          url: "https://app.bevis.sg/",
          email: "service@bevis.sg",
          address: {
            "@type": "PostalAddress",
            streetAddress: "25B Loyang Crescent #03-15",
            addressCountry: "SG",
            postalCode: "506817",
          },
        }),
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="border-b border-border/60 bg-gradient-to-b from-secondary/60 to-background">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-16 md:grid-cols-2 md:py-24">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
              Blockchain enabled verification &amp; information service
            </p>
            <h1 className="mt-4 font-serif text-5xl leading-tight text-foreground md:text-6xl">
              Bevis is blockchain for everyone.
            </h1>
            <p className="mt-5 max-w-md text-lg text-muted-foreground">
              Add an unprecedented level of proof to your vital documents, receipts, records, business
              manufacturing &amp; supply chain data — and much more.
            </p>

            <AssetLookup className="mt-8 max-w-md" />

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/app/publish"
                className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
              >
                Record something now <ArrowRight className="size-4" />
              </Link>
              <Link
                to="/learn-more"
                className="inline-flex items-center gap-2 rounded-md border border-border px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-secondary"
              >
                Learn more
              </Link>
            </div>
          </div>

          <div className="flex items-center justify-center">
            <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-lg">
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                bevis <span className="normal-case tracking-normal">/bee-vus/</span>
              </p>
              <p className="mt-4 text-xs uppercase tracking-wide text-muted-foreground">noun</p>
              <p className="mt-1 text-sm text-foreground">
                That which tends to prove or disprove something; ground for belief; proof. Evidence; receipt;
                token; body of evidence.
              </p>
              <p className="mt-5 text-xs uppercase tracking-wide text-muted-foreground">verb</p>
              <p className="mt-1 text-sm text-foreground">
                To record something to the blockchain for permanent, indisputable proof.
              </p>
              <p className="mt-4 border-l-2 border-primary pl-3 font-serif text-sm italic text-muted-foreground">
                “Hey man, why don't you bevis that idea so everyone knows it's yours?”
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Two buttons */}
      <section className="mx-auto w-full max-w-6xl px-5 py-20">
        <h2 className="font-serif text-4xl text-foreground">Two buttons — that's all you need.</h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          With BEVIS, anyone can win with blockchain — the permanent public ledger. Whether you're verifying a
          new acquisition, recording a purchase receipt or sharing data with a customer, BEVIS makes blockchain
          access easy.
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-7">
            <ScanLine className="size-8 text-primary" />
            <h3 className="mt-4 font-serif text-2xl text-foreground">Read</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Scan any BEVIS QR code and get instant access to the permanent data on the blockchain — digital
              certificates, photos, files and every other record attached to that asset.
            </p>
            <Link
              to="/app/lookup"
              className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
            >
              Scan a code <ArrowRight className="size-4" />
            </Link>
          </div>

          <div className="rounded-xl border border-border bg-card p-7">
            <FilePlus2 className="size-8 text-primary" />
            <h3 className="mt-4 font-serif text-2xl text-foreground">Write</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Create a new asset record or add more media to an existing one, and write it to the blockchain —
              building an immutable digital filing cabinet you own forever.
            </p>
            <Link
              to="/app/publish"
              className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
            >
              Write to the blockchain <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {[
            { Icon: Clock, title: "Time-stamped forever", body: "Every record carries a public timestamp that cannot be edited or removed." },
            { Icon: Lock, title: "Encrypt if you need to", body: "Keep the file private and still prove exactly when it existed and what it contained." },
            { Icon: Globe2, title: "Anyone can check it", body: "Share one link. Anyone can verify the record against the public chain — no account needed." },
          ].map(({ Icon, title, body }) => (
            <div key={title} className="rounded-lg border border-border/70 bg-secondary/30 p-5">
              <Icon className="size-5 text-primary" />
              <h3 className="mt-3 text-sm font-semibold text-foreground">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Business */}
      <section className="border-y border-border/60 bg-secondary/30">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-5 py-20 md:grid-cols-2">
          <div>
            <Factory className="size-8 text-primary" />
            <h2 className="mt-4 font-serif text-4xl text-foreground">BEVIS for business</h2>
            <p className="mt-3 text-muted-foreground">
              Cut down on fraud and counterfeits, protect your brand, and give your customers a window onto your
              factory floor. Transparency builds consumer confidence.
            </p>
            <Link
              to="/business"
              className="mt-6 inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              See how it works <ArrowRight className="size-4" />
            </Link>
          </div>
          <ul className="space-y-4 self-center">
            {[
              "Serialise every unit with a 6-digit asset ID.",
              "Attach QC reports, bills of lading, inspection video and certificates.",
              "Publish the origin of raw materials, permanently.",
              "Let buyers verify authenticity in seconds with one scan.",
            ].map((item) => (
              <li key={item} className="flex gap-3 text-sm text-foreground">
                <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* See it in action */}
      <section id="verify" className="mx-auto w-full max-w-6xl px-5 py-20">
        <div className="grid gap-10 md:grid-cols-2">
          <div>
            <h2 className="font-serif text-4xl text-foreground">See BEVIS in action</h2>
            <p className="mt-3 text-muted-foreground">
              Enter a 6-digit asset ID and learn the story behind the asset: every file, fingerprint, IPFS
              reference and blockchain transaction attached to it.
            </p>
            <Link
              to="/verify"
              className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
            >
              Open the verification page <ArrowRight className="size-4" />
            </Link>
          </div>
          <AssetLookup
            label="Look up an asset"
            hint="No account needed. The record and its chain proof are public."
          />
        </div>
      </section>

      {/* FAQ */}
      <section id="help" className="border-t border-border/60 bg-secondary/20">
        <div className="mx-auto w-full max-w-3xl px-5 py-20">
          <h2 className="font-serif text-4xl text-foreground">Frequently asked questions</h2>
          <Faq className="mt-8" />
          <p className="mt-8 text-sm text-muted-foreground">
            Still stuck? <Link to="/help" className="text-primary hover:underline">Visit the help page</Link> or
            write to us below.
          </p>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="mx-auto w-full max-w-3xl px-5 py-20">
        <h2 className="font-serif text-4xl text-foreground">We're here to help</h2>
        <p className="mt-3 text-muted-foreground">
          Using BEVIS is easy. Our team is standing by to help you put it to good use — and we can even suggest
          ways BEVIS can make your world more honest and transparent.
        </p>
        <ContactForm className="mt-8" />
      </section>
    </>
  );
}
