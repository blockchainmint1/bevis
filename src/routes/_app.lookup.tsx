import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ScanLine } from "lucide-react";

import { QrScanner } from "@/components/QrScanner";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_app/lookup")({
  head: () => ({
    meta: [
      { title: "Scan a BEVIS code — verify a record" },
      {
        name: "description",
        content: "Scan a BEVIS QR code or type an Asset ID to read every file notarised to that public key on the TEXITcoin chain.",
      },
      { property: "og:title", content: "Scan a BEVIS code — verify a record" },
      { property: "og:description", content: "Check any BEVIS notary record against the blockchain." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LookupPage,
});

function LookupPage() {
  const navigate = useNavigate();
  const [manual, setManual] = useState("");

  function go(raw: string) {
    const key = raw.trim().replace(/^bevis:\/\//i, "");
    if (!key) return;
    void navigate({ to: "/verify/$key", params: { key } });
  }

  return (
    <div className="px-5 pb-10 pt-6">
      <header className="mb-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">BEVIS</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Scan a code</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Point the camera at a BEVIS QR code to read everything published to that asset.
        </p>
      </header>

      <QrScanner onResult={go} />

      <form
        onSubmit={e => { e.preventDefault(); go(manual); }}
        className="mt-6 space-y-3 rounded-xl border border-border bg-card p-4"
      >
        <label htmlFor="manual" className="text-xs font-medium text-muted-foreground">
          Or type an Asset ID / public key
        </label>
        <Input
          id="manual"
          value={manual}
          onChange={e => setManual(e.target.value)}
          placeholder="A1B2C3"
          className="font-mono"
        />
        <button
          type="submit"
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          <ScanLine className="size-4" /> Look it up
        </button>
      </form>
    </div>
  );
}
