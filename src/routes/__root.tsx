import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { LanguageProvider } from "@/lib/i18n";
import { AutoTransliterate } from "@/components/AutoTransliterate";
import { CurrencyProvider } from "@/lib/currency-context";
import { SplashScreen } from "@/components/SplashScreen";
import { Toaster } from "@/components/ui/sonner";
import { StaticAppIcons } from "@/components/StaticAppIcons";
import { OfflineNotice } from "@/components/OfflineNotice";
import { AndroidBackHandler } from "@/components/AndroidBackHandler";
import { OrganizationShareBar } from "@/components/OrganizationShareBar";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import mbrLogoAsset from "../assets/mbr-logo.png.asset.json";
import { currentAppHostname } from "@/lib/app-host-context";
import { appBrandingForHostname, appForHostname } from "@/lib/app-hosts";

const MBR_LOGO = mbrLogoAsset.url;
const MBR_MANIFEST = `data:application/manifest+json;charset=utf-8,${encodeURIComponent(
  JSON.stringify({
    name: "MBR APP",
    short_name: "MBR",
    description: "MBR APP",
    start_url: "/mbr",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#000000",
    theme_color: "#000000",
    icons: [
      { src: MBR_LOGO, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: MBR_LOGO, sizes: "512x512", type: "image/png", purpose: "any" },
      { src: MBR_LOGO, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  }),
)}`;

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => {
    const hostname = currentAppHostname();
    const branding = appBrandingForHostname(hostname);
    return {
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "google-site-verification", content: "KtwmdwYueuvCfSG7MN_9xeycXzmmCW3UIDY_J7NLXyE" },
      { title: branding.title },
      { name: "description", content: branding.description },
      { name: "author", content: branding.orgName },
      { name: "application-name", content: branding.orgName },
      { name: "apple-mobile-web-app-title", content: branding.orgName },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "theme-color", content: "#000000" },
      { property: "og:title", content: branding.title },
      { property: "og:description", content: branding.description },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: branding.orgName },
      { name: "twitter:card", content: "summary" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: branding.orgName,
          url: branding.orgUrl,
          logo: `${branding.orgUrl}${branding.logoPath}`,
        }),
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: appForHostname(currentAppHostname()) === "varadhi" ? "/varadhi-icon-512.png" : "/favicon.png", type: "image/png", sizes: "512x512" },
      { rel: "icon", href: appForHostname(currentAppHostname()) === "varadhi" ? "/varadhi-icon-192.png" : "/favicon.ico" },
      { rel: "shortcut icon", href: appForHostname(currentAppHostname()) === "varadhi" ? "/varadhi-icon-192.png" : "/favicon.ico" },
      { rel: "apple-touch-icon", href: appForHostname(currentAppHostname()) === "varadhi" ? "/varadhi-apple-touch-icon.png" : MBR_LOGO },
      { rel: "apple-touch-icon", sizes: "180x180", href: appForHostname(currentAppHostname()) === "varadhi" ? "/varadhi-apple-touch-icon.png" : MBR_LOGO },
      { rel: "manifest", href: appForHostname(currentAppHostname()) === "varadhi" ? "/varadhi-manifest.webmanifest" : MBR_MANIFEST },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600;700&family=Noto+Sans+Telugu:wght@400;600;700;800;900&family=Noto+Sans+Devanagari:wght@400;600;700;800&display=swap",
      },
    ],
    };
  },
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const [showSplash, setShowSplash] = useState(false);

  // Decide on the splash after hydration so server and client HTML match.
  useEffect(() => {
    const path = window.location.pathname;
    if (
      path === "/" ||
      path.startsWith("/varadhi") ||
      path === "/register" ||
      path.startsWith("/society/") ||
      path === "/member/register"
    ) {
      return;
    }
    if (sessionStorage.getItem("mbr_splash_seen")) return;
    setShowSplash(true);
  }, []);

  const handleSplashDone = () => {
    if (typeof window !== "undefined") sessionStorage.setItem("mbr_splash_seen", "1");
    setShowSplash(false);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <CurrencyProvider>
          <StaticAppIcons />
          <AutoTransliterate />
          {showSplash && <SplashScreen onDone={handleSplashDone} />}
          {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
          <OrganizationShareBar />
          <Outlet />
          <Toaster position="top-center" richColors closeButton />
          <OfflineNotice />
          <AndroidBackHandler />
        </CurrencyProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}
