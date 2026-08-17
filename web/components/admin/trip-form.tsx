"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { saveTripAction } from "@/app/(admin)/trips/actions";
import type { AdminBus, AdminDriver, AdminRoute } from "@/lib/api/types";

const inputClass =
  "h-11 w-full rounded-xl border border-border-subtle bg-surface px-4 text-md text-brand outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30";

export function TripForm({
  routes,
  drivers,
  buses,
}: {
  routes: AdminRoute[];
  drivers: AdminDriver[];
  buses: AdminBus[];
}) {
  const router = useRouter();
  const [routeId, setRouteId] = useState(routes[0]?.id ?? "");
  const [busId, setBusId] = useState(buses[0]?.id ?? "");
  const [driverId, setDriverId] = useState(drivers[0]?.user_id ?? "");
  const [departureTime, setDepartureTime] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const activeDrivers = drivers.filter((driver) => driver.is_active);

  function submit() {
    if (!routeId) {
      setError("Seleccioná una ruta.");
      return;
    }
    if (!busId) {
      setError("Seleccioná un autobús.");
      return;
    }
    if (!driverId) {
      setError("Seleccioná un conductor.");
      return;
    }
    if (!departureTime) {
      setError("Indicá la hora de salida.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await saveTripAction({
        route_id: routeId,
        bus_id: busId,
        driver_id: driverId,
        departure_time: departureTime,
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      router.push("/trips");
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      className="mx-auto flex max-w-2xl flex-col gap-6"
    >
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-card-soft">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="text-sm font-bold text-brand">Ruta</span>
            <select
              value={routeId}
              onChange={(event) => setRouteId(event.target.value)}
              className={inputClass}
              required
            >
              {routes.map((route) => (
                <option key={route.id} value={route.id}>
                  {route.name} ({route.origin} → {route.destination})
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-bold text-brand">Autobús</span>
            <select
              value={busId}
              onChange={(event) => setBusId(event.target.value)}
              className={inputClass}
              required
            >
              {buses.map((bus) => (
                <option key={bus.id} value={bus.id}>
                  {bus.plate_number} · {bus.capacity} pasajeros
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-bold text-brand">Conductor</span>
            <select
              value={driverId}
              onChange={(event) => setDriverId(event.target.value)}
              className={inputClass}
              required
            >
              {activeDrivers.map((driver) => (
                <option key={driver.user_id} value={driver.user_id}>
                  {driver.name} ({driver.email})
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="text-sm font-bold text-brand">Hora de salida</span>
            <input
              type="datetime-local"
              value={departureTime}
              onChange={(event) => setDepartureTime(event.target.value)}
              className={inputClass}
              required
            />
          </label>
        </div>
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
          href="/trips"
          className="flex h-11 items-center gap-2 rounded-xl border-[1.5px] border-border-subtle px-5 text-md font-bold text-brand hover:bg-surface-alt"
        >
          <Icon name="arrowLeft" size={16} />
          Cancelar
        </Link>
        <button
          type="submit"
          disabled={pending}
          aria-label="Programar viaje"
          className="flex h-11 items-center gap-2 rounded-xl bg-accent px-6 text-md font-extrabold text-brand transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Icon name="plus" size={18} />
          {pending ? "Programando…" : "Programar viaje"}
        </button>
      </div>
    </form>
  );
}
