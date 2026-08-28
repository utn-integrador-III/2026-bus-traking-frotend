import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { RouteForm } from "@/components/admin/route-form";

export const metadata: Metadata = {
  title: "Nueva ruta",
};

export default function NewRoutePage() {
  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/routes"
          aria-label="Volver a rutas"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface text-brand hover:bg-surface-alt"
        >
          <Icon name="arrowLeft" size={20} />
        </Link>
        <h1 className="text-5xl font-extrabold tracking-tight text-brand">
          Nueva ruta
        </h1>
      </div>
      <RouteForm />
    </div>
  );
}
