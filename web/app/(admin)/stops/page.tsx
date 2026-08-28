import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { PageHeader } from "@/components/admin/page-header";
import { StopRow } from "@/components/admin/stop-row";
import { LoadError } from "@/components/admin/load-error";
import { getRoutes, getStops } from "@/lib/api/admin";

export const metadata: Metadata = {
  title: "Paradas",
};

export default async function StopsPage({
  searchParams,
}: {
  searchParams: Promise<{ route_id?: string }>;
}) {
  const { route_id } = await searchParams;
  const [routesResult, stopsResult] = await Promise.all([
    getRoutes(),
    getStops(route_id),
  ]);

  if (!routesResult.ok) {
    return (
      <>
        <PageHeader title="Paradas" subtitle="No se pudieron cargar las rutas" />
        <LoadError failure={routesResult} />
      </>
    );
  }
  if (!stopsResult.ok) {
    return (
      <>
        <PageHeader title="Paradas" subtitle="No se pudieron cargar las paradas" />
        <LoadError failure={stopsResult} />
      </>
    );
  }

  const routes = routesResult.data;
  const stops = stopsResult.data;
  const routeName = new Map(routes.map((route) => [route.id, route.name]));
  const selectedRoute = route_id && routeName.has(route_id) ? route_id : null;

  return (
    <>
      <PageHeader
        title="Paradas"
        subtitle={
          stops.length === 0
            ? "Sin paradas registradas"
            : `${stops.length} paradas${selectedRoute ? ` · ${routeName.get(selectedRoute)}` : ""}`
        }
        action={
          <Link
            href={selectedRoute ? `/stops/new?route_id=${selectedRoute}` : "/stops/new"}
            className="flex h-11 items-center gap-2 rounded-xl bg-accent px-5 text-md font-extrabold text-brand transition hover:brightness-105"
          >
            <Icon name="plus" size={18} />
            Nueva parada
          </Link>
        }
      />

      {routes.length > 1 ? (
        <div className="mb-6 flex flex-wrap gap-2">
          <Link
            href="/stops"
            aria-pressed={!selectedRoute}
            className={`rounded-full px-4 py-2 text-sm font-bold transition-colors ${
              !selectedRoute
                ? "bg-brand text-on-dark"
                : "border border-border-subtle bg-surface text-text-secondary hover:text-brand"
            }`}
          >
            Todas
          </Link>
          {routes.map((route) => (
            <Link
              key={route.id}
              href={`/stops?route_id=${route.id}`}
              aria-pressed={selectedRoute === route.id}
              className={`max-w-[220px] truncate rounded-full px-4 py-2 text-sm font-bold transition-colors ${
                selectedRoute === route.id
                  ? "bg-brand text-on-dark"
                  : "border border-border-subtle bg-surface text-text-secondary hover:text-brand"
              }`}
            >
              {route.name}
            </Link>
          ))}
        </div>
      ) : null}

      {stops.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
          <p className="text-md font-bold text-brand">No hay paradas</p>
          <p className="mt-1 text-sm text-text-secondary">
            La API no devolvió ninguna parada{selectedRoute ? " para esta ruta" : ""}.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {[...stops]
            .sort((a, b) => a.stop_order - b.stop_order)
            .map((stop) => (
              <StopRow
                key={stop.id}
                stop={stop}
                routeName={routeName.get(stop.route_id) ?? "Ruta desconocida"}
              />
            ))}
        </div>
      )}
    </>
  );
}
