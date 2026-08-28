"use server";

import { revalidatePath } from "next/cache";
import { updateIncidentStatus } from "@/lib/api/admin";
import type { IncidentStatus } from "@/lib/api/types";

export type ActionResult = { ok: true } | { ok: false; message: string };

const ALLOWED_STATUSES: IncidentStatus[] = [
  "Pending",
  "Validated",
  "Archived",
  "Dismissed",
];

export async function updateIncidentStatusAction(
  id: string,
  status: IncidentStatus,
): Promise<ActionResult> {
  if (!ALLOWED_STATUSES.includes(status)) {
    return { ok: false, message: "Estado de moderación inválido." };
  }
  const result = await updateIncidentStatus(id, status);
  if (!result.ok) return { ok: false, message: result.message };
  revalidatePath("/incidents");
  return { ok: true };
}
