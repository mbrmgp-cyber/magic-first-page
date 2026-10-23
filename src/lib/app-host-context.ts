import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { appPageUrl } from "./app-hosts";

export const currentAppHostname = createIsomorphicFn()
  .server(() => {
    const request = getRequest();
    const hostname = new URL(request.url).hostname;
    // Only the local development proxy supplies this header; deployed hosts
    // are always resolved from the actual request URL.
    const forwardedHost = hostname === "localhost" ? request.headers.get("x-forwarded-host") : null;
    return forwardedHost ? new URL(`https://${forwardedHost}`).hostname : hostname;
  })
  .client(() => window.location.hostname);

export function currentAppPageUrl(path: string) {
  return appPageUrl(currentAppHostname(), path);
}