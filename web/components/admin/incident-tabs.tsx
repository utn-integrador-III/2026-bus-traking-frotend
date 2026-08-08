"use client";

import Link from "next/link";

export type IncidentTab = { value: string; label: string };

export function IncidentTabs({
  tabs,
  active,
}: {
  tabs: IncidentTab[];
  active: string;
}) {
  return (
    <div className="mb-5 inline-flex gap-1 rounded-xl border border-border bg-surface-alt p-1">
      {tabs.map((tab) => {
        const isActive = tab.value === active;
        const href = tab.value === "all" ? "/incidents" : `/incidents?status=${tab.value}`;
        return (
          <Link
            key={tab.value}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={`rounded-lg px-5 py-2 text-md font-bold transition-colors ${
              isActive
                ? "bg-surface text-brand shadow-card-soft"
                : "text-text-secondary hover:text-brand"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
