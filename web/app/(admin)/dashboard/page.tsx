import type { Metadata } from "next";
import { Icon } from "@/components/icon";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard, type StatTone } from "@/components/admin/stat-card";
import { Badge, type BadgeTone } from "@/components/admin/badge";
import { TelemetryMap } from "@/components/admin/telemetry-map";
import { dashboardStats, telemetryBuses } from "@/lib/admin-data";
import type { IconName } from "@bustrack/design";

export const metadata: Metadata = {
  title: "Panel de control · BusTrack Admin",
};

const statIcons: IconName[] = ["bus", "shareNet", "clock", "alertTriangle"];

const stateTone: Record<string, BadgeTone> = {
  "En ruta": "success",
  Demora: "warning",
  Detenido: "danger",
};

export default function DashboardPage() {
  return (
    <>
      <PageHeader title="Panel de control" subtitle="Martes 10 jun · 9:41" />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {dashboardStats.map((stat, i) => (
          <StatCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            tone={stat.tone as StatTone}
            icon={statIcons[i]}
          />
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="rounded-2xl border border-border bg-surface p-5 shadow-card-soft lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-3xl font-extrabold text-brand">
              Telemetría en vivo
            </h2>
            <span className="inline-flex items-center gap-2 text-sm font-bold text-success">
              <span className="h-2 w-2 animate-pulse rounded-full bg-success" />
              Tiempo real
            </span>
          </div>
          <TelemetryMap />
        </section>

        <section className="rounded-2xl border border-border bg-surface p-5 shadow-card-soft">
          <h2 className="mb-4 text-3xl font-extrabold text-brand">Buses en ruta</h2>
          <ul className="flex flex-col gap-3">
            {telemetryBuses.map((bus) => (
              <li
                key={bus.id}
                className="flex items-center gap-3 rounded-xl border border-border-subtle bg-surface-alt p-3"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand text-2xs font-extrabold text-on-dark">
                  {bus.code}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-md font-bold text-brand">
                    {bus.driver} · {bus.speedKmh} km/h
                  </div>
                  <div className="truncate text-xs text-text-secondary">
                    {bus.origin} → {bus.destination} · {bus.note}
                  </div>
                </div>
                <Badge tone={stateTone[bus.state]}>{bus.state}</Badge>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-border-subtle py-2.5 text-sm font-bold text-brand hover:bg-surface-alt"
          >
            <Icon name="locate" size={16} />
            Ver todos los buses
          </button>
        </section>
      </div>
    </>
  );
}
