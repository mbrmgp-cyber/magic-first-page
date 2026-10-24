// Capacitor config for the two Play Store apps. Both load the live published
// site (no localhost). Pick the app with CAP_APP=mbr | varadhi.
//   CAP_APP=mbr npx cap sync android
//   CAP_APP=varadhi npx cap sync android   (use a separate checkout/android folder per app)
import type { CapacitorConfig } from "@capacitor/cli";
import { VARADHI_APP_URL } from "./src/lib/app-hosts";

const APPS = {
  mbr: {
    appId: "com.mbrplatform.mbr",
    appName: "MBR APP",
    url: "https://mbrplatform.com/mbr",
  },
  varadhi: {
    appId: "com.mbrplatform.varadhi",
    appName: "Vaaradhi",
    url: VARADHI_APP_URL,
  },
} as const;

const which = (process.env.CAP_APP ?? "mbr") as keyof typeof APPS;
const app = APPS[which] ?? APPS.mbr;

const config: CapacitorConfig = {
  appId: app.appId,
  appName: app.appName,
  webDir: "capacitor-shell",
  server: {
    url: app.url,
    cleartext: false,
    androidScheme: "https",
    allowNavigation: ["mbrplatform.com", "*.mbrplatform.com", "*.supabase.co"],
  },
  android: {
    allowMixedContent: false,
    webContentsDebuggingEnabled: false,
  },
};

export default config;
