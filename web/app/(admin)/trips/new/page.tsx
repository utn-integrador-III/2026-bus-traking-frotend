import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { TripForm } from "@/components/admin/trip-form";
import { LoadError } from "@/components/admin/load-error";
import { PageHeader } from "@/components/admin/page-header";
import { getBuses, getDrivers, getRoutes } from "@/lib/api/admin";

export const metadata: Metadata = {
  title: "Programar viaje",
};

export default async function NewTripPage() {
  const [routesResult, driversResult, busesResult] = await Promise.all([
    getRoutes(),
    getDrivers(),
    getBuses(),
  ]);

  if (!routesResult.ok) {
    return (
      <>
        <PageHeader title="Programar viaje" subtitle="No se pudieron cargar las rutas" />
        <LoadError failure={routesResult} />
      </>
    );
  }
  if (!driversResult.ok) {
    return (
      <>
        <PageHeader title="Programar viaje" subtitle="No se pudieron cargar los conductores" />
        <LoadError failure={driversResult} />
      </>
    );
  }
  if (!busesResult.ok) {
    return (
      <>
        <PageHeader title="Programar viaje" subtitle="No se pudieron cargar los autobuses" />
        <LoadError failure={busesResult} />
      </>
    );
  }

  const routes = routesResult.data;
  const drivers = driversResult.data;
  const buses = busesResult.data;

  if (routes.length === 0 || buses.length === 0 || drivers.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
        <p className="text-md font-bold text-brand">Faltan datos base</p>
        <p className="mt-1 text-sm text-text-secondary">
          Necesitás al menos una ruta, un autobús y un conductor activo para
          programar un viaje.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/trips"
          aria-label="Volver a viajes"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface text-brand hover:bg-surface-alt"
        >
          <Icon name="arrowLeft" size={20} />
        </Link>
        <h1 className="text-5xl font-extrabold tracking-tight text-brand">
          Programar viaje
        </h1>
      </div>
      <TripForm routes={routes} drivers={drivers} buses={buses} />
    </div>
  );
}
