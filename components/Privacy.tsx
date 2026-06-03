"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useTranslations } from "next-intl";

type PrivacyContextValue = { hidden: boolean; toggle: () => void };

const PrivacyContext = createContext<PrivacyContextValue | null>(null);

function usePrivacy(): PrivacyContextValue {
  const ctx = useContext(PrivacyContext);
  if (!ctx) throw new Error("usePrivacy must be used within <PrivacyProvider>");
  return ctx;
}

/** The mask shown in place of hidden salary figures (bank style). */
const MASK = "*****";

/** localStorage key persisting the user's show/hide preference. */
const STORAGE_KEY = "monymony:salaries-hidden";

/**
 * Holds the "hide salaries" state for the dashboard. Hidden by default so
 * sensitive figures (salaries, budget base, contributions) aren't shown until
 * the user reveals them with the eye toggle. The choice is remembered in
 * localStorage (and applied after mount to avoid a hydration mismatch), but the
 * default on a fresh device stays hidden.
 */
export function PrivacyProvider({ children }: { children: ReactNode }) {
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === "false") setHidden(false);
    } catch {
      // localStorage unavailable (e.g. private mode) — keep the default.
    }
  }, []);

  const toggle = useCallback(() => {
    setHidden((h) => {
      const next = !h;
      try {
        window.localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // Ignore persistence failures.
      }
      return next;
    });
  }, []);

  return (
    <PrivacyContext.Provider value={{ hidden, toggle }}>
      {children}
    </PrivacyContext.Provider>
  );
}

/** Renders its children, or a mask of asterisks when salaries are hidden. */
export function Sensitive({ children }: { children: ReactNode }) {
  const { hidden } = usePrivacy();
  if (hidden) {
    return <span className="tracking-widest text-neutral-400">{MASK}</span>;
  }
  return <>{children}</>;
}

/** Contribution bar that hides its proportion when salaries are hidden. */
export function ContributionBar({ percent }: { percent: number }) {
  const { hidden } = usePrivacy();
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
      {!hidden && (
        <div
          className="h-full rounded-full bg-indigo-500"
          style={{ width: `${percent}%` }}
        />
      )}
    </div>
  );
}

/** Eye button to show/hide the salary figures. */
export function PrivacyToggle() {
  const { hidden, toggle } = usePrivacy();
  const t = useTranslations("home");
  const label = hidden ? t("showSalaries") : t("hideSalaries");
  return (
    <button
      type="button"
      onClick={toggle}
      title={label}
      aria-label={label}
      aria-pressed={!hidden}
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-300 text-neutral-600 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
    >
      <span className="material-symbols-rounded text-[20px]">
        {hidden ? "visibility_off" : "visibility"}
      </span>
    </button>
  );
}

export { usePrivacy };
