import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { PageHeader } from "@/components/admin/page-header";
import { RouteCard } from "@/components/admin/route-card";
import { LoadError } from "@/components/admin/load-error";
import { getRoutes } from "@/lib/api/admin";

export const metadata: Metadata = {
  title: "Rutas",
};

export default async function RoutesPage() {
  const result = await getRoutes();

  if (!result.ok) {
    return (
      <>
        <PageHeader title="Rutas" subtitle="No se pudieron cargar las rutas" />
        <LoadError failure={result} />
      </>
    );
  }

  const routes = result.data;
  const active = routes.filter((route) => route.is_active).length;

  return (
    <>
      <PageHeader
        title="Rutas"
        subtitle={
          routes.length === 0
            ? "Sin rutas registradas"
            : `${routes.length} rutas · ${active} activas`
        }
        action={
          <Link
            href="/routes/new"
            className="flex h-11 items-center gap-2 rounded-xl bg-accent px-5 text-md font-extrabold text-brand transition hover:brightness-105"
          >
            <Icon name="plus" size={18} />
            Nueva ruta
          </Link>
        }
      />

      {routes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
          <p className="text-md font-bold text-brand">No hay rutas</p>
          <p className="mt-1 text-sm text-text-secondary">
            La API no devolvió ninguna ruta todavía.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {routes.map((route) => (
            <RouteCard key={route.id} route={route} />
          ))}
        </div>
      )}
    </>
  );
}
