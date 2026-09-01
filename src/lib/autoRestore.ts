/**
 * Signing in IS the import.
 *
 * Whenever a session appears we quietly pull the account's saved records out
 * of the legacy registry and write any missing ones into the account's own
 * record list. Idempotent, and flagged once per user per device so it doesn't
 * run on every navigation.
 */

import { useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { restoreLegacyRecords } from "@/lib/records.functions";

const flagKey = (userId: string) => `bevis.autorestore.v2.${userId}`;

export function useAutoRestore() {
  const { user } = useAuth();
  const restore = useServerFn(restoreLegacyRecords);
  const queryClient = useQueryClient();
  const running = useRef(false);

  useEffect(() => {
    if (!user || running.current) return;
    if (typeof window === "undefined") return;
    if (localStorage.getItem(flagKey(user.id))) return;

    running.current = true;
    void (async () => {
      try {
        const res = await restore();
        localStorage.setItem(flagKey(user.id), String(Date.now()));
        if (res.available && res.added > 0) {
          await queryClient.invalidateQueries({ queryKey: ["records"] });
          toast.success(`Restored ${res.added} ${res.added === 1 ? "record" : "records"} to your account`);
        }
      } catch {
        // Silent: /import remains as a manual fallback.
      } finally {
        running.current = false;
      }
    })();
  }, [user, restore, queryClient]);
}
