"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Icon } from "@/components/icon";

export function RefreshButton({ label = "Actualizar" }: { label?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() => startTransition(() => router.refresh())}
      disabled={pending}
      aria-label={label}
      title={label}
      className="flex h-11 items-center gap-2 rounded-xl border border-border bg-surface px-4 text-sm font-bold text-brand transition-colors hover:bg-surface-alt disabled:opacity-60"
    >
      <Icon
        name="refresh"
        size={17}
        className={pending ? "animate-spin" : undefined}
      />
      {label}
    </button>
  );
}
