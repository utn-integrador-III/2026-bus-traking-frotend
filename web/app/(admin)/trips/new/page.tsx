import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { LoadError } from "@/components/admin/load-error";
import { NewTripForm } from "@/components/admin/new-trip-form";
import { getBuses, getDrivers, getRoutes } from "@/lib/api/admin";

export const metadata: Metadata = {
  title: "Programar viaje",
};

export const dynamic = "force-dynamic";

export default async function NewTripPage() {
  const [routesResult, busesResult, driversResult] = await Promise.all([
    getRoutes(),
    getBuses(),
    getDrivers(),
  ]);

  if (!routesResult.ok || !busesResult.ok || !driversResult.ok) {
    const failure = [
      routesResult,
      busesResult,
      driversResult,
    ].find((r): r is Extract<typeof r, { ok: false }> => !r.ok);
    if (!failure) throw new Error("Unreachable");
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
        <LoadError failure={failure} />
      </div>
    );
  }

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

      <NewTripForm
        routes={routesResult.data}
        buses={busesResult.data}
        drivers={driversResult.data}
      />
    </div>
  );
}
