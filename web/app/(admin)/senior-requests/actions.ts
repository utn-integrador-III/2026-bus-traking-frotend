"use server";

import { revalidatePath } from "next/cache";
import { approveSeniorRequest, rejectSeniorRequest } from "@/lib/api/admin";

export type SeniorReviewActionResult =
  | { ok: true }
  | { ok: false; message: string };

export async function approveSeniorRequestAction(
  id: string,
): Promise<SeniorReviewActionResult> {
  const result = await approveSeniorRequest(id);
  if (!result.ok) return { ok: false, message: result.message };
  revalidatePath("/senior-requests");
  return { ok: true };
}

export async function rejectSeniorRequestAction(
  id: string,
  rejectionReason: string,
): Promise<SeniorReviewActionResult> {
  const reason = rejectionReason.trim();
  if (!reason) {
    return { ok: false, message: "Indicá el motivo de la denegación." };
  }
  if (reason.length > 500) {
    return { ok: false, message: "El motivo no puede superar 500 caracteres." };
  }
  const result = await rejectSeniorRequest(id, reason);
  if (!result.ok) return { ok: false, message: result.message };
  revalidatePath("/senior-requests");
  return { ok: true };
}
