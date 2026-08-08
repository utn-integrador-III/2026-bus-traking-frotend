"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/icon";
import {
  StopLocationPicker,
  type LatLng,
} from "@/components/admin/stop-location-picker";
import { saveStopAction } from "@/app/(admin)/stops/actions";
import type { AdminRoute, AdminStop } from "@/lib/api/types";

const inputClass =
  "h-11 w-full rounded-xl border border-border-subtle bg-surface px-4 text-md text-brand outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30";

export function StopForm({
  routes,
  stop,
  initialRouteId,
}: {
  routes: AdminRoute[];
  stop?: AdminStop;
  initialRouteId?: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(stop?.name ?? "");
  const [routeId, setRouteId] = useState(
    stop?.route_id ?? initialRouteId ?? routes[0]?.id ?? "",
  );
  const [stopOrder, setStopOrder] = useState(String(stop?.stop_order ?? 1));
  const [location, setLocation] = useState<LatLng | null>(
    stop ? { lat: stop.latitude, lng: stop.longitude } : null,
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!name.trim()) {
      setError("El nombre de la parada es obligatorio.");
      return;
    }
    if (!routeId) {
      setError("Seleccioná una ruta.");
      return;
    }
    if (!location) {
      setError("Ubicá la parada en el mapa.");
      return;
    }
    const order = Number(stopOrder);
    if (!Number.isInteger(order) || order < 1) {
      setError("El orden debe ser un número entero mayor o igual a 1.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await saveStopAction({
        id: stop?.id,
        name: name.trim(),
        route_id: routeId,
        latitude: location.lat,
        longitude: location.lng,
        stop_order: order,
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      router.push("/stops");
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
              placeholder="Ej. Estación Atlántico"
              className={inputClass}
              required
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-bold text-brand">Ruta</span>
            <select
              value={routeId}
              onChange={(event) => setRouteId(event.target.value)}
              className={inputClass}
              required
            >
              {routes.map((route) => (
                <option key={route.id} value={route.id}>
                  {route.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-bold text-brand">Orden</span>
            <input
              type="number"
              min={1}
              value={stopOrder}
              onChange={(event) => setStopOrder(event.target.value)}
              className={inputClass}
              required
            />
          </label>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-6 shadow-card-soft">
        <h2 className="text-3xl font-extrabold text-brand">Geocerca</h2>
        <p className="mb-4 mt-1 text-xs text-text-secondary">
          El círculo visualiza la geocerca de 500 m que usa la API para el
          aviso de aproximación.
        </p>
        <StopLocationPicker value={location} onChange={setLocation} />
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-xl bg-danger-bg px-4 py-3 text-sm font-bold text-danger"
        >
          {error}
        </p>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <Link
          href="/stops"
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
          <Icon name={stop ? "check" : "plus"} size={18} />
          {pending ? "Guardando…" : stop ? "Guardar cambios" : "Crear parada"}
        </button>
      </div>
    </form>
  );
}
