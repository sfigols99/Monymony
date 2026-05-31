"use client";

import { EXPENSE_ICONS } from "@/lib/icons";

/** Grid of Material Symbols to pick a category icon from. */
export function IconPicker({
  value,
  onChange,
  color,
}: {
  value: string;
  onChange: (icon: string) => void;
  color: string;
}) {
  return (
    <div className="grid max-h-44 grid-cols-7 gap-1 overflow-y-auto rounded-lg border border-neutral-200 p-2 dark:border-neutral-700">
      {EXPENSE_ICONS.map((icon) => {
        const selected = icon === value;
        return (
          <button
            key={icon}
            type="button"
            onClick={() => onChange(icon)}
            title={icon}
            aria-pressed={selected}
            className={`flex aspect-square items-center justify-center rounded-md border transition ${
              selected
                ? "border-transparent text-white"
                : "border-transparent text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
            }`}
            style={selected ? { backgroundColor: color } : undefined}
          >
            <span className="material-symbols-rounded text-[22px]">{icon}</span>
          </button>
        );
      })}
    </div>
  );
}
