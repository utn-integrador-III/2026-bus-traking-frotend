import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { PageHeader } from "@/components/admin/page-header";
import { TripRow } from "@/components/admin/trip-row";
import { LoadError } from "@/components/admin/load-error";
import { getBuses, getDrivers, getRoutes, getTrips } from "@/lib/api/admin";

export const metadata: Metadata = {
  title: "Viajes",
};

export default async function TripsPage() {
  const [tripsResult, routesResult, driversResult, busesResult] =
    await Promise.all([getTrips(), getRoutes(), getDrivers(), getBuses()]);

  if (!tripsResult.ok) {
    return (
      <>
        <PageHeader title="Viajes" subtitle="No se pudieron cargar los viajes" />
        <LoadError failure={tripsResult} />
      </>
    );
  }

  const trips = tripsResult.data;
  const routes = routesResult.ok ? routesResult.data : [];
  const drivers = driversResult.ok ? driversResult.data : [];
  const buses = busesResult.ok ? busesResult.data : [];

  const routeName = new Map(routes.map((route) => [route.id, route.name]));
  const driverName = new Map(
    drivers.map((driver) => [driver.user_id, driver.name ?? driver.email]),
  );
  const busPlate = new Map(
    buses.map((bus) => [bus.id, `${bus.plate_number} · ${bus.capacity}`]),
  );

  const ordered = [...trips].sort(
    (a, b) =>
      new Date(b.departure_time).getTime() - new Date(a.departure_time).getTime(),
  );

  return (
    <>
      <PageHeader
        title="Viajes"
        subtitle={
          trips.length === 0
            ? "Sin viajes programados"
            : `${trips.length} viajes · ${trips.filter((t) => t.status === "In_Progress").length} en curso`
        }
        action={
          <Link
            href="/trips/new"
            className="flex h-11 items-center gap-2 rounded-xl bg-accent px-5 text-md font-extrabold text-brand transition hover:brightness-105"
          >
            <Icon name="plus" size={18} />
            Programar viaje
          </Link>
        }
      />

      {trips.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
          <p className="text-md font-bold text-brand">No hay viajes</p>
          <p className="mt-1 text-sm text-text-secondary">
            La API no devolvió ningún viaje todavía.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {ordered.map((trip) => (
            <TripRow
              key={trip.id}
              tripId={trip.id}
              routeName={routeName.get(trip.route_id) ?? "Ruta desconocida"}
              driverName={driverName.get(trip.driver_id) ?? "Sin conductor"}
              busPlate={busPlate.get(trip.bus_id) ?? null}
              departureTime={trip.departure_time}
              status={trip.status}
            />
          ))}
        </div>
      )}
    </>
  );
}
