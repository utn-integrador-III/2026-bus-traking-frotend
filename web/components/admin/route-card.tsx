"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { Badge } from "@/components/admin/badge";
import { toLineString } from "@/lib/api/geo";
import {
  deactivateRouteAction,
  reactivateRouteAction,
} from "@/app/(admin)/routes/actions";
import type { AdminRoute } from "@/lib/api/types";

const dateFormatter = new Intl.DateTimeFormat("es-CR", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function formatCreatedAt(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Fecha desconocida" : dateFormatter.format(date);
}

export function RouteCard({ route }: { route: AdminRoute }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const line = toLineString(route.geometry_geojson);
  const inactive = !route.is_active;

  function toggle() {
    setError(null);
    startTransition(async () => {
      const result = inactive
        ? await reactivateRouteAction(route.id)
        : await deactivateRouteAction(route.id);
      if (!result.ok) setError(result.message);
    });
  }

  return (
    <article
      className={`flex flex-col rounded-2xl border border-border bg-surface p-5 shadow-card-soft transition ${
        inactive ? "opacity-75" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
            inactive ? "bg-surface-alt text-text-secondary" : "bg-brand text-accent"
          }`}
        >
          <Icon name="shareNet" size={22} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 title={route.name} className="truncate text-lg font-bold text-brand">
            {route.name}
          </h2>
          <p
            title={`${route.origin} → ${route.destination}`}
            className="truncate text-sm text-text-secondary"
          >
            {route.origin} → {route.destination}
          </p>
        </div>
        <Badge tone={inactive ? "neutral" : "success"}>
          {inactive ? "Inactiva" : "Activa"}
        </Badge>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-divider pt-4 text-xs">
        <div>
          <dt className="text-text-secondary">Puntos del trazado</dt>
          <dd className="mt-0.5 font-bold text-brand">
            {line ? line.coordinates.length : "Sin trazado"}
          </dd>
        </div>
        <div>
          <dt className="text-text-secondary">Creada</dt>
          <dd className="mt-0.5 font-bold text-brand">
            {formatCreatedAt(route.created_at)}
          </dd>
        </div>
      </dl>

      {error ? (
        <p role="alert" className="mt-3 text-xs font-bold text-danger">
          {error}
        </p>
      ) : null}

      <div className="mt-4 flex gap-2 border-t border-divider pt-4">
        <Link
          href={`/routes/${route.id}/edit`}
          className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border-[1.5px] border-border-subtle text-sm font-bold text-brand hover:bg-surface-alt"
        >
          <Icon name="edit" size={14} />
          Editar
        </Link>
        <button
          type="button"
          onClick={toggle}
          disabled={pending}
          className={`flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${
            inactive
              ? "bg-surface-alt text-brand hover:brightness-95"
              : "bg-danger-bg text-danger hover:brightness-95"
          }`}
        >
          <Icon name={inactive ? "check" : "trash"} size={14} />
          {pending ? "Guardando…" : inactive ? "Reactivar" : "Desactivar"}
        </button>
      </div>
    </article>
  );
}
