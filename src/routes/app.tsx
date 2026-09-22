import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useEffect } from "react";
import { TabBar } from "@/components/TabBar";
import { FirstRunSplash } from "@/components/FirstRunSplash";
import { useAlertsAutoSync } from "@/lib/alertsSync";
import { useAutoRestore } from "@/lib/autoRestore";
import { registerForPush } from "@/lib/push";
import { enablePrivacyScreen } from "@/lib/nativeSecurity";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

function AppLayout() {
  useAlertsAutoSync();
  useAutoRestore();
  useEffect(() => {
    void registerForPush();
    void enablePrivacyScreen();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-md pb-28 sm:max-w-xl lg:max-w-2xl">
        <Outlet />
      </div>
      <TabBar />
      <FirstRunSplash />
    </div>
  );
}
