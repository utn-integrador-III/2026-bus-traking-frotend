import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/page-header";
import { DriverRow } from "@/components/admin/driver-row";
import { LoadError } from "@/components/admin/load-error";
import { getDrivers } from "@/lib/api/admin";

export const metadata: Metadata = {
  title: "Conductores",
};

export default async function UsersPage() {
  const result = await getDrivers();

  if (!result.ok) {
    return (
      <>
        <PageHeader title="Conductores" subtitle="No se pudieron cargar" />
        <LoadError failure={result} />
      </>
    );
  }

  const drivers = result.data;
  const active = drivers.filter((driver) => driver.is_active).length;

  return (
    <>
      <PageHeader
        title="Conductores"
        subtitle={
          drivers.length === 0
            ? "Sin conductores registrados"
            : `${drivers.length} conductores · ${active} activos`
        }
      />

      <p className="mb-5 rounded-xl border border-border-subtle bg-surface-alt px-4 py-3 text-xs text-text-secondary">
        La API solo expone conductores. No hay endpoint para listar pasajeros, así
        que esta pantalla no los incluye.
      </p>

      {drivers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
          <p className="text-md font-bold text-brand">No hay conductores</p>
          <p className="mt-1 text-sm text-text-secondary">
            La API no devolvió ningún conductor.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {drivers.map((driver) => (
            <DriverRow key={driver.user_id} driver={driver} />
          ))}
        </div>
      )}
    </>
  );
}
