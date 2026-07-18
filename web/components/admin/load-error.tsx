import Link from "next/link";
import { Icon } from "@/components/icon";
import type { LoadResult } from "@/lib/api/admin";

type Failure = Extract<LoadResult<unknown>, { ok: false }>;

const titleByKind: Record<Failure["kind"], string> = {
  auth: "Tu sesión ya no es válida",
  unreachable: "No hay conexión con la API",
  error: "La API devolvió un error",
};

export function LoadError({ failure }: { failure: Failure }) {
  return (
    <div className="rounded-2xl border border-dashed border-danger/40 bg-danger-bg/40 p-10 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-danger-bg text-danger">
        <Icon name="alertTriangle" size={24} />
      </div>
      <p className="mt-4 text-lg font-bold text-brand">
        {titleByKind[failure.kind]}
      </p>
      <p className="mx-auto mt-1 max-w-md text-sm text-text-secondary">
        {failure.message}
      </p>
      {failure.kind === "auth" ? (
        <Link
          href="/login"
          className="mt-5 inline-flex h-11 items-center rounded-xl bg-accent px-4 text-md font-extrabold text-brand"
        >
          Iniciar sesión
        </Link>
      ) : null}
    </div>
  );
}

export function NoBackend({ what }: { what: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-surface-alt text-text-secondary">
        <Icon name="alertTriangle" size={24} />
      </div>
      <p className="mt-4 text-lg font-bold text-brand">Sin backend todavía</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-text-secondary">
        {what} No hay endpoint en la API, así que esta pantalla no puede mostrar
        datos reales.
      </p>
    </div>
  );
}
