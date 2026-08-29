"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Icon } from "@/components/icon";
import { Badge } from "@/components/admin/badge";
import {
  approveSeniorRequestAction,
  rejectSeniorRequestAction,
} from "@/app/(admin)/senior-requests/actions";
import type { AdminSeniorRequest } from "@/lib/api/types";

const dateFormatter = new Intl.DateTimeFormat("es-CR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

function formatDate(value: string | null) {
  if (!value) return "No indicado";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date);
}

function passthroughImageLoader({ src }: { src: string }) {
  return src;
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface-alt px-4 py-3">
      <dt className="text-2xs font-bold uppercase tracking-wider text-text-muted">
        {label}
      </dt>
      <dd className="mt-1 break-words text-sm font-bold text-brand">{value}</dd>
    </div>
  );
}

function SeniorRequestCard({ request }: { request: AdminSeniorRequest }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const name = request.user?.name ?? "Usuario sin nombre";
  const email = request.user?.email ?? "Correo no disponible";

  function review(action: "approve" | "reject") {
    setError(null);
    startTransition(async () => {
      const result =
        action === "approve"
          ? await approveSeniorRequestAction(request.id)
          : await rejectSeniorRequestAction(request.id, reason);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-surface shadow-card-soft">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-surface-alt"
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-warning-bg text-warning">
          <Icon name="user" size={22} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-md font-bold text-brand">{name}</p>
          <p className="truncate text-xs text-text-secondary">{email}</p>
        </div>
        <Badge tone="warning">Pendiente</Badge>
        <Icon
          name="chevronDown"
          size={18}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div className="border-t border-divider p-5">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.75fr)]">
            <div>
              <h3 className="text-lg font-extrabold text-brand">Datos del solicitante</h3>
              <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                <Detail label="Nombre completo" value={name} />
                <Detail label="Correo electrónico" value={email} />
                <Detail label="Teléfono" value={request.passenger?.phone ?? "No indicado"} />
                <Detail label="Fecha de nacimiento" value={formatDate(request.passenger?.birth_date ?? null)} />
                <Detail label="Cuenta creada" value={formatDate(request.user?.created_at ?? request.created_at)} />
                <Detail label="Solicitud recibida" value={formatDate(request.created_at)} />
                <Detail label="Estado de la cuenta" value={request.user?.is_active ? "Activa" : "Pendiente de activación"} />
                <Detail label="Estado de verificación" value={request.status} />
                <Detail label="ID del usuario" value={request.passenger_id} />
                <Detail label="ID de la solicitud" value={request.id} />
                <Detail label="Preferencias de notificación" value={request.passenger?.notification_preferences ? JSON.stringify(request.passenger.notification_preferences) : "No indicadas"} />
                <Detail label="Token de notificaciones" value={request.passenger?.expo_push_token ?? "No registrado"} />
                <Detail label="Documento almacenado" value={`${request.document_image_bucket}/${request.document_image_path}`} />
                <Detail label="Última actualización" value={formatDate(request.updated_at)} />
              </dl>
            </div>

            <div>
              <h3 className="text-lg font-extrabold text-brand">Documento de verificación</h3>
              {request.document_image_url ? (
                <>
                  <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-surface-alt">
                    <Image
                      src={request.document_image_url}
                      alt={`Documento de verificación de ${name}`}
                      loader={passthroughImageLoader}
                      unoptimized
                      width={900}
                      height={600}
                      className="max-h-[460px] w-full object-contain"
                    />
                  </div>
                  <a
                    href={request.document_image_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex text-sm font-bold text-brand underline decoration-accent decoration-2 underline-offset-4"
                  >
                    Abrir imagen en tamaño completo
                  </a>
                </>
              ) : (
                <div className="mt-3 rounded-2xl border border-dashed border-danger/40 bg-danger-bg/40 p-8 text-center">
                  <Icon name="alertTriangle" size={30} className="mx-auto text-danger" />
                  <p className="mt-2 text-sm font-bold text-danger">Documento no disponible</p>
                  <p className="mt-1 text-xs text-text-secondary">El archivo registrado no existe en el almacenamiento.</p>
                </div>
              )}
            </div>
          </div>

          {rejecting ? (
            <div className="mt-5 rounded-xl border border-danger/30 bg-danger-bg/40 p-4">
              <label htmlFor={`reason-${request.id}`} className="text-sm font-bold text-brand">
                Motivo de la denegación
              </label>
              <textarea
                id={`reason-${request.id}`}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                maxLength={500}
                rows={3}
                className="mt-2 w-full resize-y rounded-xl border border-border bg-surface px-3 py-2 text-sm text-brand outline-none focus:border-danger"
                placeholder="Explicá por qué el documento o los datos no son válidos"
              />
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-3 border-t border-divider pt-4">
            <button
              type="button"
              onClick={() => review("approve")}
              disabled={pending}
              className="flex h-11 items-center gap-2 rounded-xl bg-success px-5 text-sm font-extrabold text-on-dark hover:brightness-110 disabled:opacity-60"
            >
              <Icon name="check" size={17} />
              {pending ? "Procesando…" : "Aprobar y activar cuenta"}
            </button>
            {rejecting ? (
              <>
                <button
                  type="button"
                  onClick={() => review("reject")}
                  disabled={pending || !reason.trim()}
                  className="h-11 rounded-xl bg-danger px-5 text-sm font-extrabold text-on-dark hover:brightness-110 disabled:opacity-60"
                >
                  Confirmar denegación
                </button>
                <button
                  type="button"
                  onClick={() => setRejecting(false)}
                  disabled={pending}
                  className="h-11 rounded-xl border border-border px-5 text-sm font-bold text-brand hover:bg-surface-alt disabled:opacity-60"
                >
                  Cancelar
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setRejecting(true)}
                disabled={pending}
                className="flex h-11 items-center gap-2 rounded-xl bg-danger-bg px-5 text-sm font-extrabold text-danger hover:brightness-95 disabled:opacity-60"
              >
                <Icon name="x" size={17} />
                Denegar cuenta
              </button>
            )}
          </div>

          {error ? <p role="alert" className="mt-3 text-sm font-bold text-danger">{error}</p> : null}
        </div>
      ) : null}
    </article>
  );
}

export function SeniorRequestList({ requests }: { requests: AdminSeniorRequest[] }) {
  if (requests.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
        <Icon name="check" size={34} className="mx-auto text-success" />
        <p className="mt-3 text-md font-bold text-brand">No hay solicitudes pendientes</p>
        <p className="mt-1 text-sm text-text-secondary">Todas las cuentas de adultos mayores han sido revisadas.</p>
      </div>
    );
  }

  return <div className="flex flex-col gap-3">{requests.map((request) => <SeniorRequestCard key={request.id} request={request} />)}</div>;
}
