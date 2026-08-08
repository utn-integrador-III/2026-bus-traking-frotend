import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { NoBackend } from "@/components/admin/load-error";

export const metadata: Metadata = {
  title: "Programar viaje",
};

export default function NewTripPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/routes"
          aria-label="Volver a rutas"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface text-brand hover:bg-surface-alt"
        >
          <Icon name="arrowLeft" size={20} />
        </Link>
        <h1 className="text-5xl font-extrabold tracking-tight text-brand">
          Programar viaje
        </h1>
      </div>

      <NoBackend what="POST /api/admin/trips exige un bus_id, pero la API no expone ningún endpoint que liste los buses (GET /api/admin/buses devuelve 404)." />
    </div>
  );
}
