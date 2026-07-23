import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/page-header";
import { NoBackend } from "@/components/admin/load-error";

export const metadata: Metadata = {
  title: "Alertas",
};

export default function IncidentsPage() {
  return (
    <>
      <PageHeader
        title="Alertas"
        subtitle="Moderación de reportes de la comunidad"
      />
      <NoBackend what="La moderación de incidentes (FR-08) necesita GET y PUT /api/admin/incidents, que todavía devuelven 404." />
    </>
  );
}
