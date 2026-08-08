"use server";

import { revalidatePath } from "next/cache";
import { moderateIncident } from "@/lib/api/admin";
import type { IncidentModerationStatus } from "@/lib/api/types";

export type ActionResult = { ok: true } | { ok: false; message: string };

export async function moderateIncidentAction(
  id: string,
  moderationStatus: IncidentModerationStatus,
): Promise<ActionResult> {
  const result = await moderateIncident(id, moderationStatus);
  if (!result.ok) return { ok: false, message: result.message };
  revalidatePath("/incidents");
  return { ok: true };
}
