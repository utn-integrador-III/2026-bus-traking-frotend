"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { RouteGeometryEditor } from "@/components/admin/route-geometry-editor";
import { saveRouteAction } from "@/app/(admin)/routes/actions";
import { toLineString } from "@/lib/api/geo";
import type { AdminRoute, GeoJsonLineString } from "@/lib/api/types";

const inputClass =
  "h-11 w-full rounded-xl border border-border-subtle bg-surface px-4 text-md text-brand outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30";

export function RouteForm({ route }: { route?: AdminRoute }) {
  const router = useRouter();
  const [name, setName] = useState(route?.name ?? "");
  const [origin, setOrigin] = useState(route?.origin ?? "");
  const [destination, setDestination] = useState(route?.destination ?? "");
  const [geometry, setGeometry] = useState<GeoJsonLineString | null>(() =>
    toLineString(route?.geometry_geojson),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!name.trim() || !origin.trim() || !destination.trim()) {
      setError("Completá nombre, origen y destino.");
      return;
    }
    if (!geometry || geometry.coordinates.length < 2) {
      setError("Dibujá el recorrido en el mapa con al menos 2 puntos.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await saveRouteAction({
        id: route?.id,
        name: name.trim(),
        origin: origin.trim(),
        destination: destination.trim(),
        geometry_geojson: geometry,
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      router.push("/routes");
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      className="mx-auto flex max-w-3xl flex-col gap-6"
    >
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-card-soft">
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-bold text-brand">Nombre</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ej. San José – Cartago"
              className={inputClass}
              required
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-bold text-brand">Origen</span>
            <input
              value={origin}
              onChange={(event) => setOrigin(event.target.value)}
              placeholder="Ej. San José"
              className={inputClass}
              required
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-bold text-brand">Destino</span>
            <input
              value={destination}
              onChange={(event) => setDestination(event.target.value)}
              placeholder="Ej. Cartago"
              className={inputClass}
              required
            />
          </label>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-6 shadow-card-soft">
        <h2 className="text-3xl font-extrabold text-brand">Recorrido</h2>
        <p className="mb-4 mt-1 text-xs text-text-secondary">
          La geometría se guarda como GeoJSON LineString en la API.
        </p>
        <RouteGeometryEditor value={geometry} onChange={setGeometry} />
      </div>

      {error ? (
        <p role="alert" className="rounded-xl bg-danger-bg px-4 py-3 text-sm font-bold text-danger">
          {error}
        </p>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <Link
          href="/routes"
          className="flex h-11 items-center gap-2 rounded-xl border-[1.5px] border-border-subtle px-5 text-md font-bold text-brand hover:bg-surface-alt"
        >
          <Icon name="arrowLeft" size={16} />
          Cancelar
        </Link>
        <button
          type="submit"
          disabled={pending}
          className="flex h-11 items-center gap-2 rounded-xl bg-accent px-6 text-md font-extrabold text-brand transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Icon name={route ? "check" : "plus"} size={18} />
          {pending ? "Guardando…" : route ? "Guardar cambios" : "Crear ruta"}
        </button>
      </div>
    </form>
  );
}
