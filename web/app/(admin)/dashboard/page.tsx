import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { Badge } from "@/components/admin/badge";
import { RouteMap } from "@/components/admin/route-map";
import { LoadError } from "@/components/admin/load-error";
import { TripList } from "@/components/admin/trip-list";
import { getRoutes, getDrivers, getTrips } from "@/lib/api/admin";

export const metadata: Metadata = {
  title: "Panel de control",
};

export default async function DashboardPage() {
  const [routesResult, tripsResult, driversResult] = await Promise.all([
    getRoutes(),
    getTrips(),
    getDrivers(),
  ]);

  if (!routesResult.ok) {
    return (
      <>
        <PageHeader title="Panel de control" subtitle="No se pudo cargar" />
        <LoadError failure={routesResult} />
      </>
    );
  }

  const routes = routesResult.data;
  const trips = tripsResult.ok ? tripsResult.data : [];
  const drivers = driversResult.ok ? driversResult.data : [];

  const activeRoutes = routes.filter((route) => route.is_active).length;
  const inProgress = trips.filter((trip) => trip.status === "In_Progress").length;
  const upcoming = trips.filter(
    (trip) => trip.status === "Scheduled" || trip.status === "Pending",
  ).length;
  const activeDrivers = drivers.filter((driver) => driver.is_active).length;

  return (
    <>
      <PageHeader
        title="Panel de control"
        subtitle="Datos en vivo desde la API de BusTrack"
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Rutas activas"
          value={String(activeRoutes)}
          tone="neutral"
          icon="shareNet"
        />
        <StatCard
          label="Viajes en curso"
          value={tripsResult.ok ? String(inProgress) : "—"}
          tone="success"
          icon="bus"
        />
        <StatCard
          label="Viajes programados"
          value={tripsResult.ok ? String(upcoming) : "—"}
          tone="warning"
          icon="clock"
        />
        <StatCard
          label="Conductores activos"
          value={driversResult.ok ? String(activeDrivers) : "—"}
          tone="neutral"
          icon="users"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="rounded-2xl border border-border bg-surface p-5 shadow-card-soft lg:col-span-2">
          <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-3xl font-extrabold text-brand">Trazado de rutas</h2>
            <Badge tone="neutral">{routes.length} rutas</Badge>
          </div>
          <p className="mb-4 text-xs text-text-secondary">
            Geometría real de cada ruta sobre OpenStreetMap. La posición en vivo de
            los buses llega por Supabase Realtime y todavía no está conectada.
          </p>
          <RouteMap routes={routes} />
        </section>

        <section className="rounded-2xl border border-border bg-surface p-5 shadow-card-soft">
          <h2 className="mb-4 text-3xl font-extrabold text-brand">Viajes</h2>
          {tripsResult.ok ? (
            <TripList trips={trips} routes={routes} drivers={drivers} />
          ) : (
            <LoadError failure={tripsResult} />
          )}
        </section>
      </div>
    </>
  );
}
