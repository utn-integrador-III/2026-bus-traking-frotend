import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/admin/page-header";
import { IncidentRow } from "@/components/admin/incident-row";
import { LoadError } from "@/components/admin/load-error";
import { getIncidents, getRoutes, getTrips } from "@/lib/api/admin";
import type { IncidentStatus } from "@/lib/api/types";

export const metadata: Metadata = {
  title: "Alertas",
};

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "", label: "Todas" },
  { value: "Pending", label: "Pendientes" },
  { value: "Validated", label: "Validadas" },
  { value: "Archived", label: "Archivadas" },
  { value: "Dismissed", label: "Descartadas" },
];

const VALID_STATUSES: IncidentStatus[] = [
  "Pending",
  "Validated",
  "Archived",
  "Dismissed",
];

export default async function IncidentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const statusFilter =
    status && VALID_STATUSES.includes(status as IncidentStatus)
      ? (status as IncidentStatus)
      : undefined;

  const [incidentsResult, tripsResult, routesResult] = await Promise.all([
    getIncidents(statusFilter),
    getTrips(),
    getRoutes(),
  ]);

  if (!incidentsResult.ok) {
    return (
      <>
        <PageHeader title="Alertas" subtitle="No se pudieron cargar los reportes" />
        <LoadError failure={incidentsResult} />
      </>
    );
  }

  const incidents = incidentsResult.data;
  const trips = tripsResult.ok ? tripsResult.data : [];
  const routes = routesResult.ok ? routesResult.data : [];

  const routeName = new Map(routes.map((route) => [route.id, route.name]));
  const tripLabel = new Map(
    trips.map((trip) => [
      trip.id,
      `${routeName.get(trip.route_id) ?? "Ruta desconocida"} · ${new Date(
        trip.departure_time,
      ).toLocaleString("es-CR")}`,
    ]),
  );

  const pendingCount = incidents.filter(
    (incident) => incident.status === "Pending",
  ).length;

  return (
    <>
      <PageHeader
        title="Alertas"
        subtitle={
          incidents.length === 0
            ? "Sin reportes de la comunidad"
            : `${incidents.length} reportes · ${pendingCount} pendientes de moderar`
        }
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((filter) => {
          const active = statusFilter === filter.value || (!statusFilter && filter.value === "");
          return (
            <Link
              key={filter.value}
              href={filter.value ? `/incidents?status=${filter.value}` : "/incidents"}
              aria-pressed={active}
              className={`rounded-full px-4 py-2 text-sm font-bold transition-colors ${
                active
                  ? "bg-brand text-on-dark"
                  : "border border-border-subtle bg-surface text-text-secondary hover:text-brand"
              }`}
            >
              {filter.label}
            </Link>
          );
        })}
      </div>

      {incidents.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
          <p className="text-md font-bold text-brand">No hay reportes</p>
          <p className="mt-1 text-sm text-text-secondary">
            La API no devolvió reportes{statusFilter ? " con ese estado" : ""}.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {[...incidents].sort(
            (a, b) =>
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
          ).map((incident) => (
            <IncidentRow
              key={incident.id}
              incident={incident}
              tripName={tripLabel.get(incident.trip_id) ?? "Viaje desconocido"}
            />
          ))}
        </div>
      )}
    </>
  );
}
