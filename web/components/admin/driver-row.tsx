"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/icon";
import { Badge } from "@/components/admin/badge";
import { deactivateDriverAction } from "@/app/(admin)/users/actions";
import type { AdminDriver } from "@/lib/api/types";

export function DriverRow({ driver }: { driver: AdminDriver }) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function deactivate() {
    setError(null);
    startTransition(async () => {
      const result = await deactivateDriverAction(driver.user_id);
      if (!result.ok) setError(result.message);
      setConfirming(false);
    });
  }

  return (
    <div
      className={`rounded-2xl border border-border bg-surface p-4 shadow-card-soft ${
        driver.is_active ? "" : "opacity-70"
      }`}
    >
      <div className="flex items-center gap-4">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
            driver.is_active
              ? "bg-surface-alt text-text-secondary"
              : "bg-divider text-text-muted"
          }`}
        >
          <Icon name="user" size={22} />
        </div>

        <div className="min-w-0 flex-1">
          <p title={driver.name} className="truncate text-md font-bold text-brand">
            {driver.name}
          </p>
          <p
            title={driver.email}
            className="truncate text-xs text-text-secondary"
          >
            {driver.email} · Lic. {driver.license_number}
          </p>
        </div>

        <Badge tone={driver.is_active ? "success" : "neutral"}>
          {driver.is_active ? "Activo" : "Inactivo"}
        </Badge>

        {driver.is_active && !confirming ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="h-9 shrink-0 rounded-lg bg-danger-bg px-3 text-sm font-bold text-danger hover:brightness-95"
          >
            Desactivar
          </button>
        ) : null}
      </div>

      {confirming ? (
        <div className="mt-3 rounded-xl border border-danger/30 bg-danger-bg/50 p-3">
          <p className="text-xs font-bold text-brand">
            ¿Desactivar a {driver.name}?
          </p>
          <p className="mt-0.5 text-xs text-text-secondary">
            La API no expone forma de reactivarlo: esto no se puede deshacer desde
            la consola.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={deactivate}
              disabled={pending}
              className="h-9 flex-1 rounded-lg bg-danger text-sm font-extrabold text-on-dark hover:brightness-110 disabled:opacity-60"
            >
              {pending ? "Desactivando…" : "Sí, desactivar"}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={pending}
              className="h-9 flex-1 rounded-lg border-[1.5px] border-border-subtle text-sm font-bold text-brand hover:bg-surface-alt disabled:opacity-60"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="mt-2 text-xs font-bold text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
