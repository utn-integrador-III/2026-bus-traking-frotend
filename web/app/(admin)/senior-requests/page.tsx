import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/page-header";
import { LoadError } from "@/components/admin/load-error";
import { RefreshButton } from "@/components/admin/refresh-button";
import { SeniorRequestList } from "@/components/admin/senior-request-list";
import { getSeniorRequests } from "@/lib/api/admin";

export const metadata: Metadata = {
  title: "Verificación de adultos mayores",
};

export default async function SeniorRequestsPage() {
  const result = await getSeniorRequests("pending");

  if (!result.ok) {
    return (
      <>
        <PageHeader
          title="Adultos mayores"
          subtitle="No se pudieron cargar"
          action={<RefreshButton />}
        />
        <LoadError failure={result} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Adultos mayores"
        subtitle={
          result.data.length === 1
            ? "1 solicitud pendiente de revisión"
            : `${result.data.length} solicitudes pendientes de revisión`
        }
        action={<RefreshButton />}
      />
      <SeniorRequestList requests={result.data} />
    </>
  );
}
