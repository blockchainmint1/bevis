import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Footer } from "@/components/Footer";
import logoAsset from "@/assets/bevis-logo.png.asset.json";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "BEVIS — Blockchain notary for your records" },
      {
        name: "description",
        content: "Sign in to BEVIS to notarise files on the TEXITcoin blockchain and keep a permanent record book for every asset you own.",
      },
      { property: "og:title", content: "BEVIS — Blockchain notary for your records" },
      { property: "og:description", content: "Notarise files on the TEXITcoin blockchain and keep a permanent record book." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SplashPage,
});

function SplashPage() {
  const { user, ready } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (ready && user) navigate({ to: "/assets", replace: true });
  }, [ready, user, navigate]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-6 py-14 text-center">
        <img src={logoAsset.url} alt="BEVIS" className="h-28 w-auto" />
        <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.32em] text-muted-foreground">
           BLOCKCHAIN ENABLED<br />
           VERIFICATION &<br />
           INFORMATION SERVICE
        </p>
        <h1 className="mt-4 font-serif text-3xl text-foreground">Your records, permanently.</h1>
        <p className="mt-3 max-w-sm text-sm text-muted-foreground">
          Stamp any document onto the TEXITcoin blockchain and keep a record book anyone can verify.
        </p>

        <div className="mt-10 w-full space-y-2">
          <Link
            to="/auth"
            search={{ mode: "signin" }}
            className="block w-full rounded-md bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            Sign in
          </Link>
          <Link
            to="/auth"
            search={{ mode: "signup" }}
            className="block w-full rounded-md border border-border bg-secondary px-4 py-3 text-sm font-semibold text-secondary-foreground transition hover:bg-secondary/80"
          >
            Create an account
          </Link>
          <Link
            to="/assets"
            className="block w-full px-4 py-3 text-xs text-muted-foreground transition hover:text-foreground"
          >
            Continue without an account
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
