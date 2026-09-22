/**
 * Reactive read of *your* notarisation fuel — the account's address when
 * signed in, this device's address otherwise.
 */

import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { getDeviceFuel, getMyFuel } from "@/lib/fuel.functions";
import { getDeviceId } from "@/lib/deviceId";

export function useFuel() {
  const { user, ready } = useAuth();
  const mine = useServerFn(getMyFuel);
  const device = useServerFn(getDeviceFuel);

  return useQuery({
    queryKey: ["fuel", user?.id ?? "device"],
    enabled: ready,
    staleTime: 0,
    gcTime: 0,
    queryFn: () => (user ? mine({}) : device({ data: { deviceId: getDeviceId() } })),
  });
}
