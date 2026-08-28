import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { StopForm } from "@/components/admin/stop-form";
import { LoadError } from "@/components/admin/load-error";
import { PageHeader } from "@/components/admin/page-header";
import { getRoutes } from "@/lib/api/admin";

export const metadata: Metadata = {
  title: "Nueva parada",
};

export default async function NewStopPage({
  searchParams,
}: {
  searchParams: Promise<{ route_id?: string }>;
}) {
  const { route_id } = await searchParams;
  const result = await getRoutes();

  if (!result.ok) {
    return (
      <>
        <PageHeader title="Nueva parada" subtitle="No se pudieron cargar las rutas" />
        <LoadError failure={result} />
      </>
    );
  }

  const routes = result.data;

  if (routes.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
        <p className="text-md font-bold text-brand">No hay rutas</p>
        <p className="mt-1 text-sm text-text-secondary">
          Creá al menos una ruta antes de agregar paradas.
        </p>
        <Link
          href="/routes/new"
          className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-accent px-5 text-md font-extrabold text-brand"
        >
          <Icon name="plus" size={18} />
          Nueva ruta
        </Link>
      </div>
    );
  }

  const initialRouteId =
    route_id && routes.some((route) => route.id === route_id) ? route_id : undefined;

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
          Nueva parada
        </h1>
      </div>
      <StopForm routes={routes} initialRouteId={initialRouteId} />
    </div>
  );
}
