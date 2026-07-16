import "server-only";
import { cookies } from "next/headers";
import type { SessionUser } from "@/lib/api/types";

export const SESSION_COOKIE = "bustrack_session";

export type SessionPayload = {
  access_token: string;
  user: SessionUser;
};

const isProd = process.env.NODE_ENV === "production";

export async function readSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as SessionPayload;
    if (!parsed?.access_token || !parsed?.user) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function requireSession(): Promise<SessionPayload> {
  const session = await readSession();
  if (!session) throw new Error("NO_SESSION");
  return session;
}

export async function writeSession(payload: SessionPayload, maxAgeSeconds: number) {
  const store = await cookies();
  store.set(SESSION_COOKIE, JSON.stringify(payload), {
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
