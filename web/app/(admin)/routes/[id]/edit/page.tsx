import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { RouteForm } from "@/components/admin/route-form";
import { LoadError } from "@/components/admin/load-error";
import { PageHeader } from "@/components/admin/page-header";
import { getRoutes } from "@/lib/api/admin";

export const metadata: Metadata = {
  title: "Editar ruta",
};

export default async function EditRoutePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getRoutes();

  if (!result.ok) {
    return (
      <>
        <PageHeader title="Editar ruta" subtitle="No se pudo cargar" />
        <LoadError failure={result} />
      </>
    );
  }

  const route = result.data.find((entry) => entry.id === id);

  if (!route) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
        <p className="text-md font-bold text-brand">Ruta no encontrada</p>
        <p className="mt-1 text-sm text-text-secondary">
          La ruta que querés editar ya no existe en la API.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/routes"
          aria-label="Volver a rutas"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface text-brand hover:bg-surface-alt"
        >
          <Icon name="arrowLeft" size={20} />
        </Link>
        <h1 className="text-5xl font-extrabold tracking-tight text-brand">
          Editar ruta
        </h1>
      </div>
      <RouteForm route={route} />
    </div>
  );
}
