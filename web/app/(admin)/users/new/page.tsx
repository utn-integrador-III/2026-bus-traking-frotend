import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { DriverForm } from "@/components/admin/driver-form";

export const metadata: Metadata = {
  title: "Agregar conductor",
};

export default function NewDriverPage() {
  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/users"
          aria-label="Volver a conductores"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface text-brand hover:bg-surface-alt"
        >
          <Icon name="arrowLeft" size={20} />
        </Link>
        <h1 className="text-5xl font-extrabold tracking-tight text-brand">
          Agregar conductor
        </h1>
      </div>
      <DriverForm />
    </div>
  );
}
