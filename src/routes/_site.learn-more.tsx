import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_site/learn-more")({
  head: () => ({
    meta: [
      { title: "Learn more — the story behind BEVIS" },
      {
        name: "description",
        content:
          "From a daily manufacturing log published to the blockchain in 2017 to a verification service anyone can use: how BEVIS came to be and where it's going.",
      },
      { property: "og:title", content: "Learn more — the story behind BEVIS" },
      { property: "og:description", content: "How BEVIS came to be, and why proof belongs on a public ledger." },
      { property: "og:type", content: "article" },
      { property: "og:url", content: "https://app.bevis.sg/learn-more" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://app.bevis.sg/learn-more" }],
  }),
  component: LearnMore,
});

const SECTIONS = [
  {
    title: "The genesis",
    body: [
      "In 2017, our sister company engineered and created Cold Storage Coins: a physical coin that combines the quintessential bitcoin image with laser technology and tamper-evident security seals, resulting in the easiest way to own Bitcoin and other digital currencies.",
      "The team kept a daily manufacturing log and published it each day to the blockchain — a revolutionary act in the predominantly secretive world of cryptocurrency. They believed that sharing behind-the-scenes details of the manufacturing process would help consumers establish confidence in the product. They were right.",
    ],
  },
  {
    title: "The technology",
    body: [
      "Expanding on that simple but profound concept, the same mentality was applied to other product lines — coins, silver figurines, and minted investment-grade gold and silver bullion. Customers for those lines aren't as concerned about the manufacturing process, but they are very concerned about counterfeits and product integrity.",
      "Today the origin of the raw materials used to manufacture these precious metal products is secured with blockchain technology — an industry first. Each asset features a 6-digit asset ID, connecting it forever with the story of its origin, permanently secured by blockchain and the InterPlanetary File System.",
    ],
  },
  {
    title: "We call it BEVIS, and it means proof",
    body: [
      "While the vast majority of industry players focus on digital currency applications and the intermediary financial services they create, we see an opportunity to deliver on blockchain's original promise: making the world safer, more honest and more transparent.",
      "Many enthusiasts preach the broad benefits of blockchain technology, yet few — including self-proclaimed industry leaders — actually use it to the benefit of themselves or their customers. Outside the Bitcoin community, real-world practical blockchain solutions are nearly non-existent.",
    ],
  },
  {
    title: "The blockchain",
    body: [
      "The time to deliver on blockchain's promise is now. BEVIS is blockchain for everyone: anyone — from individuals to multinational manufacturing giants — can use BEVIS as their onramp to blockchain's permanence and transparency.",
      "Many hail blockchain as the most important technological advancement since the internet. BEVIS makes that statement a reality.",
    ],
  },
  {
    title: "The future",
    body: [
      "Any legitimate business with a story worth telling can gain a competitive edge with BEVIS. Serialise both tangible and intangible assets — goods, services, documents, files, photos, videos, deals, contracts and just about anything else.",
      "Then attach any information or media to that asset, share it through decentralised servers, and record it permanently to the blockchain. With BEVIS, anyone can win with blockchain.",
    ],
  },
];

function LearnMore() {
  return (
    <article className="mx-auto w-full max-w-3xl px-5 py-16">
      <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Learn more</p>
      <h1 className="mt-3 font-serif text-5xl leading-tight text-foreground">
        A daily log, published forever.
      </h1>
      <p className="mt-4 text-lg text-muted-foreground">
        BEVIS grew out of a simple habit: telling the truth in public, every single day, where nobody could
        change it afterwards.
      </p>

      <div className="mt-12 space-y-12">
        {SECTIONS.map((s) => (
          <section key={s.title}>
            <h2 className="font-serif text-3xl text-foreground">{s.title}</h2>
            {s.body.map((p) => (
              <p key={p.slice(0, 32)} className="mt-4 text-muted-foreground">{p}</p>
            ))}
          </section>
        ))}
      </div>

      <div className="mt-14 rounded-xl border border-border bg-card p-7">
        <h2 className="font-serif text-2xl text-foreground">Ready to try it?</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Record your first file in a couple of minutes — no setup, no contract.
        </p>
        <Link
          to="/app/publish"
          className="mt-5 inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
        >
          Open the app <ArrowRight className="size-4" />
        </Link>
      </div>
    </article>
  );
}
