"use client";

import { useState } from "react";
import { Icon } from "@/components/icon";
import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/admin/badge";
import { Button } from "@/components/admin/button";
import { routes as initialRoutes } from "@/lib/admin-data";

export default function RoutesPage() {
  const [routes, setRoutes] = useState(initialRoutes);

  const remove = (id: string) =>
    setRoutes((prev) => prev.filter((route) => route.id !== id));

  return (
    <>
      <PageHeader
        title="Rutas y paradas"
        subtitle={`${routes.length} rutas configuradas`}
        action={
          <>
            <Button variant="outline" icon="calendar" href="/trips/new">
              Programar viaje
            </Button>
            <Button variant="primary" icon="plus">
              Nueva ruta
            </Button>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {routes.map((route) => {
          const inactive = route.status === "Inactiva";
          return (
            <article
              key={route.id}
              className={`rounded-2xl border border-border bg-surface p-5 shadow-card-soft ${
                inactive ? "opacity-70" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-base font-extrabold ${
                    inactive
                      ? "bg-surface-alt text-text-secondary"
                      : "bg-brand text-on-dark"
                  }`}
                >
                  {route.code}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-lg font-bold text-brand">
                    {route.name}
                  </div>
                  <div className="text-xs text-text-secondary">
                    {route.stops} paradas · {route.distanceKm} km
                  </div>
                </div>
                <Badge tone={inactive ? "neutral" : "success"}>
                  {route.status}
                </Badge>
              </div>

              <div className="mt-4 flex gap-2 border-t border-divider pt-4">
                <button
                  type="button"
                  className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-surface-alt text-sm font-bold text-brand hover:brightness-95"
                >
                  <Icon name="edit" size={14} />
                  Editar
                </button>
                <button
                  type="button"
                  className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-surface-alt text-sm font-bold text-brand hover:brightness-95"
                >
                  <Icon name="mapPin" size={14} />
                  Paradas
                </button>
                <button
                  type="button"
                  aria-label={`Eliminar ${route.name}`}
                  onClick={() => remove(route.id)}
                  className="flex h-9 w-10 items-center justify-center rounded-lg bg-danger-bg text-danger hover:brightness-95"
                >
                  <Icon name="trash" size={15} />
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {routes.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
          <p className="text-md font-bold text-brand">No hay rutas</p>
          <p className="mt-1 text-sm text-text-secondary">
            Creá una nueva ruta para comenzar.
          </p>
        </div>
      ) : null}
    </>
  );
}
