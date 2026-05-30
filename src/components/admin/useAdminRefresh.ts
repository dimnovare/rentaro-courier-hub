"use client";

/**
 * Tiny refresh bus shared between the topbar and the section pages.
 *
 * The topbar's "Refresh" button can't know each page's private `load()`, and
 * `router.refresh()` doesn't re-run client-side effect loaders. So the topbar
 * dispatches a window event and every page subscribes its own reloader with one
 * line: `useAdminRefresh(load)`. Decoupled, no prop-drilling, always in sync
 * with whichever section is mounted.
 */
import { useEffect } from "react";

const REFRESH_EVENT = "rentaro:admin-refresh";

/** Fire a console-wide refresh (called by the topbar). */
export function triggerAdminRefresh() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(REFRESH_EVENT));
}

/** Subscribe a page's reloader to the console-wide refresh signal. */
export function useAdminRefresh(reload: () => void) {
  useEffect(() => {
    function onRefresh() {
      reload();
    }
    window.addEventListener(REFRESH_EVENT, onRefresh);
    return () => window.removeEventListener(REFRESH_EVENT, onRefresh);
  }, [reload]);
}
