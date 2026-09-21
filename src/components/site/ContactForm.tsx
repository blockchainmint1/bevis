import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const TOPICS = ["General inquiry", "Corporate sales", "Tech & support", "Billing inquiry"] as const;

export function ContactForm({ className = "" }: { className?: string }) {
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const payload = {
      name: String(fd.get("name") ?? "").trim(),
      email: String(fd.get("email") ?? "").trim(),
      topic: String(fd.get("topic") ?? TOPICS[0]),
      message: String(fd.get("message") ?? "").trim(),
    };
    if (!payload.name || !payload.email || !payload.message) {
      toast.error("Please fill in your name, email and message.");
      return;
    }

    setBusy(true);
    const { error } = await supabase.from("contact_messages").insert(payload);
    setBusy(false);

    if (error) {
      toast.error("We couldn't send that. Please email service@bevis.sg instead.");
      return;
    }
    form.reset();
    setSent(true);
    toast.success("Message sent — we'll be in touch.");
  }

  if (sent) {
    return (
      <div className={`rounded-xl border border-border bg-card p-8 text-center ${className}`}>
        <h3 className="font-serif text-2xl text-foreground">Thank you.</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Your message has been sent. We reply to most enquiries within one business day.
        </p>
        <button
          type="button"
          onClick={() => setSent(false)}
          className="mt-5 text-sm font-semibold text-primary hover:underline"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className={`rounded-xl border border-border bg-card p-6 ${className}`}>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium text-foreground">Your name</span>
          <input
            name="name"
            required
            className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-foreground">Email</span>
          <input
            name="email"
            type="email"
            required
            className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </label>
      </div>

      <label className="mt-4 block text-sm">
        <span className="font-medium text-foreground">What's this about?</span>
        <select
          name="topic"
          className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
        >
          {TOPICS.map((t) => <option key={t}>{t}</option>)}
        </select>
      </label>

      <label className="mt-4 block text-sm">
        <span className="font-medium text-foreground">Message</span>
        <textarea
          name="message"
          rows={5}
          required
          className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </label>

      <button
        type="submit"
        disabled={busy}
        className="mt-5 inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        {busy ? "Sending…" : "Submit"}
      </button>
      <p className="mt-3 text-xs text-muted-foreground">
        Or write to <a href="mailto:service@bevis.sg" className="underline">service@bevis.sg</a>.
      </p>
    </form>
  );
}
