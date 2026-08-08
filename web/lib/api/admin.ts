import "server-only";
import { apiFetch, ApiError, ApiUnreachableError } from "./client";
import { readSession } from "@/lib/auth/session";
import type { AdminDriver, AdminRoute, AdminTrip } from "./types";

export type LoadResult<T> =
  | { ok: true; data: T }
  | { ok: false; kind: "auth" | "unreachable" | "error"; message: string };

async function call<T>(
  path: string,
  options: { method?: "GET" | "POST" | "PUT" | "DELETE"; body?: unknown } = {},
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
