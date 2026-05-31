"use client";

import { useState } from "react";

/** Shows the household invite code with a copy-to-clipboard button. */
export function InviteCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard not available — ignore.
    }
  }

  return (
    <div className="flex items-center gap-3">
      <code className="rounded-lg bg-neutral-100 px-3 py-1.5 text-lg font-semibold tracking-widest dark:bg-neutral-800">
        {code}
      </code>
      <button
        type="button"
        onClick={copy}
        className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium transition hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
      >
        {copied ? "¡Copiado!" : "Copiar"}
      </button>
    </div>
  );
}
