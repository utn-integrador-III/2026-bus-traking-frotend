"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { deleteStopAction } from "@/app/(admin)/stops/actions";
import type { AdminStop } from "@/lib/api/types";

export function StopRow({
  stop,
  routeName,
}: {
  stop: AdminStop;
  routeName: string;
}) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function remove() {
    setError(null);
    startTransition(async () => {
      const result = await deleteStopAction(stop.id);
      if (!result.ok) setError(result.message);
      setConfirming(false);
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-card-soft">
      <div className="flex items-center gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-alt text-text-secondary">
          <Icon name="mapPin" size={22} />
        </div>

        <div className="min-w-0 flex-1">
          <p title={stop.name} className="truncate text-md font-bold text-brand">
            {stop.stop_order}. {stop.name}
          </p>
          <p
            title={routeName}
            className="truncate text-xs text-text-secondary"
          >
            {routeName} · {stop.latitude.toFixed(5)}, {stop.longitude.toFixed(5)}
          </p>
        </div>

        <Link
          href={`/stops/${stop.id}/edit`}
          className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg border-[1.5px] border-border-subtle px-3 text-sm font-bold text-brand hover:bg-surface-alt"
        >
          <Icon name="edit" size={14} />
          Editar
        </Link>

        {!confirming ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-danger-bg px-3 text-sm font-bold text-danger hover:brightness-95"
          >
            <Icon name="trash" size={14} />
            Eliminar
          </button>
        ) : null}
      </div>

      {confirming ? (
        <div className="mt-3 rounded-xl border border-danger/30 bg-danger-bg/50 p-3">
          <p className="text-xs font-bold text-brand">
            ¿Eliminar la parada “{stop.name}”?
          </p>
          <p className="mt-0.5 text-xs text-text-secondary">
            Esta acción no se puede deshacer desde la consola.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={remove}
              disabled={pending}
              className="h-9 flex-1 rounded-lg bg-danger text-sm font-extrabold text-on-dark hover:brightness-110 disabled:opacity-60"
            >
              {pending ? "Eliminando…" : "Sí, eliminar"}
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
