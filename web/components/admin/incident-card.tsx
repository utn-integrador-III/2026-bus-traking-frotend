"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/admin/badge";
import { moderateIncidentAction } from "@/app/(admin)/incidents/actions";
import type { AdminIncident } from "@/lib/api/types";

const dateFormatter = new Intl.DateTimeFormat("es-CR", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function formatTimestamp(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Fecha desconocida" : dateFormatter.format(date);
}

const TYPE_LABELS: Record<string, string> = {
  Accident: "Accidente",
  Delay: "Demora",
  Traffic_Congestion: "Congestión",
  Overcrowding: "Sobrecupo",
  Road_Problem: "Problema vial",
  Mechanical_Failure: "Falla mecánica",
  Other: "Otro",
};

export function IncidentCard({ incident }: { incident: AdminIncident }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const label = TYPE_LABELS[incident.type] ?? incident.type;
  const decided = incident.status !== "Pending";

  function decide(moderationStatus: "Validated" | "Dismissed") {
    setError(null);
    startTransition(async () => {
      const result = await moderateIncidentAction(incident.id, moderationStatus);
      if (!result.ok) setError(result.message);
    });
  }

  return (
    <article className="flex flex-col rounded-2xl border border-border bg-surface p-5 shadow-card-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-brand">{label}</h2>
          <p className="mt-0.5 text-sm text-text-secondary">
            {formatTimestamp(incident.timestamp)}
          </p>
        </div>
        <Badge
          tone={
            incident.status === "Validated"
              ? "success"
              : incident.status === "Dismissed"
                ? "danger"
                : "warning"
          }
        >
          {incident.status === "Validated"
            ? "Validado"
            : incident.status === "Dismissed"
              ? "Descartado"
              : "Pendiente"}
        </Badge>
      </div>

      {incident.description ? (
        <p className="mt-3 rounded-xl bg-surface-alt px-4 py-3 text-sm text-brand">
          {incident.description}
        </p>
      ) : null}

      <p className="mt-3 text-xs text-text-secondary">
        {incident.latitude.toFixed(5)}, {incident.longitude.toFixed(5)}
      </p>

      {error ? (
        <p role="alert" className="mt-3 text-xs font-bold text-danger">
          {error}
        </p>
      ) : null}

      {!decided ? (
        <div className="mt-4 flex gap-2 border-t border-divider pt-4">
          <button
            type="button"
            onClick={() => decide("Validated")}
            disabled={pending}
            className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-success-bg text-sm font-bold text-success transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Guardando…" : "Validar"}
          </button>
          <button
            type="button"
            onClick={() => decide("Dismissed")}
            disabled={pending}
            className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-danger-bg text-sm font-bold text-danger transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Guardando…" : "Descartar"}
          </button>
        </div>
      ) : null}
    </article>
  );
}
