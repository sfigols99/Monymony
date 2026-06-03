"use client";

import {
  createContext,
  useContext,
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

/**
 * Holds the "hide salaries" state for the dashboard. Hidden by default so
 * sensitive figures (salaries, budget base, contributions) aren't shown until
 * the user reveals them with the eye toggle.
 */
export function PrivacyProvider({ children }: { children: ReactNode }) {
  const [hidden, setHidden] = useState(true);
  return (
    <PrivacyContext.Provider value={{ hidden, toggle: () => setHidden((h) => !h) }}>
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
