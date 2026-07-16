import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { apiFetch } from "@/lib/api/client";
import { SESSION_COOKIE } from "./cookie";
import type { SessionResponse, SessionPayload } from "@/lib/api/types";

export { SESSION_COOKIE };
export type { SessionPayload };

const isProd = process.env.NODE_ENV === "production";

export const readSession = cache(async (): Promise<SessionPayload | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const me = await apiFetch<SessionResponse>("/auth/session", { token });
    return {
      access_token: token,
      user: { id: me.user_id, email: me.email, role: me.role, name: null },
    };
  } catch {
    return null;
  }
});

export async function writeSession(accessToken: string, maxAgeSeconds: number) {
  const store = await cookies();
  store.set(SESSION_COOKIE, accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeSeconds,
  });
}

export async function clearSession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
