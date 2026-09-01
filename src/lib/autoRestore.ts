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
import { claimGuestRecords } from "@/lib/bevisGuest.functions";
import { getDeviceId } from "@/lib/deviceId";

const flagKey = (userId: string) => `bevis.autorestore.v2.${userId}`;

export function useAutoRestore() {
  const { user } = useAuth();
  const restore = useServerFn(restoreLegacyRecords);
  const claim = useServerFn(claimGuestRecords);
  const queryClient = useQueryClient();
  const running = useRef(false);

  useEffect(() => {
    if (!user || running.current) return;
    if (typeof window === "undefined") return;
    if (localStorage.getItem(flagKey(user.id))) return;

    running.current = true;
    void (async () => {
      try {
        // Anything notarised on this device while signed out becomes theirs.
        try {
          const claimed = await claim({ data: { deviceId: getDeviceId() } });
          if (claimed.claimed > 0) {
            await queryClient.invalidateQueries({ queryKey: ["bevis-assets"] });
            toast.success(`Added ${claimed.claimed} record${claimed.claimed === 1 ? "" : "s"} you created before signing in`);
          }
        } catch {
          // Non-fatal.
        }

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
  }, [user, restore, claim, queryClient]);
}
