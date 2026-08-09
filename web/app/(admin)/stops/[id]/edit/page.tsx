import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { StopForm } from "@/components/admin/stop-form";
import { LoadError } from "@/components/admin/load-error";
import { PageHeader } from "@/components/admin/page-header";
import { getRoutes, getStops } from "@/lib/api/admin";

export const metadata: Metadata = {
  title: "Editar parada",
};

export default async function EditStopPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [routesResult, stopsResult] = await Promise.all([
    getRoutes(),
    getStops(),
  ]);

  if (!routesResult.ok) {
    return (
      <>
        <PageHeader title="Editar parada" subtitle="No se pudo cargar" />
        <LoadError failure={routesResult} />
      </>
    );
  }
  if (!stopsResult.ok) {
    return (
      <>
        <PageHeader title="Editar parada" subtitle="No se pudo cargar" />
        <LoadError failure={stopsResult} />
      </>
    );
  }

  const routes = routesResult.data;
  const stop = stopsResult.data.find((entry) => entry.id === id);

  if (!stop) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
        <p className="text-md font-bold text-brand">Parada no encontrada</p>
        <p className="mt-1 text-sm text-text-secondary">
          La parada que querés editar ya no existe en la API.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/stops"
          aria-label="Volver a paradas"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface text-brand hover:bg-surface-alt"
        >
          <Icon name="arrowLeft" size={20} />
        </Link>
        <h1 className="text-5xl font-extrabold tracking-tight text-brand">
          Editar parada
        </h1>
      </div>
      <StopForm routes={routes} stop={stop} />
    </div>
  );
}
