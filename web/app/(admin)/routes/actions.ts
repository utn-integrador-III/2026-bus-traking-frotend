"use server";

import { revalidatePath } from "next/cache";
import {
  createRoute,
  deactivateRoute,
  reactivateRoute,
  updateRoute,
} from "@/lib/api/admin";
import type { GeoJsonLineString } from "@/lib/api/types";

export type ActionResult = { ok: true } | { ok: false; message: string };

export type RouteFormInput = {
  id?: string;
  name: string;
  origin: string;
  destination: string;
  geometry_geojson: GeoJsonLineString;
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

  const payload = {
    name,
    origin,
    destination,
    geometry_geojson: input.geometry_geojson,
  };

  const result = input.id
    ? await updateRoute(input.id, payload)
    : await createRoute(payload);

  if (!result.ok) return { ok: false, message: result.message };
  revalidatePath("/routes");
  return { ok: true };
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
