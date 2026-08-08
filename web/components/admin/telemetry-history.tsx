"use client";

import { useMemo, useState, useTransition } from "react";
import { Icon } from "@/components/icon";
import { TelemetryTrackMap } from "@/components/admin/telemetry-track-map";
import { loadTelemetryHistoryAction } from "@/app/(admin)/telemetry/actions";
import type { AdminRoute, AdminTrip, TelemetryPoint } from "@/lib/api/types";

const inputClass =
  "h-11 w-full rounded-xl border border-border-subtle bg-surface px-4 text-md text-brand outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30";

function toLocalInputValue(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatDuration(milliseconds: number) {
  const totalMinutes = Math.round(milliseconds / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes} min`;
}

export function TelemetryHistory({
  trips,
  routes,
}: {
  trips: AdminTrip[];
  routes: AdminRoute[];
}) {
  const routeName = useMemo(
    () => new Map(routes.map((route) => [route.id, route.name])),
    [routes],
  );

  const orderedTrips = useMemo(
    () =>
      [...trips].sort(
        (a, b) =>
          new Date(b.departure_time).getTime() -
          new Date(a.departure_time).getTime(),
      ),
    [trips],
  );

  const now = useMemo(() => new Date(), []);
  const [tripId, setTripId] = useState(orderedTrips[0]?.id ?? "");
  const [startTime, setStartTime] = useState(
    toLocalInputValue(new Date(now.getTime() - 24 * 60 * 60 * 1000)),
  );
  const [endTime, setEndTime] = useState(toLocalInputValue(now));
  const [history, setHistory] = useState<TelemetryPoint[] | null>(null);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function search() {
    if (!tripId) {
      setError("Seleccioná un viaje.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await loadTelemetryHistoryAction({
        trip_id: tripId,
        start_time: startTime,
        end_time: endTime,
      });
      if (!result.ok) {
        setError(result.message);
        setHistory(null);
        setSearched(true);
        return;
      }
      setHistory(result.data);
      setSearched(true);
    });
  }

  const stats = useMemo(() => {
    if (!history || history.length === 0) return null;
    const speeds = history.map((point) => point.speed);
    const avgSpeed =
      speeds.reduce((sum, speed) => sum + speed, 0) / speeds.length;
    const maxSpeed = Math.max(...speeds);
    const durationMs =
      new Date(history[history.length - 1].timestamp).getTime() -
      new Date(history[0].timestamp).getTime();
    return {
      avgSpeed,
      maxSpeed,
      durationMs: Number.isFinite(durationMs) ? Math.max(durationMs, 0) : 0,
    };
  }, [history]);

  const selectedTrip = orderedTrips.find((trip) => trip.id === tripId);

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-card-soft">
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="flex flex-col gap-1.5 sm:col-span-3">
            <span className="text-sm font-bold text-brand">Viaje</span>
            <select
              value={tripId}
              onChange={(event) => setTripId(event.target.value)}
              className={inputClass}
            >
              {orderedTrips.map((trip) => (
                <option key={trip.id} value={trip.id}>
                  {routeName.get(trip.route_id) ?? "Ruta desconocida"} ·{" "}
                  {new Date(trip.departure_time).toLocaleString("es-CR")} ·{" "}
                  {trip.status}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-bold text-brand">Desde</span>
            <input
              type="datetime-local"
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-bold text-brand">Hasta</span>
            <input
              type="datetime-local"
              value={endTime}
              onChange={(event) => setEndTime(event.target.value)}
              className={inputClass}
            />
          </label>
          <div className="flex items-end">
            <button
              type="button"
              onClick={search}
              disabled={pending}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-accent px-6 text-md font-extrabold text-brand transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Icon name="search" size={18} />
              {pending ? "Buscando…" : "Consultar traza"}
            </button>
          </div>
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

      {searched && history ? (
        <>
          {stats ? (
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-2xl border border-border bg-surface p-4 text-center shadow-card-soft">
                <div className="text-3xl font-extrabold text-brand">
                  {stats.durationMs > 0
                    ? formatDuration(stats.durationMs)
                    : "—"}
                </div>
                <div className="mt-1 text-xs font-medium text-text-secondary">
                  Duración
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-surface p-4 text-center shadow-card-soft">
                <div className="text-3xl font-extrabold text-brand">
                  {stats.avgSpeed.toFixed(1)}
                </div>
                <div className="mt-1 text-xs font-medium text-text-secondary">
                  Vel. media (km/h)
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-surface p-4 text-center shadow-card-soft">
                <div className="text-3xl font-extrabold text-brand">
                  {stats.maxSpeed.toFixed(1)}
                </div>
                <div className="mt-1 text-xs font-medium text-text-secondary">
                  Vel. máxima (km/h)
                </div>
              </div>
            </div>
          ) : null}

          <section className="rounded-2xl border border-border bg-surface p-5 shadow-card-soft">
            <h2 className="mb-1 text-3xl font-extrabold text-brand">
              Traza histórica
            </h2>
            <p className="mb-4 text-xs text-text-secondary">
              {routeName.get(selectedTrip?.route_id ?? "") ??
                "Ruta desconocida"}{" "}
              · {history.length} lecturas de telemetría.
            </p>
            <TelemetryTrackMap points={history} />
          </section>
        </>
      ) : null}

      {searched && !history && !error ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
          <p className="text-md font-bold text-brand">Sin telemetría</p>
          <p className="mt-1 text-sm text-text-secondary">
            La API no devolvió lecturas para ese viaje en el rango indicado.
          </p>
        </div>
      ) : null}
    </div>
  );
}
