import { NextResponse } from "next/server";
import { z } from "zod";
import { apiFetch, ApiError, ApiUnreachableError } from "@/lib/api/client";
import type { LoginResponse } from "@/lib/api/types";
import { writeSession, clearSession } from "@/lib/auth/session";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = credentialsSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Ingresá un correo válido y tu contraseña." },
      { status: 400 },
    );
  }

  try {
    const login = await apiFetch<LoginResponse>("/auth/admin/login", {
      method: "POST",
      body: parsed.data,
    });

    if (login.user.role !== "Admin") {
      return NextResponse.json(
        { message: "Esta consola es solo para cuentas de administrador." },
        { status: 403 },
      );
    }

    await writeSession(login.access_token, login.expires_in);

    return NextResponse.json({ user: login.user });
  } catch (error) {
    if (error instanceof ApiUnreachableError) {
      return NextResponse.json(
        { message: "No se pudo conectar con la API. ¿Está corriendo en el puerto 8000?" },
        { status: 503 },
      );
    }
    if (error instanceof ApiError) {
      const message =
        error.status === 401
          ? "Correo o contraseña incorrectos."
          : error.message;
      return NextResponse.json({ message }, { status: error.status });
    }
    throw error;
  }
}

export async function DELETE() {
  await clearSession();
  return NextResponse.json({ ok: true });
}
