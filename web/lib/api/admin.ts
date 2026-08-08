import "server-only";
import { apiFetch, ApiError, ApiUnreachableError } from "./client";
import { readSession } from "@/lib/auth/session";
import type {
  AdminBus,
  AdminDriver,
  AdminIncident,
  AdminRoute,
  AdminStop,
  AdminTrip,
  AdminTripInput,
  CurrentTelemetry,
  IncidentStatus,
  StopInput,
  TelemetryPoint,
  TripStatus,
} from "./types";

export type LoadResult<T> =
  | { ok: true; data: T }
  | { ok: false; kind: "auth" | "unreachable" | "error"; message: string };

async function call<T>(
  path: string,
  options: { method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"; body?: unknown } = {},
): Promise<LoadResult<T>> {
  const session = await readSession();
  if (!session) {
    return { ok: false, kind: "auth", message: "Tu sesión expiró. Iniciá sesión de nuevo." };
  }

  try {
    const data = await apiFetch<T>(path, { ...options, token: session.access_token });
    return { ok: true, data };
  } catch (error) {
    if (error instanceof ApiUnreachableError) {
      return {
        ok: false,
        kind: "unreachable",
        message: "No se pudo conectar con la API en el puerto 8000.",
      };
    }
    if (error instanceof ApiError) {
      return {
        ok: false,
        kind: error.isAuthError ? "auth" : "error",
        message: error.message,
      };
    }
    throw error;
  }
}

export function getRoutes() {
  return call<AdminRoute[]>("/admin/routes");
}

export function getDrivers() {
  return call<AdminDriver[]>("/admin/drivers");
}

export function getTrips() {
  return call<AdminTrip[]>("/admin/trips");
}

export function deactivateRoute(id: string) {
  return call<{ deleted: true }>(`/admin/routes/${id}`, { method: "DELETE" });
}

export function reactivateRoute(id: string) {
  return call<AdminRoute>(`/admin/routes/${id}/reactivate`, { method: "POST" });
}

export type RouteInput = Pick<AdminRoute, "name" | "origin" | "destination"> & {
  geometry_geojson: NonNullable<AdminRoute["geometry_geojson"]>;
};

export function updateRoute(id: string, input: RouteInput) {
  return call<AdminRoute>(`/admin/routes/${id}`, { method: "PUT", body: input });
}

export function deactivateDriver(id: string) {
  return call<AdminDriver>(`/admin/drivers/${id}`, { method: "DELETE" });
}

export function createRoute(input: RouteInput) {
  return call<AdminRoute>("/admin/routes", { method: "POST", body: input });
}

export function getStops(routeId?: string) {
  const query = routeId ? `?route_id=${encodeURIComponent(routeId)}` : "";
  return call<AdminStop[]>(`/admin/stops${query}`);
}

export function createStop(input: StopInput) {
  return call<AdminStop>("/admin/stops", { method: "POST", body: input });
}

export function updateStop(id: string, input: StopInput) {
  return call<AdminStop>(`/admin/stops/${id}`, { method: "PUT", body: input });
}

export function deleteStop(id: string) {
  return call<{ deleted: true }>(`/admin/stops/${id}`, { method: "DELETE" });
}

export function getBuses() {
  return call<AdminBus[]>("/admin/buses");
}

export function createTrip(input: AdminTripInput) {
  return call<AdminTrip>("/admin/trips", { method: "POST", body: input });
}

<<<<<<< HEAD
export function moderateIncident(id: string, moderationStatus: IncidentModerationStatus) {
  return call<AdminIncident>(`/admin/incidents/${id}`, {
    method: "PUT",
    body: { status: moderationStatus },
=======
export function updateTripStatus(id: string, status: TripStatus) {
  return call<AdminTrip>(`/admin/trips/${id}/status`, {
    method: "PATCH",
    body: { status },
>>>>>>> origin/dev
  });
}

export type CreateDriverInput = {
  name: string;
  email: string;
  password: string;
  license_number: string;
};

export function createDriver(input: CreateDriverInput) {
  return call<AdminDriver>("/admin/drivers", { method: "POST", body: input });
}

export function getIncidents(status?: IncidentStatus) {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  return call<AdminIncident[]>(`/admin/incidents${query}`);
}

export function updateIncidentStatus(id: string, status: IncidentStatus) {
  return call<AdminIncident>(`/admin/incidents/${id}`, {
    method: "PUT",
    body: { status },
  });
}

export function getTelemetryHistory(params: {
  trip_id: string;
  start_time: string;
  end_time: string;
}) {
  const query = new URLSearchParams(params).toString();
  return call<TelemetryPoint[]>(`/admin/telemetry/history?${query}`);
}

export function getCurrentTelemetry() {
  return call<CurrentTelemetry[]>("/admin/telemetry/current");
}
