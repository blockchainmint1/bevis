import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Boxes, ShieldCheck, Truck, Microscope, Building2, QrCode } from "lucide-react";

export const Route = createFileRoute("/_site/business")({
  head: () => ({
    meta: [
      { title: "BEVIS for business — serialise, prove, publish" },
      {
        name: "description",
        content:
          "Cut fraud and counterfeits, protect your brand and give customers a window onto your factory floor. Serialise products with a BEVIS asset ID and publish proof to a public blockchain.",
      },
      { property: "og:title", content: "BEVIS for business — serialise, prove, publish" },
      { property: "og:description", content: "Anti-counterfeit serialisation and supply-chain transparency on a public ledger." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://app.bevis.sg/business" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://app.bevis.sg/business" }],
  }),
  component: Business,
});

const BENEFITS = [
  { Icon: ShieldCheck, title: "Anti-counterfeit", body: "Each unit carries its own asset ID. A copy of the label can't fake the chain history behind it." },
  { Icon: Microscope, title: "Quality on record", body: "Publish QC reports, test certificates and inspection video the moment they're signed off." },
  { Icon: Truck, title: "Supply chain visibility", body: "Bills of lading, origin of raw materials, handling and custody, recorded as events happen." },
  { Icon: Building2, title: "Compliance evidence", body: "A tamper-proof audit trail regulators and insurers can verify themselves." },
  { Icon: QrCode, title: "One scan for customers", body: "A QR on the product opens the whole story — no app install required." },
  { Icon: Boxes, title: "Batch or unit level", body: "Serialise a production run or every individual item; attach media to either." },
];

function Business() {
  return (
    <>
      <section className="border-b border-border/60 bg-gradient-to-b from-secondary/60 to-background">
        <div className="mx-auto w-full max-w-4xl px-5 py-16">
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Business</p>
          <h1 className="mt-3 font-serif text-5xl leading-tight text-foreground">
            Transparency builds consumer confidence.
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            Cut down on fraud and counterfeits, protect your brand, and give your valued customers a window onto
            your factory floor — with proof they can check themselves.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="/#contact"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              Talk to sales <ArrowRight className="size-4" />
            </a>
            <Link
              to="/app/publish"
              className="inline-flex items-center gap-2 rounded-md border border-border px-6 py-3 text-sm font-semibold text-foreground transition hover:bg-secondary"
            >
              Try it yourself
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-5 py-20">
        <h2 className="font-serif text-4xl text-foreground">What you get</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map(({ Icon, title, body }) => (
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
          <h2 className="font-serif text-4xl text-foreground">A working example</h2>
          <p className="mt-3 text-muted-foreground">
            Our own mint has published a daily manufacturing log to a public chain since 2017. Every precious
            metal product carries a 6-digit asset ID that links the finished item to the origin of its raw
            material, the day it was struck, and the people who checked it.
          </p>
          <p className="mt-4 text-muted-foreground">
            Customers scan the coin, read the story, and trust what they're holding. That is the entire product,
            and now any business can have it.
          </p>
          <Link
            to="/learn-more"
            className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
          >
            Read the full story <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      <section className="mx-auto w-full max-w-3xl px-5 py-20 text-center">
        <h2 className="font-serif text-4xl text-foreground">Let's map it to your line.</h2>
        <p className="mt-3 text-muted-foreground">
          Tell us what you make and how you make it, and we'll show you exactly what a BEVIS record would look
          like for one of your units.
        </p>
        <a
          href="/#contact"
          className="mt-7 inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
        >
          Contact corporate sales <ArrowRight className="size-4" />
        </a>
      </section>
    </>
  );
}
