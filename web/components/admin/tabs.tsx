"use client";

export type TabOption = { value: string; label: string };

export function Tabs({
  options,
  value,
  onChange,
}: {
  options: TabOption[];
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <div className="inline-flex gap-1 rounded-xl border border-border bg-surface-alt p-1">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={active}
            className={`rounded-lg px-5 py-2 text-md font-bold transition-colors ${
              active
                ? "bg-surface text-brand shadow-card-soft"
                : "text-text-secondary hover:text-brand"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
