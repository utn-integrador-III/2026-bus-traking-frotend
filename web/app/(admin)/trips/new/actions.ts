"use server";

import { revalidatePath } from "next/cache";
import { createTrip } from "@/lib/api/admin";

export type ActionResult = { ok: true } | { ok: false; message: string };

export async function createTripAction(input: {
  route_id: string;
  bus_id: string;
  driver_id: string;
  departure_time: string;
}): Promise<ActionResult> {
  const result = await createTrip(input);
  if (!result.ok) return { ok: false, message: result.message };
  revalidatePath("/trips/new");
  revalidatePath("/dashboard");
  return { ok: true };
}
