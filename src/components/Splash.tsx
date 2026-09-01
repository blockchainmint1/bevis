import { useEffect, useState } from "react";
import bevisLogo from "@/assets/bevis-logo.png.asset.json";

/**
 * Brief mint-stamping splash on first load. Sessionstorage-gated so it
 * shows once per browser session, not every navigation. Mounted-gated to
 * avoid SSR/client hydration mismatch.
 */
export function Splash({ minDuration = 900 }: { minDuration?: number }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("csc.splash.seen") === "1") return;
    setVisible(true);
    const t = setTimeout(() => {
      sessionStorage.setItem("csc.splash.seen", "1");
      setVisible(false);
    }, minDuration);
    return () => clearTimeout(t);
  }, [minDuration]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background"
      style={{ animation: "csc-splash-fade 200ms ease-out 700ms forwards" }}
    >
      <div
        className="relative"
        style={{ animation: "csc-splash-strike 600ms cubic-bezier(.2,.7,.2,1)" }}
      >
        <img
          src={bevisLogo.url}
          alt="BEVIS"
          width={144}
          height={170}
          className="h-36 w-auto select-none"
          draggable={false}
        />
      </div>
      <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.32em] text-muted-foreground">
        Blockchain notary
      </p>
      <style>{`
        @keyframes csc-splash-strike {
          0%   { transform: scale(0.6) rotate(-12deg); opacity: 0; filter: blur(6px); }
          60%  { transform: scale(1.06) rotate(0deg);  opacity: 1; filter: blur(0); }
          100% { transform: scale(1)    rotate(0deg);  opacity: 1; }
        }
        @keyframes csc-splash-fade {
          to { opacity: 0; visibility: hidden; }
        }
      `}</style>
    </div>
  );
}
