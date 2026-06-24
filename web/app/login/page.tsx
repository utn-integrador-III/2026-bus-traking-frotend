"use client";

import Link from "next/link";
import { Icon } from "@/components/icon";
import { getSupabaseClient } from "@/lib/supabase";


const features = [
  {
    icon: "locate" as const,
    title: "Seguimiento en vivo",
    text: "Mirá dónde está tu bus en tiempo real en el mapa.",
  },
  {
    icon: "bell" as const,
    title: "Alertas de llegada",
    text: "Recibí un aviso cuando tu bus se acerca a tu parada.",
  },
  {
    icon: "ticket" as const,
    title: "Tickets con QR",
    text: "Comprá y abordá mostrando tu código desde el teléfono.",
  },
];

export default function LoginPage() {
  const handleGoogleLogin = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      console.error(error.message);
    }
  };

  return (
    <main className="flex min-h-screen flex-1">
      <section className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-brand p-12 text-on-dark lg:flex xl:p-16">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-accent/15 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-28 -left-16 h-96 w-96 rounded-full bg-driver/20 blur-3xl"
        />

        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent text-brand">
            <Icon name="bus" size={24} strokeWidth={2.2} />
          </div>
          <span className="text-3xl font-extrabold text-on-dark">BusTrack</span>
        </div>

        <div className="relative max-w-md">
          <h2 className="text-hero font-extrabold leading-[1.05] tracking-tight text-on-dark">
            Tu transporte público, en tiempo real.
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-on-dark-secondary">
            Un “Waze” para el bus: planificá tu viaje, seguí la ruta y nunca más
            te quedes esperando sin saber.
          </p>

          <ul className="mt-10 flex flex-col gap-5">
            {features.map((f) => (
              <li key={f.title} className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-on-dark/10 text-accent">
                  <Icon name={f.icon} size={20} />
                </div>
                <div>
                  <p className="text-md font-bold text-on-dark">{f.title}</p>
                  <p className="text-base leading-relaxed text-on-dark-secondary">
                    {f.text}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-sm text-on-dark-muted">
          © 2026 BusTrack · Seguimiento de buses en tiempo real
        </p>
      </section>

      <section className="flex w-full items-center justify-center bg-bg px-5 py-12 lg:w-1/2">
        <div className="w-full max-w-[420px] rounded-3xl border border-border bg-surface p-8 shadow-card sm:p-10">
          <div className="flex items-center gap-3 lg:hidden">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand text-accent">
              <Icon name="bus" size={24} strokeWidth={2.2} />
            </div>
            <span className="text-3xl font-extrabold text-brand">BusTrack</span>
          </div>

          <h1 className="mt-8 text-5xl font-extrabold leading-tight tracking-tight text-brand lg:mt-0">
          Bienvenido de vuelta
        </h1>
        <p className="mt-2 text-md leading-relaxed text-text-secondary">
          Inicia sesión para rastrear tu bus en tiempo real.
        </p>

        <div className="mt-7">
          <label
            htmlFor="email"
            className="mb-2 block text-sm font-bold text-brand"
          >
            Correo electrónico
          </label>
          <div className="mb-4 flex h-[50px] items-center gap-2.5 rounded-lg border-[1.5px] border-input-border bg-input-bg px-3.5">
            <Icon name="mail" size={18} className="text-text-secondary" />
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="andrea@correo.com"
              className="w-full bg-transparent text-md text-brand outline-none placeholder:text-input-placeholder"
            />
          </div>

          <label
            htmlFor="password"
            className="mb-2 block text-sm font-bold text-brand"
          >
            Contraseña
          </label>
          <div className="mb-2.5 flex h-[50px] items-center gap-2.5 rounded-lg border-[1.5px] border-input-border bg-input-bg px-3.5">
            <Icon name="lock" size={18} className="text-text-secondary" />
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full bg-transparent text-md text-brand outline-none placeholder:text-input-placeholder"
            />
            <Icon name="eye" size={18} className="text-text-secondary" />
          </div>

          <div className="mb-5 text-right">
            <Link
              href="/forgot-password"
              className="text-sm font-bold text-accent"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          <Link
            href="/dashboard"
            className="flex h-[52px] w-full items-center justify-center rounded-xl bg-accent text-lg font-extrabold text-brand shadow-button"
          >
            Iniciar sesión
          </Link>
        </div>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-divider" />
          <span className="text-sm text-text-secondary">o continúa con</span>
          <div className="h-px flex-1 bg-divider" />
        </div>

        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-lg border-[1.5px] border-input-border text-base font-bold text-brand"
          >
            <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[#e5e5e5] text-xs font-extrabold text-text-secondary">
              G
            </span>
            Google
          </button>
          <button
            type="button"
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-lg border-[1.5px] border-input-border text-base font-bold text-brand"
          >
            <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-brand text-on-dark">
              <svg
                viewBox="0 0 24 24"
                width={11}
                height={11}
                fill="none"
                stroke="currentColor"
                strokeWidth={2.4}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                focusable="false"
              >
                <path d="M12 20a8 8 0 0 0 8-8 8 8 0 0 1-8 8z" />
              </svg>
            </span>
            Apple
          </button>
        </div>

        <p className="mt-7 text-center text-base text-text-secondary">
          ¿No tienes cuenta?{" "}
          <Link href="/register" className="font-extrabold text-accent">
            Regístrate
          </Link>
        </p>
        </div>
      </section>
    </main>
  );
}
