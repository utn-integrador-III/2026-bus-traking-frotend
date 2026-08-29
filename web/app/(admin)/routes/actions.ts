"use server";

import { revalidatePath } from "next/cache";
import {
  createRoute,
  deactivateRoute,
  reactivateRoute,
  updateRoute,
  createStop,
  updateStop,
  deleteStop,
} from "@/lib/api/admin";
import type { GeoJsonLineString } from "@/lib/api/types";

export type ActionResult = { ok: true; id?: string } | { ok: false; message: string };

export type RouteStopInput = {
  id?: string;
  name: string;
  latitude: number;
  longitude: number;
  geofence_radius_meters: number;
};

export type RouteFormInput = {
  id?: string;
  name: string;
  origin: string;
  destination: string;
  geometry_geojson: GeoJsonLineString;
  stops?: RouteStopInput[];
  deleted_stop_ids?: string[];
};

function isValidGeometry(geometry: GeoJsonLineString) {
  return (
    Array.isArray(geometry.coordinates) &&
    geometry.coordinates.length >= 2 &&
    geometry.coordinates.every(
      (position) =>
        Array.isArray(position) &&
        position.length >= 2 &&
        Number.isFinite(position[0]) &&
        Number.isFinite(position[1]),
    )
  );
}

export async function saveRouteAction(input: RouteFormInput): Promise<ActionResult> {
  const name = input.name.trim();
  const origin = input.origin.trim();
  const destination = input.destination.trim();

  if (!name || !origin || !destination) {
    return { ok: false, message: "Nombre, origen y destino son obligatorios." };
  }
  if (!isValidGeometry(input.geometry_geojson)) {
    return { ok: false, message: "El trazado debe tener al menos 2 puntos válidos." };
  }
  if (!areValidStops(input.stops ?? [])) {
    return { ok: false, message: "Revisá el nombre, ubicación y radio de cada parada." };
  }

  const payload = {
    name,
    origin,
    destination,
    geometry_geojson: input.geometry_geojson,
  };

  let routeId = input.id;
  if (routeId) {
    const result = await updateRoute(routeId, payload);
    if (!result.ok) return { ok: false, message: result.message };
  } else {
    const result = await createRoute(payload);
    if (!result.ok) return { ok: false, message: result.message };
    routeId = result.data.id;
  }
  if (!routeId) {
    return { ok: false, message: "La API no devolvió el identificador de la ruta creada." };
  }

  for (const stopId of input.deleted_stop_ids ?? []) {
    const stopResult = await deleteStop(stopId);
    if (!stopResult.ok) {
      return { ok: false, message: `La ruta se guardó, pero no se pudo eliminar una parada: ${stopResult.message}` };
    }
  }

  for (const [index, stop] of (input.stops ?? []).entries()) {
    const stopPayload = {
      route_id: routeId,
      name: stop.name.trim(),
      latitude: stop.latitude,
      longitude: stop.longitude,
      stop_order: index + 1,
      geofence_radius_meters: stop.geofence_radius_meters,
    };
    const stopResult = stop.id
      ? await updateStop(stop.id, stopPayload)
      : await createStop(stopPayload);
    if (!stopResult.ok) {
      return { ok: false, message: `La ruta se guardó, pero falló la parada ${index + 1}: ${stopResult.message}` };
    }
  }

  revalidatePath("/routes");
  revalidatePath("/stops");
  return { ok: true, id: routeId };
}

function areValidStops(stops: RouteStopInput[]) {
  return stops.every(
    (stop) =>
      stop.name.trim().length > 0 &&
      Number.isFinite(stop.latitude) &&
      Number.isFinite(stop.longitude) &&
      Number.isInteger(stop.geofence_radius_meters) &&
      stop.geofence_radius_meters > 0,
  );
}

export async function deactivateRouteAction(id: string): Promise<ActionResult> {
  const result = await deactivateRoute(id);
  if (!result.ok) return { ok: false, message: result.message };
  revalidatePath("/routes");
  return { ok: true };
}

export async function reactivateRouteAction(id: string): Promise<ActionResult> {
  const result = await reactivateRoute(id);
  if (!result.ok) return { ok: false, message: result.message };
  revalidatePath("/routes");
  return { ok: true };
}
