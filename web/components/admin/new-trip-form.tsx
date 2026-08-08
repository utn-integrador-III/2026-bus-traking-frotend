"use client";

import { useState, useTransition } from "react";
import { createTripAction } from "@/app/(admin)/trips/new/actions";
import type { AdminBus, AdminDriver, AdminRoute } from "@/lib/api/types";

function formatDateTimeLocal(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

export function NewTripForm({
  routes,
  buses,
  drivers,
}: {
  routes: AdminRoute[];
  buses: AdminBus[];
  drivers: AdminDriver[];
}) {
  const [pending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [routeId, setRouteId] = useState("");
  const [busId, setBusId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [departure, setDeparture] = useState("");

  const activeBuses = buses.filter((bus) => bus.status === "active");
  const activeDrivers = drivers.filter((driver) => driver.is_active);
  const canSubmit = routeId && busId && driverId && departure;

  function submit() {
    if (!canSubmit) return;
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const result = await createTripAction({
        route_id: routeId,
        bus_id: busId,
        driver_id: driverId,
        departure_time: new Date(departure).toISOString(),
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setSuccess(true);
      setRouteId("");
      setBusId("");
      setDriverId("");
      setDeparture("");
    });
  }

  const selectClass =
    "w-full rounded-xl border border-border bg-surface px-4 py-3 text-md text-brand outline-none transition focus:border-brand";

  return (
    <div className="flex flex-col gap-4">
      {success ? (
        <p
          role="status"
          className="rounded-xl border border-success-bg bg-success-bg/40 px-4 py-3 text-sm font-bold text-success"
        >
          Viaje programado correctamente.
        </p>
      ) : null}

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-bold text-brand">Ruta</span>
        <select value={routeId} onChange={(e) => setRouteId(e.target.value)} className={selectClass}>
          <option value="">Seleccionar ruta…</option>
          {routes.map((route) => (
            <option key={route.id} value={route.id}>
              {route.name} ({route.origin} → {route.destination})
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-bold text-brand">Bus</span>
        <select value={busId} onChange={(e) => setBusId(e.target.value)} className={selectClass}>
          <option value="">Seleccionar bus…</option>
          {activeBuses.map((bus) => (
            <option key={bus.id} value={bus.id}>
              {bus.plate_number} (capacidad {bus.capacity})
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-bold text-brand">Conductor</span>
        <select value={driverId} onChange={(e) => setDriverId(e.target.value)} className={selectClass}>
          <option value="">Seleccionar conductor…</option>
          {activeDrivers.map((driver) => (
            <option key={driver.user_id} value={driver.user_id}>
              {driver.name} ({driver.email})
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-bold text-brand">Salida</span>
        <input
          type="datetime-local"
          value={departure}
          onChange={(e) => setDeparture(e.target.value)}
          className={selectClass}
        />
      </label>

      {error ? (
        <p role="alert" className="text-sm font-bold text-danger">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={submit}
        disabled={!canSubmit || pending}
        className="mt-2 flex h-11 items-center justify-center gap-2 rounded-xl bg-brand px-6 text-sm font-bold text-on-dark transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Programando…" : "Programar viaje"}
      </button>

      <p className="text-xs text-text-secondary">
        Salida inicial:{" "}
        {departure ? formatDateTimeLocal(new Date(departure).toISOString()) : "—"}
      </p>
    </div>
  );
}
