import { Badge, type BadgeTone } from "@/components/admin/badge";
import type { AdminDriver, AdminRoute, AdminTrip, TripStatus } from "@/lib/api/types";

const statusLabel: Record<TripStatus, string> = {
  Scheduled: "Programado",
  Pending: "Pendiente",
  In_Progress: "En curso",
  Stopped: "Detenido",
  Delayed: "Con demora",
  Completed: "Completado",
  Cancelled: "Cancelado",
};

const statusTone: Record<TripStatus, BadgeTone> = {
  Scheduled: "info",
  Pending: "neutral",
  In_Progress: "success",
  Stopped: "danger",
  Delayed: "warning",
  Completed: "neutral",
  Cancelled: "danger",
};

const timeFormatter = new Intl.DateTimeFormat("es-CR", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function formatTime(value: string | null) {
  if (!value) return "Sin hora";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Sin hora" : timeFormatter.format(date);
}

export function TripList({
  trips,
  routes,
  drivers,
}: {
  trips: AdminTrip[];
  routes: AdminRoute[];
  drivers: AdminDriver[];
}) {
  if (trips.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border bg-surface-alt p-6 text-center text-sm text-text-secondary">
        La API no devolvió viajes.
      </p>
    );
  }

  const routeName = new Map(routes.map((route) => [route.id, route.name]));
  const driverName = new Map(
    drivers.map((driver) => [driver.user_id, driver.name ?? driver.email]),
  );

  const ordered = [...trips].sort(
    (a, b) =>
      new Date(b.departure_time).getTime() - new Date(a.departure_time).getTime(),
  );

  return (
    <ul className="flex flex-col gap-3">
      {ordered.map((trip) => {
        const route = routeName.get(trip.route_id) ?? "Ruta desconocida";
        const driver = driverName.get(trip.driver_id) ?? "Conductor sin asignar";
        return (
          <li
            key={trip.id}
            className="rounded-xl border border-border-subtle bg-surface-alt p-3"
          >
            <div className="flex items-start justify-between gap-2">
              <p title={route} className="min-w-0 truncate text-md font-bold text-brand">
                {route}
              </p>
              <Badge tone={statusTone[trip.status] ?? "neutral"}>
                {statusLabel[trip.status] ?? trip.status}
              </Badge>
            </div>
            <p title={driver} className="mt-1 truncate text-xs text-text-secondary">
              {driver} · sale {formatTime(trip.departure_time)}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
