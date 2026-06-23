"use client";

import { useState } from "react";
import { Icon } from "@/components/icon";
import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/admin/badge";
import { FilterChips } from "@/components/admin/filter-chips";
import {
  incidents as initialIncidents,
  type IncidentTone,
} from "@/lib/admin-data";

const filters = [
  { value: "Pendientes", label: "Pendientes" },
  { value: "Validados", label: "Validados" },
  { value: "all", label: "Todos" },
];

const toneIconClass: Record<IncidentTone, string> = {
  warning: "bg-warning-bg text-warning",
  danger: "bg-danger-bg text-danger",
  info: "bg-info-bg text-info",
};

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState(initialIncidents);
  const [filter, setFilter] = useState("Pendientes");

  const pendingCount = incidents.filter(
    (i) => i.status === "Pendientes",
  ).length;
  const visible =
    filter === "all"
      ? incidents
      : incidents.filter((i) => i.status === filter);

  const validate = (id: string) =>
    setIncidents((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: "Validados" } : i)),
    );
  const discard = (id: string) =>
    setIncidents((prev) => prev.filter((i) => i.id !== id));

  return (
    <>
      <PageHeader
        title="Incidentes"
        subtitle={`${pendingCount} pendientes de moderación`}
      />

      <FilterChips options={filters} value={filter} onChange={setFilter} />

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {visible.map((incident) => (
          <article
            key={incident.id}
            className="rounded-2xl border border-border bg-surface p-5 shadow-card-soft"
          >
            <div className="flex items-start gap-3">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                  toneIconClass[incident.tone]
                }`}
              >
                <Icon name={incident.icon} size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="truncate text-md font-extrabold text-brand">
                    {incident.title} · Ruta {incident.routeCode}
                  </h3>
                  {incident.status === "Validados" ? (
                    <Badge tone="success">Validado</Badge>
                  ) : null}
                </div>
                <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                  “{incident.quote}” · {incident.author} · {incident.ago}
                </p>
              </div>
            </div>

            {incident.status === "Pendientes" ? (
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => validate(incident.id)}
                  className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand text-sm font-extrabold text-on-dark hover:brightness-110"
                >
                  <Icon name="check" size={15} strokeWidth={2.6} />
                  Validar
                </button>
                <button
                  type="button"
                  onClick={() => discard(incident.id)}
                  className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border-[1.5px] border-border-subtle text-sm font-extrabold text-text-secondary hover:bg-surface-alt"
                >
                  <Icon name="x" size={15} />
                  Descartar
                </button>
              </div>
            ) : null}
          </article>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
          <p className="text-md font-bold text-brand">Sin incidentes</p>
          <p className="mt-1 text-sm text-text-secondary">
            No hay reportes en esta vista.
          </p>
        </div>
      ) : null}
    </>
  );
}
