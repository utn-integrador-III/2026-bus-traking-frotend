import { redirect } from "next/navigation";
import { Icon } from "@/components/icon";
import { LoginForm } from "./login-form";
import { readSession } from "@/lib/auth/session";
import type { IconName } from "@bustrack/design";

const features: { icon: IconName; title: string; text: string }[] = [
  {
    icon: "shareNet",
    title: "Rutas y despachos",
    text: "Administrá las rutas base y programá los viajes del día.",
  },
  {
    icon: "locate",
    title: "Telemetría en vivo",
    text: "Monitoreá los viajes activos sobre el mapa en tiempo real.",
  },
  {
    icon: "users",
    title: "Conductores",
    text: "Gestioná las cuentas operativas de los conductores.",
  },
];

const ALLOWED_NEXT = ["/dashboard", "/routes", "/users", "/incidents", "/trips/new"];

function safeNext(value: string | string[] | undefined) {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!candidate) return "/dashboard";
  return ALLOWED_NEXT.includes(candidate) ? candidate : "/dashboard";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const session = await readSession();
  if (session?.user.role === "Admin") {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const next = safeNext(params.next);

  return (
    <main className="flex min-h-screen flex-1">
      <section className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-brand p-12 text-on-dark lg:flex xl:p-16">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-accent/15 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-28 -left-16 h-96 w-96 rounded-full bg-driver/20 blur-3xl"
        />

        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent text-brand">
            <Icon name="bus" size={24} strokeWidth={2.2} />
          </div>
          <div>
            <span className="text-3xl font-extrabold text-on-dark">BusTrack</span>
            <span className="mt-0.5 block text-2xs font-bold uppercase tracking-widest text-admin">
              Consola admin
            </span>
          </div>
        </div>

        <div className="relative max-w-md">
          <h2 className="text-hero font-extrabold leading-[1.05] tracking-tight text-on-dark">
            Operá tu flota en tiempo real.
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-on-dark-secondary">
            Panel de administración de BusTrack: rutas, despachos y monitoreo de
            los buses en servicio.
          </p>

          <ul className="mt-10 flex flex-col gap-5">
            {features.map((f) => (
              <li key={f.title} className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-on-dark/10 text-accent">
                  <Icon name={f.icon} size={20} />
                </div>
                <div>
                  <p className="text-md font-bold text-on-dark">{f.title}</p>
                  <p className="text-base leading-relaxed text-on-dark-secondary">
                    {f.text}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-sm text-on-dark-muted">
          © 2026 BusTrack · Seguimiento de buses en tiempo real
        </p>
      </section>

      <section className="flex w-full items-center justify-center bg-bg px-5 py-12 lg:w-1/2">
        <div className="w-full max-w-[420px] rounded-3xl border border-border bg-surface p-8 shadow-card sm:p-10">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand text-accent">
              <Icon name="bus" size={24} strokeWidth={2.2} />
            </div>
            <span className="text-3xl font-extrabold text-brand">BusTrack</span>
          </div>

          <h1 className="text-5xl font-extrabold leading-tight tracking-tight text-brand">
            Bienvenido de vuelta
          </h1>
          <p className="mb-7 mt-2 text-md leading-relaxed text-text-secondary">
            Acceso restringido a cuentas de administrador.
          </p>

          <LoginForm next={next} />
        </div>
      </section>
    </main>
  );
}
