"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/icon";
import { Badge, type BadgeTone } from "@/components/admin/badge";
import { cancelTripAction } from "@/app/(admin)/trips/actions";
import type { TripStatus } from "@/lib/api/types";

const statusLabel: Record<TripStatus, string> = {
  Scheduled: "Programado",
  Pending: "Pendiente",
  In_Progress: "En curso",
  Stopped: "Detenido",
  Delayed: "Con demora",
  Completed: "Completado",
  Cancelled: "Cancelado",
};

const statusTone: Record<TripStatus, BadgeTone> = {
  Scheduled: "info",
  Pending: "neutral",
  In_Progress: "success",
  Stopped: "danger",
  Delayed: "warning",
  Completed: "neutral",
  Cancelled: "danger",
};

const timeFormatter = new Intl.DateTimeFormat("es-CR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function formatTime(value: string | null) {
  if (!value) return "Sin hora";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Sin hora" : timeFormatter.format(date);
}

export function TripRow({
  tripId,
  routeName,
  driverName,
  busPlate,
  departureTime,
  status,
}: {
  tripId: string;
  routeName: string;
  driverName: string;
  busPlate: string | null;
  departureTime: string;
  status: TripStatus;
}) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cancellable = status === "Scheduled" || status === "Pending";

  function cancel() {
    setError(null);
    startTransition(async () => {
      const result = await cancelTripAction(tripId);
      if (!result.ok) setError(result.message);
      setConfirming(false);
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-card-soft">
      <div className="flex items-center gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-alt text-text-secondary">
          <Icon name="bus" size={22} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p
              title={routeName}
              className="truncate text-md font-bold text-brand"
            >
              {routeName}
            </p>
            <Badge tone={statusTone[status] ?? "neutral"}>
              {statusLabel[status] ?? status}
            </Badge>
          </div>
          <p
            title={`${driverName} · ${busPlate ?? "sin autobús"}`}
            className="mt-1 truncate text-xs text-text-secondary"
          >
            {driverName} · {busPlate ?? "sin autobús"} · sale{" "}
            {formatTime(departureTime)}
          </p>
        </div>

        {cancellable && !confirming ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-danger-bg px-3 text-sm font-bold text-danger hover:brightness-95"
          >
            <Icon name="x" size={14} />
            Cancelar
          </button>
        ) : null}
      </div>

      {confirming ? (
        <div className="mt-3 rounded-xl border border-danger/30 bg-danger-bg/50 p-3">
          <p className="text-xs font-bold text-brand">
            ¿Cancelar este viaje?
          </p>
          <p className="mt-0.5 text-xs text-text-secondary">
            El viaje pasará a estado Cancelado.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={cancel}
              disabled={pending}
              className="h-9 flex-1 rounded-lg bg-danger text-sm font-extrabold text-on-dark hover:brightness-110 disabled:opacity-60"
            >
              {pending ? "Cancelando…" : "Sí, cancelar"}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={pending}
              className="h-9 flex-1 rounded-lg border-[1.5px] border-border-subtle text-sm font-bold text-brand hover:bg-surface-alt disabled:opacity-60"
            >
              Volver
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
