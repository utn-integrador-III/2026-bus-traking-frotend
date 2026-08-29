"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { createDriverAction } from "@/app/(admin)/users/actions";

const inputClass =
  "h-11 w-full rounded-xl border border-border-subtle bg-surface px-4 text-md text-brand outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30";

export function DriverForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!name.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }
    if (!email.trim()) {
      setError("El correo es obligatorio.");
      return;
    }
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (!licenseNumber.trim()) {
      setError("El número de licencia es obligatorio.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await createDriverAction({
        name,
        email,
        password,
        license_number: licenseNumber,
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      router.push("/users");
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      className="mx-auto flex max-w-2xl flex-col gap-6"
    >
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-card-soft">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="text-sm font-bold text-brand">Nombre completo</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ej. María González"
              autoComplete="name"
              className={inputClass}
              required
            />
          </label>
          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="text-sm font-bold text-brand">Correo electrónico</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Ej. conductora@bustrack.com"
              autoComplete="email"
              className={inputClass}
              required
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-bold text-brand">Número de licencia</span>
            <input
              value={licenseNumber}
              onChange={(event) => setLicenseNumber(event.target.value)}
              placeholder="Ej. 123456789"
              className={inputClass}
              required
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-bold text-brand">Contraseña</span>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Mínimo 8 caracteres"
                autoComplete="new-password"
                className={`${inputClass} pr-12`}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-text-secondary hover:bg-surface-alt hover:text-brand"
              >
                <Icon name={showPassword ? "eyeOff" : "eye"} size={18} />
              </button>
            </div>
          </label>
        </div>
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-xl bg-danger-bg px-4 py-3 text-sm font-bold text-danger"
        >
          {error}
        </p>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <Link
          href="/users"
          className="flex h-11 items-center gap-2 rounded-xl border-[1.5px] border-border-subtle px-5 text-md font-bold text-brand hover:bg-surface-alt"
        >
          <Icon name="arrowLeft" size={16} />
          Cancelar
        </Link>
        <button
          type="submit"
          disabled={pending}
          aria-label="Agregar conductor"
          className="flex h-11 items-center gap-2 rounded-xl bg-accent px-6 text-md font-extrabold text-brand transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Icon name="plus" size={18} />
          {pending ? "Agregando…" : "Agregar conductor"}
        </button>
      </div>
    </form>
  );
}
