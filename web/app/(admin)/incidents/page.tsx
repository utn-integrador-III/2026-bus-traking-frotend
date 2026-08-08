import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/page-header";
import { LoadError } from "@/components/admin/load-error";
import { IncidentCard } from "@/components/admin/incident-card";
import { IncidentTabs } from "@/components/admin/incident-tabs";
import { getIncidents } from "@/lib/api/admin";
import type { IncidentModerationStatus } from "@/lib/api/types";

export const metadata: Metadata = {
  title: "Alertas",
};

export const dynamic = "force-dynamic";

const TABS: { value: "all" | IncidentModerationStatus; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "pending", label: "Pendientes" },
  { value: "validated", label: "Validadas" },
  { value: "dismissed", label: "Descartadas" },
];

export default async function IncidentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const active =
    status === "pending" || status === "validated" || status === "dismissed"
      ? status
      : "all";

  const result = await getIncidents(active === "all" ? undefined : active);

  if (!result.ok) {
    return (
      <>
        <PageHeader title="Alertas" subtitle="Moderación de reportes de la comunidad" />
        <LoadError failure={result} />
      </>
    );
  }

  const incidents = result.data;

  return (
    <>
      <PageHeader
        title="Alertas"
        subtitle={
          incidents.length === 0
            ? "Sin reportes"
            : `${incidents.length} reporte${incidents.length === 1 ? "" : "s"}`
        }
      />

      <IncidentTabs tabs={TABS} active={active} />

      {incidents.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
          <p className="text-md font-bold text-brand">No hay reportes</p>
          <p className="mt-1 text-sm text-text-secondary">
            La API no devolvió ningún reporte para este filtro.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {incidents.map((incident) => (
            <IncidentCard key={incident.id} incident={incident} />
          ))}
        </div>
      )}
    </>
  );
}
