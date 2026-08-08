"use server";

import { revalidatePath } from "next/cache";
import { createStop, deleteStop, updateStop } from "@/lib/api/admin";

export type ActionResult = { ok: true } | { ok: false; message: string };

export type StopFormInput = {
  id?: string;
  name: string;
  route_id: string;
  latitude: number;
  longitude: number;
  stop_order: number;
};

function isValid(input: StopFormInput) {
  return (
    input.name.trim().length > 0 &&
    input.route_id.length > 0 &&
    Number.isFinite(input.latitude) &&
    Number.isFinite(input.longitude) &&
    Number.isInteger(input.stop_order) &&
    input.stop_order >= 1
  );
}

export async function saveStopAction(input: StopFormInput): Promise<ActionResult> {
  if (!isValid(input)) {
    return { ok: false, message: "Datos de parada inválidos." };
  }

  const payload = {
    name: input.name.trim(),
    route_id: input.route_id,
    latitude: input.latitude,
    longitude: input.longitude,
    stop_order: input.stop_order,
  };

  const result = input.id
    ? await updateStop(input.id, payload)
    : await createStop(payload);

  if (!result.ok) return { ok: false, message: result.message };
  revalidatePath("/stops");
  revalidatePath("/routes");
  return { ok: true };
}

export async function deleteStopAction(id: string): Promise<ActionResult> {
  const result = await deleteStop(id);
  if (!result.ok) return { ok: false, message: result.message };
  revalidatePath("/stops");
  revalidatePath("/routes");
  return { ok: true };
}
