"use server";

import { revalidatePath } from "next/cache";
import { createTrip, updateTripStatus } from "@/lib/api/admin";

export type ActionResult = { ok: true } | { ok: false; message: string };

export type TripFormInput = {
  route_id: string;
  bus_id: string;
  driver_id: string;
  departure_time: string;
};

export async function saveTripAction(input: TripFormInput): Promise<ActionResult> {
  const routeId = input.route_id.trim();
  const busId = input.bus_id.trim();
  const driverId = input.driver_id.trim();
  const departure = new Date(input.departure_time);

  if (!routeId || !busId || !driverId) {
    return { ok: false, message: "Ruta, autobús y conductor son obligatorios." };
  }
  if (Number.isNaN(departure.getTime())) {
    return { ok: false, message: "La hora de salida no es válida." };
  }

  const result = await createTrip({
    route_id: routeId,
    bus_id: busId,
    driver_id: driverId,
    departure_time: departure.toISOString(),
  });

  if (!result.ok) return { ok: false, message: result.message };
  revalidatePath("/trips");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function cancelTripAction(id: string): Promise<ActionResult> {
  const result = await updateTripStatus(id, "Cancelled");
  if (!result.ok) return { ok: false, message: result.message };
  revalidatePath("/trips");
  revalidatePath("/dashboard");
  return { ok: true };
}
