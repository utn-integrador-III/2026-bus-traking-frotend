"use server";

import { revalidatePath } from "next/cache";
import { deactivateDriver } from "@/lib/api/admin";
import type { ActionResult } from "@/app/(admin)/routes/actions";

export async function deactivateDriverAction(id: string): Promise<ActionResult> {
  const result = await deactivateDriver(id);
  if (!result.ok) return { ok: false, message: result.message };
  revalidatePath("/users");
  return { ok: true };
}
