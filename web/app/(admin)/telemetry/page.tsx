import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/page-header";
import { TelemetryHistory } from "@/components/admin/telemetry-history";
import { LoadError } from "@/components/admin/load-error";
import { getRoutes, getTrips } from "@/lib/api/admin";

export const metadata: Metadata = {
  title: "Historial",
};

export default async function TelemetryPage() {
  const [tripsResult, routesResult] = await Promise.all([
    getTrips(),
    getRoutes(),
  ]);

  if (!tripsResult.ok) {
    return (
      <>
        <PageHeader title="Historial" subtitle="No se pudieron cargar los viajes" />
        <LoadError failure={tripsResult} />
      </>
    );
  }
  if (!routesResult.ok) {
    return (
      <>
        <PageHeader title="Historial" subtitle="No se pudieron cargar las rutas" />
        <LoadError failure={routesResult} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Historial"
        subtitle="Consultá las trazas históricas de un viaje por rango de fechas"
      />
      <TelemetryHistory trips={tripsResult.data} routes={routesResult.data} />
    </>
  );
}
