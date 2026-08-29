"use server";

import { revalidatePath } from "next/cache";
import { createDriver, deactivateDriver, reactivateDriver } from "@/lib/api/admin";
import type { ActionResult } from "@/app/(admin)/routes/actions";

export type DriverFormInput = {
  name: string;
  email: string;
  password: string;
  license_number: string;
};

export async function createDriverAction(input: DriverFormInput): Promise<ActionResult> {
  const name = input.name.trim();
  const email = input.email.trim();
  const licenseNumber = input.license_number.trim();

  if (!name) {
    return { ok: false, message: "El nombre es obligatorio." };
  }
  if (!email) {
    return { ok: false, message: "El correo es obligatorio." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, message: "El correo no es válido." };
  }
  if (input.password.length < 8) {
    return { ok: false, message: "La contraseña debe tener al menos 8 caracteres." };
  }
  if (!licenseNumber) {
    return { ok: false, message: "El número de licencia es obligatorio." };
  }

  const result = await createDriver({
    name,
    email,
    password: input.password,
    license_number: licenseNumber,
  });
  if (!result.ok) return { ok: false, message: result.message };
  revalidatePath("/users");
  return { ok: true };
}

export async function deactivateDriverAction(id: string): Promise<ActionResult> {
  const result = await deactivateDriver(id);
  if (!result.ok) return { ok: false, message: result.message };
  revalidatePath("/users");
  return { ok: true };
}

export async function reactivateDriverAction(id: string): Promise<ActionResult> {
  const result = await reactivateDriver(id);
  if (!result.ok) return { ok: false, message: result.message };
  revalidatePath("/users");
  return { ok: true };
}
