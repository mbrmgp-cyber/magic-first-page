import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { appPageUrl } from "./app-hosts";

export const currentAppHostname = createIsomorphicFn()
  .server(() => new URL(getRequest().url).hostname)
  .client(() => window.location.hostname);

export function currentAppPageUrl(path: string) {
  return appPageUrl(currentAppHostname(), path);
}