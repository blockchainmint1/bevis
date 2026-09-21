import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Capacitor config for BEVIS.
 *
 * The app is a TanStack Start SSR site, so the native shell loads the live
 * published web app inside a managed webview. Web changes ship instantly —
 * no store resubmission. A native rebuild is only needed when the bundle id,
 * icons, splash, permissions, plugins, or `server.url` change.
 *
 *   Android: sg.bevis.app   (Play Store listing)
 *   iOS:     sg.bevis.app
 *
 * Build:
 *   bun run build        # produces .output/public
 *   bun run cap:sync     # copy web + plugins into native projects
 *   bun run android:apk  # debug APK straight to android/app/build/outputs
 */
const config: CapacitorConfig = {
  appId: "sg.bevis.app",
  appName: "BEVIS",
  // Only used when bundling local assets. We load the live URL instead
  // (see `server.url`), but the path must exist — `bun run build` creates it.
  webDir: ".output/public",
  server: {
    // Point the native shell at the live published web app. Swap to the
    // Lovable preview URL to test unpublished builds.
    // The app now lives under /app (the site root is the public marketing page).
    url: "https://app.bevis.sg/app",
    cleartext: false,
    androidScheme: "https",
    iosScheme: "https",
    // Keep these in the webview instead of bouncing out to the browser.
    allowNavigation: [
      "app.bevis.sg",
      "bevis.sg",
      "*.bevis.sg",
      "honest.money",
      "*.honest.money",
      "texitcoin.org",
      "*.texitcoin.org",
    ],
  },
  ios: {
    contentInset: "automatic",
    limitsNavigationsToAppBoundDomains: false,
    backgroundColor: "#0b0b10",
  },
  android: {
    backgroundColor: "#0b0b10",
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: "#0b0b10",
      showSpinner: false,
      androidScaleType: "CENTER_CROP",
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0b0b10",
      overlaysWebView: false,
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
