import { Link } from "@tanstack/react-router";
import logoAsset from "@/assets/bevis-logo.png.asset.json";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border/60 bg-secondary/30">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-14 md:grid-cols-3">
        <div>
          <img src={logoAsset.url} alt="BEVIS" className="h-10 w-auto" />
          <p className="mt-4 max-w-xs text-sm text-muted-foreground">
            Blockchain-Enabled Verification &amp; Information Service. Digitise valuable assets and keep a
            time-stamped, permanent record of the events, documents and files that prove their worth.
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            Part of the{" "}
            <a
              href="https://honest.money"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2 hover:text-foreground"
            >
              honest.money
            </a>{" "}
            ecosystem.
          </p>
        </div>

        <div>
          <h2 className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">About us</h2>
          <address className="mt-4 text-sm not-italic text-muted-foreground">
            Rearden Metals Pte Ltd<br />
            25B Loyang Crescent #03-15<br />
            Singapore 506817<br />
            <a href="mailto:service@bevis.sg" className="mt-2 inline-block hover:text-foreground">
              service@bevis.sg
            </a>
          </address>
        </div>

        <div>
          <h2 className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Explore</h2>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li><Link to="/personal" className="hover:text-foreground">Personal</Link></li>
            <li><Link to="/business" className="hover:text-foreground">Business</Link></li>
            <li><Link to="/verify" className="hover:text-foreground">Verify an asset</Link></li>
            <li><Link to="/learn-more" className="hover:text-foreground">Learn more</Link></li>
            <li><Link to="/help" className="hover:text-foreground">Help &amp; FAQ</Link></li>
            <li><Link to="/app/assets" className="hover:text-foreground">Open the app</Link></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border/60">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-5 text-xs text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Rearden Metals Pte Ltd.</p>
          <ul className="flex items-center gap-4">
            <li><Link to="/manifesto" className="hover:text-foreground">Manifesto</Link></li>
            <li><Link to="/terms" className="hover:text-foreground">Terms of use</Link></li>
            <li><Link to="/privacy" className="hover:text-foreground">Privacy statement</Link></li>
            <li><Link to="/about" className="hover:text-foreground">About</Link></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
