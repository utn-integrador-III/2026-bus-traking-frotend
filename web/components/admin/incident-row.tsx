"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/icon";
import { Badge, type BadgeTone } from "@/components/admin/badge";
import { updateIncidentStatusAction } from "@/app/(admin)/incidents/actions";
import type { AdminIncident, IncidentStatus } from "@/lib/api/types";

const statusLabel: Record<IncidentStatus, string> = {
  Pending: "Pendiente",
  Validated: "Validado",
  Archived: "Archivado",
  Dismissed: "Descartado",
};

const statusTone: Record<IncidentStatus, BadgeTone> = {
  Pending: "warning",
  Validated: "success",
  Archived: "neutral",
  Dismissed: "danger",
};

const timeFormatter = new Intl.DateTimeFormat("es-CR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function formatTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Fecha desconocida" : timeFormatter.format(date);
}

export function IncidentRow({
  incident,
  tripName,
}: {
  incident: AdminIncident;
  tripName: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function setStatus(status: IncidentStatus) {
    setError(null);
    startTransition(async () => {
      const result = await updateIncidentStatusAction(incident.id, status);
      if (!result.ok) setError(result.message);
    });
  }

  return (
    <article className="rounded-2xl border border-border bg-surface p-4 shadow-card-soft">
      <div className="flex items-start gap-4">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
            incident.status === "Pending"
              ? "bg-warning-bg text-warning"
              : "bg-surface-alt text-text-secondary"
          }`}
        >
          <Icon name="alertTriangle" size={22} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-md font-bold text-brand">
              {incident.type} · {tripName}
            </h3>
            <Badge tone={statusTone[incident.status] ?? "neutral"}>
              {statusLabel[incident.status] ?? incident.status}
            </Badge>
          </div>
          {incident.description ? (
            <p className="mt-1 text-sm text-text-secondary">
              {incident.description}
            </p>
          ) : null}
          <p className="mt-1 text-xs text-text-muted">
            {formatTime(incident.timestamp)} ·{" "}
            {incident.latitude.toFixed(5)}, {incident.longitude.toFixed(5)} ·
            usuario {incident.user_id.slice(0, 8)}
          </p>
        </div>
      </div>

      {incident.status === "Pending" ? (
        <div className="mt-3 flex flex-wrap gap-2 border-t border-divider pt-3">
          <button
            type="button"
            onClick={() => setStatus("Validated")}
            disabled={pending}
            className="flex h-9 items-center gap-1.5 rounded-lg bg-success-bg px-3 text-sm font-bold text-success hover:brightness-95 disabled:opacity-60"
          >
            <Icon name="check" size={14} />
            Validar
          </button>
          <button
            type="button"
            onClick={() => setStatus("Archived")}
            disabled={pending}
            className="flex h-9 items-center gap-1.5 rounded-lg border-[1.5px] border-border-subtle px-3 text-sm font-bold text-brand hover:bg-surface-alt disabled:opacity-60"
          >
            Archivar
          </button>
          <button
            type="button"
            onClick={() => setStatus("Dismissed")}
            disabled={pending}
            className="flex h-9 items-center gap-1.5 rounded-lg bg-danger-bg px-3 text-sm font-bold text-danger hover:brightness-95 disabled:opacity-60"
          >
            <Icon name="x" size={14} />
            Descartar
          </button>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="mt-2 text-xs font-bold text-danger">
          {error}
        </p>
      ) : null}
    </article>
  );
}
