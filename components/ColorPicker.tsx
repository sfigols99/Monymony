"use client";

/** Swatch grid to pick a category color. */
export function ColorPicker({
  value,
  onChange,
  colors,
}: {
  value: string;
  onChange: (color: string) => void;
  colors: readonly string[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {colors.map((color) => {
        const selected = color.toLowerCase() === value.toLowerCase();
        return (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            title={color}
            aria-pressed={selected}
            className={`h-7 w-7 rounded-full transition ${
              selected
                ? "ring-2 ring-neutral-900 ring-offset-2 dark:ring-white dark:ring-offset-neutral-900"
                : ""
            }`}
            style={{ backgroundColor: color }}
          />
        );
      })}
    </div>
  );
}
