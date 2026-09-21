import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";

export const FAQ_ITEMS = [
  {
    q: "What kind of assets can I record with BEVIS?",
    a: "There is no limit. Record your car and save its service history. Record the receipt for an expensive luxury item so you can prove it's authentic when you sell. Record your marriage and keep a permanent history of relationship events. The possibilities are limited only by your imagination.",
  },
  {
    q: "Why should I use a public blockchain to serialise my products?",
    a: "A public blockchain works like a one-way, read-only inbox. Once you attach a BEVIS asset ID to your goods, you can permanently connect digital media to that ID and make the same information instantly available to your customers — a quality control report, a bill of lading, an inspection video or your latest company registration data.",
  },
  {
    q: "Can I encrypt my files and still benefit from BEVIS?",
    a: "Yes. Whether you secure a file with your own tools or with the encryption built into the BEVIS app, you still get the immutable link between your file and its proof of existence on a public blockchain. Only the fingerprint goes public — the contents stay yours.",
  },
  {
    q: "Which blockchain does BEVIS use?",
    a: "Records are anchored to the TEXITcoin chain, with files pinned to IPFS so they stay retrievable. We keep an eye on emerging chains and add options over time — tell us if something you need is missing.",
  },
  {
    q: "I posted something to the wrong asset ID. Can I delete it?",
    a: "No. The blockchain is forever: permanent and impossible to edit. That's the whole point — so check your post carefully before you publish it, because it cannot be undone.",
  },
  {
    q: "What does a record cost?",
    a: "Each blockchain post costs a small service fee, paid from the fuel balance in your account. You can top that balance up by card inside the app.",
  },
];

export function Faq({ className = "" }: { className?: string }) {
  return (
    <Accordion type="single" collapsible className={className}>
      {FAQ_ITEMS.map((item, i) => (
        <AccordionItem key={item.q} value={`item-${i}`}>
          <AccordionTrigger className="text-left text-base text-foreground">{item.q}</AccordionTrigger>
          <AccordionContent className="text-sm text-muted-foreground">{item.a}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
