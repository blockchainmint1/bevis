import { createFileRoute, Link } from "@tanstack/react-router";
import { Faq, FAQ_ITEMS } from "@/components/site/Faq";
import { ContactForm } from "@/components/site/ContactForm";

export const Route = createFileRoute("/_site/help")({
  head: () => ({
    meta: [
      { title: "Help & FAQ — BEVIS" },
      {
        name: "description",
        content: "Answers to common BEVIS questions: what you can record, encryption, costs, which blockchain we use, and how to reach our team.",
      },
      { property: "og:title", content: "Help & FAQ — BEVIS" },
      { property: "og:description", content: "Common questions about recording and verifying with BEVIS." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://app.bevis.sg/help" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://app.bevis.sg/help" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQ_ITEMS.map((i) => ({
            "@type": "Question",
            name: i.q,
            acceptedAnswer: { "@type": "Answer", text: i.a },
          })),
        }),
      },
    ],
  }),
  component: Help,
});

function Help() {
  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-16">
      <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Help</p>
      <h1 className="mt-3 font-serif text-5xl text-foreground">We're here to help.</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        Using BEVIS is easy. Our team is standing by to help you put it to good use.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        <Link to="/personal" className="rounded-lg border border-border bg-card p-5 hover:bg-secondary/40">
          <h2 className="font-semibold text-foreground">Getting started</h2>
          <p className="mt-1 text-sm text-muted-foreground">What to record and how.</p>
        </Link>
        <Link to="/verify" className="rounded-lg border border-border bg-card p-5 hover:bg-secondary/40">
          <h2 className="font-semibold text-foreground">Verify an asset</h2>
          <p className="mt-1 text-sm text-muted-foreground">Check any record against the chain.</p>
        </Link>
        <Link to="/app/topup" className="rounded-lg border border-border bg-card p-5 hover:bg-secondary/40">
          <h2 className="font-semibold text-foreground">Billing &amp; fuel</h2>
          <p className="mt-1 text-sm text-muted-foreground">Top up the balance that pays for posts.</p>
        </Link>
      </div>

      <h2 className="mt-14 font-serif text-3xl text-foreground">Frequently asked questions</h2>
      <Faq className="mt-6" />

      <h2 className="mt-14 font-serif text-3xl text-foreground">Still need a hand?</h2>
      <ContactForm className="mt-6" />
    </div>
  );
}
