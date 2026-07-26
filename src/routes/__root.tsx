import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { LanguageProvider } from "@/lib/i18n";
import { CurrencyProvider } from "@/lib/currency-context";
import { SplashScreen } from "@/components/SplashScreen";
import { Toaster } from "@/components/ui/sonner";
import { StaticAppIcons } from "@/components/StaticAppIcons";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import mbrLogoAsset from "../assets/mbr-logo.png.asset.json";

const MBR_LOGO = mbrLogoAsset.url;
const MBR_MANIFEST = `data:application/manifest+json;charset=utf-8,${encodeURIComponent(
  JSON.stringify({
    name: "MBR APP",
    short_name: "MBR",
    description: "MBR APP",
    start_url: "/",
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

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
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
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "MBR APP" },
      { name: "description", content: "MBR APP — Member Based Registry" },
      { name: "author", content: "MBR APP" },
      { name: "application-name", content: "MBR APP" },
      { name: "apple-mobile-web-app-title", content: "MBR APP" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "theme-color", content: "#000000" },
      { property: "og:title", content: "MBR APP" },
      { property: "og:description", content: "MBR APP — Member Based Registry" },
      { property: "og:type", content: "website" },
      { property: "og:image", content: MBR_LOGO },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:image", content: MBR_LOGO },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: MBR_LOGO, type: "image/png" },
      { rel: "shortcut icon", href: MBR_LOGO },
      { rel: "apple-touch-icon", href: MBR_LOGO },
      { rel: "apple-touch-icon", sizes: "180x180", href: MBR_LOGO },
      { rel: "manifest", href: MBR_MANIFEST },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600;700&family=Noto+Sans+Telugu:wght@400;600;700;800;900&family=Noto+Sans+Devanagari:wght@400;600;700;800&display=swap",
      },
    ],
  }),
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
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const path = window.location.pathname;
    // Skip splash entirely on public marketing / registration entry points so
    // unauthenticated users see the page immediately with no loading screen.
    if (
      path === "/" ||
      path.startsWith("/varadhi") ||
      path === "/register" ||
      path === "/member/register"
    ) {
      setShowSplash(false);
      return;
    }

    if (sessionStorage.getItem("mbr_splash_seen")) {
      setShowSplash(false);
    }
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
          {showSplash && <SplashScreen onDone={handleSplashDone} />}
          {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
          <Outlet />
          <Toaster position="top-center" richColors closeButton />
        </CurrencyProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}
