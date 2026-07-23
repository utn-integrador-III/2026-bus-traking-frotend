"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Icon } from "@/components/icon";

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const body = (await res.json().catch(() => null)) as { message?: string } | null;

      if (!res.ok) {
        setError(body?.message ?? "No se pudo iniciar sesión.");
        setPending(false);
        return;
      }

      router.replace(next);
      router.refresh();
    } catch {
      setError("No se pudo conectar. Revisá tu conexión.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      {error ? (
        <div
          role="alert"
          className="mb-5 flex items-start gap-2.5 rounded-xl border border-danger/30 bg-danger-bg p-3.5 text-danger"
        >
          <Icon name="alertTriangle" size={18} className="mt-0.5 shrink-0" />
          <span className="text-sm font-bold">{error}</span>
        </div>
      ) : null}

      <label htmlFor="email" className="mb-2 block text-sm font-bold text-brand">
        Correo electrónico
      </label>
      <div className="mb-4 flex h-[50px] items-center gap-2.5 rounded-lg border-[1.5px] border-input-border bg-input-bg px-3.5 focus-within:border-accent">
        <Icon name="mail" size={18} className="shrink-0 text-text-secondary" />
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="admin@bustrack.cr"
          className="w-full bg-transparent text-md text-brand outline-none placeholder:text-input-placeholder"
        />
      </div>

      <label htmlFor="password" className="mb-2 block text-sm font-bold text-brand">
        Contraseña
      </label>
      <div className="mb-6 flex h-[50px] items-center gap-2.5 rounded-lg border-[1.5px] border-input-border bg-input-bg px-3.5 focus-within:border-accent">
        <Icon name="lock" size={18} className="shrink-0 text-text-secondary" />
        <input
          id="password"
          name="password"
          type={showPassword ? "text" : "password"}
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          className="w-full bg-transparent text-md text-brand outline-none placeholder:text-input-placeholder"
        />
        <button
          type="button"
          onClick={() => setShowPassword((v) => !v)}
          aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
          className="shrink-0 text-text-secondary hover:text-brand"
        >
          <Icon name="eye" size={18} />
        </button>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="flex h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-accent text-lg font-extrabold text-brand shadow-button transition hover:brightness-[0.97] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Verificando…" : "Iniciar sesión"}
      </button>
    </form>
  );
}
