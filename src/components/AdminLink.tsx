/** Shows the operator panel entry point — only to accounts with the admin role. */

import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Wrench } from "lucide-react";

import { amIAdmin } from "@/lib/admin.functions";
import { useAuth } from "@/hooks/use-auth";

export function AdminLink() {
  const { user, ready } = useAuth();
  const check = useServerFn(amIAdmin);
  const { data } = useQuery({
    queryKey: ["am-i-admin", user?.id],
    queryFn: () => check(),
    enabled: ready && !!user,
    retry: false,
    staleTime: 5 * 60_000,
  });

  if (!data?.admin) return null;

  return (
    <Link
      to="/admin"
      className="mb-6 flex items-center gap-3 rounded-xl border border-border bg-card p-4 hover:bg-muted"
    >
      <Wrench className="size-5 text-primary" />
      <div>
        <p className="text-sm text-foreground">Operator panel</p>
        <p className="text-[11px] text-muted-foreground">House wallet and card top-ups</p>
      </div>
    </Link>
  );
}
