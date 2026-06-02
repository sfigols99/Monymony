"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  Suspense,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";

type LoadingContextValue = {
  /** Whether a navigation is in progress. */
  loading: boolean;
  /** Show the bar (call when a navigation starts). */
  start: () => void;
  /** Complete and hide the bar. */
  done: () => void;
};

const LoadingContext = createContext<LoadingContextValue | null>(null);

/** Access the global page-loading bar (start it before programmatic nav). */
export function useLoading(): LoadingContextValue {
  const ctx = useContext(LoadingContext);
  if (!ctx) {
    throw new Error("useLoading must be used within <LoadingProvider>");
  }
  return ctx;
}

/** Watches the route and signals when a navigation has finished. */
function RouteChangeWatcher({ onChange }: { onChange: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  useEffect(() => {
    onChange();
  }, [pathname, searchParams, onChange]);
  return null;
}

/**
 * Provides a top progress bar that appears on navigation. The bar trickles
 * toward 90% while loading and snaps to 100% once the new page (pathname or
 * query) has rendered, then fades out. Internal `<a>` clicks start it
 * automatically; programmatic navigations can call `useLoading().start()`.
 */
export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const trickle = useRef<ReturnType<typeof setInterval> | null>(null);
  const safety = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hide = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstRender = useRef(true);

  const clearTimers = useCallback(() => {
    if (trickle.current) clearInterval(trickle.current);
    if (safety.current) clearTimeout(safety.current);
    trickle.current = null;
    safety.current = null;
  }, []);

  const done = useCallback(() => {
    clearTimers();
    setProgress(100);
    if (hide.current) clearTimeout(hide.current);
    hide.current = setTimeout(() => {
      setLoading(false);
      setProgress(0);
    }, 250);
  }, [clearTimers]);

  const start = useCallback(() => {
    if (hide.current) clearTimeout(hide.current);
    clearTimers();
    setLoading(true);
    setProgress(8);
    trickle.current = setInterval(() => {
      // Ease toward 90% and stall there until navigation completes.
      setProgress((p) => (p >= 90 ? p : p + Math.max(0.5, (90 - p) * 0.08)));
    }, 200);
    // Never get stuck if a navigation is cancelled.
    safety.current = setTimeout(done, 10000);
  }, [clearTimers, done]);

  // Finish the bar whenever the route actually changes.
  const handleRouteChange = useCallback(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    done();
  }, [done]);

  // Start the bar on internal link navigations, app-wide.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      ) {
        return;
      }
      const anchor = (e.target as HTMLElement | null)?.closest?.("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (
        !href ||
        anchor.target === "_blank" ||
        anchor.hasAttribute("download") ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:")
      ) {
        return;
      }
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      // Same page (no real navigation) → don't show the bar.
      if (
        url.pathname === window.location.pathname &&
        url.search === window.location.search
      ) {
        return;
      }
      start();
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [start]);

  useEffect(() => {
    return () => {
      clearTimers();
      if (hide.current) clearTimeout(hide.current);
    };
  }, [clearTimers]);

  return (
    <LoadingContext.Provider value={{ loading, start, done }}>
      <Suspense fallback={null}>
        <RouteChangeWatcher onChange={handleRouteChange} />
      </Suspense>
      {(loading || progress > 0) && (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-1"
        >
          <div
            className="h-full rounded-r-full bg-indigo-600/70 shadow-[0_0_10px_rgba(79,70,229,0.6)] transition-[width] duration-200 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
      {children}
    </LoadingContext.Provider>
  );
}
