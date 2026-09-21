import { useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Search } from "lucide-react";

export function AssetLookup({
  label = "Validate your asset",
  hint = "Enter an asset ID to view its blockchain verification.",
  className = "",
}: {
  label?: string;
  hint?: string;
  className?: string;
}) {
  const navigate = useNavigate();
  const [key, setKey] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    const value = key.trim();
    if (!value) return;
    void navigate({ to: "/verify/$key", params: { key: value } });
  }

  return (
    <form onSubmit={submit} className={`rounded-xl border border-border bg-card/80 p-5 shadow-sm ${className}`}>
      <label htmlFor="asset-lookup" className="block text-sm font-semibold text-foreground">
        {label}
      </label>
      <div className="mt-3 flex gap-2">
        <input
          id="asset-lookup"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="Asset ID (e.g. 4f3eb4) or public key"
          className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          disabled={!key.trim()}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
        >
          <Search className="size-4" /> Verify
        </button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{hint}</p>
    </form>
  );
}
