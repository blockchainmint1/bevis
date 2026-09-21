import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import logoAsset from "@/assets/bevis-logo.png.asset.json";
import { ThemeToggle } from "@/components/ThemeToggle";

const NAV = [
  { to: "/personal", label: "Personal" },
  { to: "/business", label: "Business" },
  { to: "/verify", label: "Verify" },
  { to: "/learn-more", label: "Learn more" },
  { to: "/help", label: "Help" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-4 px-5 py-3">
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <img src={logoAsset.url} alt="BEVIS" className="h-9 w-auto" />
        </Link>

        <nav className="ml-auto hidden items-center gap-6 md:flex" aria-label="Main">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "text-foreground" }}
            >
              {item.label}
            </Link>
          ))}
          <ThemeToggle />
          <Link
            to="/app/assets"
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            Open the app
          </Link>
        </nav>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
          className="ml-auto rounded-md border border-border p-2 text-foreground md:hidden"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {open && (
        <nav className="border-t border-border/60 px-5 py-3 md:hidden" aria-label="Mobile">
          <ul className="space-y-1">
            {NAV.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className="block rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li className="pt-2">
              <Link
                to="/app/assets"
                onClick={() => setOpen(false)}
                className="block rounded-md bg-primary px-4 py-2.5 text-center text-sm font-semibold text-primary-foreground"
              >
                Open the app
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
