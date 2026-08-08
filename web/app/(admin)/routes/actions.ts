"use server";

import { revalidatePath } from "next/cache";
import { deactivateRoute, reactivateRoute } from "@/lib/api/admin";

export type ActionResult = { ok: true } | { ok: false; message: string };

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
