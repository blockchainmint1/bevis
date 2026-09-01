/**
 * Signing in IS the import.
 *
 * Whenever a session appears, we quietly pull the account's saved asset list
 * from the legacy registry and merge it into this device's local list. It runs
 * at most once per user per device (the merge itself is idempotent anyway), so
 * a returning user just sees their records — no /import trip required.
 */

import { useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { fetchLegacyList } from "@/lib/legacyList.functions";
import { previewLegacyBlob, applyLegacyImport } from "@/lib/legacyImport";
import { listLocalCoins } from "@/lib/localPortfolio";

const flagKey = (userId: string) => `bevis.autorestore.v1.${userId}`;

export function useAutoRestore() {
  const { user } = useAuth();
  const pull = useServerFn(fetchLegacyList);
  const running = useRef(false);

  useEffect(() => {
    if (!user || running.current) return;
    if (typeof window === "undefined") return;
    if (localStorage.getItem(flagKey(user.id))) return;

    running.current = true;
    void (async () => {
      try {
        const res = await pull();
        if (!res.available || res.wallets.length === 0) return;

        const before = listLocalCoins().length;
        const added = applyLegacyImport(previewLegacyBlob({ wallets: res.wallets }));
        const after = listLocalCoins().length;
        const fresh = Math.max(0, after - before);

        localStorage.setItem(flagKey(user.id), String(Date.now()));
        if (fresh > 0) {
          toast.success(`Restored ${fresh} ${fresh === 1 ? "record" : "records"} from your account`);
          window.dispatchEvent(new Event("bevis:portfolio-changed"));
        } else if (added > 0) {
          // Everything was already here — nothing to announce.
        }
      } catch {
        // Silent: the manual /import screen remains as a fallback.
      } finally {
        running.current = false;
      }
    })();
  }, [user, pull]);
}
