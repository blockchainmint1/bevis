import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ShieldCheck, FileUp, Fingerprint } from "lucide-react";
import bevisLogo from "@/assets/bevis-logo.png.asset.json";

const KEY = "bevis.firstrun.seen";

/**
 * Full-screen welcome shown once, on the very first launch of the installed
 * app. Web visitors never see it — the marketing site already explains BEVIS.
 */
export function FirstRunSplash() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (localStorage.getItem(KEY) === "1") return;
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform()) return;
      } catch {
        return;
      }
      if (!cancelled) setShow(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function dismiss() {
    localStorage.setItem(KEY, "1");
    setShow(false);
  }

  if (!show) return null;

  const points = [
    { Icon: FileUp, title: "Capture anything", body: "A photo, a video, a contract, a voice note — any file at all." },
    { Icon: Fingerprint, title: "Stamped on-chain", body: "Its fingerprint goes onto the TEXITcoin blockchain, permanently." },
    { Icon: ShieldCheck, title: "The file stays yours", body: "Encrypt it if you want. We never hold your keys." },
  ];

  return (
    <div className="fixed inset-0 z-[120] flex flex-col overflow-y-auto bg-background px-6 pb-10 pt-14">
      <div className="mx-auto w-full max-w-md">
        <img src={bevisLogo.url} alt="BEVIS" className="mx-auto h-24 w-auto" draggable={false} />
        <h1 className="mt-6 text-center font-serif text-3xl text-foreground">Welcome to BEVIS</h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          A digital notary in your pocket. Proof that a file existed, exactly as it was, at a moment in time.
        </p>

        <ul className="mt-8 space-y-3">
          {points.map(({ Icon, title, body }) => (
            <li key={title} className="flex gap-3 rounded-xl border border-border bg-card p-4">
              <Icon className="mt-0.5 size-5 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-semibold text-foreground">{title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{body}</p>
              </div>
            </li>
          ))}
        </ul>

        <button
          onClick={dismiss}
          className="mt-8 w-full rounded-md bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          Get started
        </button>
        <Link
          to="/auth"
          onClick={dismiss}
          className="mt-2 block w-full rounded-md border border-border px-4 py-3 text-center text-sm font-semibold text-foreground"
        >
          Sign in to restore a backup
        </Link>
        <p className="mt-4 text-center text-[11px] text-muted-foreground">
          No account needed to make your first record.
        </p>
      </div>
    </div>
  );
}
