"use client";

export type ChipOption = { value: string; label: string };

export function FilterChips({
  options,
  value,
  onChange,
}: {
  options: ChipOption[];
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={active}
            className={`rounded-full px-4 py-2 text-sm font-bold transition-colors ${
              active
                ? "bg-brand text-on-dark"
                : "border border-border-subtle bg-surface text-text-secondary hover:text-brand"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
