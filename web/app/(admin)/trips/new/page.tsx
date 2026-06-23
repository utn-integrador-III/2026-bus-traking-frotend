"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { Button } from "@/components/admin/button";
import { routes, buses, drivers } from "@/lib/admin-data";

const fieldBox =
  "flex h-12 items-center gap-2.5 rounded-xl border-[1.5px] border-border-subtle bg-surface px-3.5";
const labelClass = "mb-2 block text-sm font-bold text-brand";
const controlClass =
  "w-full appearance-none bg-transparent text-md font-semibold text-brand outline-none";

export default function NewTripPage() {
  const [submitted, setSubmitted] = useState(false);
  const activeDrivers = drivers.filter((driver) => driver.active);

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

      {submitted ? (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-success/30 bg-success-bg p-4 text-success">
          <Icon name="check" size={20} strokeWidth={2.6} />
          <span className="text-md font-bold">
            Despacho programado correctamente.
          </span>
        </div>
      ) : null}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(true);
        }}
        className="rounded-3xl border border-border bg-surface p-6 shadow-card-soft sm:p-8"
      >
        <div className="flex flex-col gap-5">
          <div>
            <label htmlFor="route" className={labelClass}>
              Ruta
            </label>
            <div className={fieldBox}>
              <Icon name="shareNet" size={18} className="text-accent" />
              <select id="route" defaultValue={routes[0].id} className={controlClass}>
                {routes.map((route) => (
                  <option key={route.id} value={route.id}>
                    {route.code} · {route.name}
                  </option>
                ))}
              </select>
              <Icon name="chevronDown" size={18} className="text-text-muted" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="date" className={labelClass}>
                Fecha
              </label>
              <div className={fieldBox}>
                <Icon name="calendar" size={17} className="text-accent" />
                <input
                  id="date"
                  type="date"
                  defaultValue="2026-06-11"
                  className={controlClass}
                />
              </div>
            </div>
            <div>
              <label htmlFor="time" className={labelClass}>
                Hora de salida
              </label>
              <div className={fieldBox}>
                <Icon name="clock" size={17} className="text-accent" />
                <input
                  id="time"
                  type="time"
                  defaultValue="07:00"
                  className={controlClass}
                />
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="bus" className={labelClass}>
              Bus asignado
            </label>
            <div className={fieldBox}>
              <Icon name="bus" size={19} className="text-brand" />
              <select id="bus" defaultValue={buses[0].id} className={controlClass}>
                {buses.map((bus) => (
                  <option key={bus.id} value={bus.id}>
                    {bus.plate} · {bus.seats} asientos
                  </option>
                ))}
              </select>
              <Icon name="chevronDown" size={18} className="text-text-muted" />
            </div>
          </div>

          <div>
            <label htmlFor="driver" className={labelClass}>
              Conductor
            </label>
            <div className={fieldBox}>
              <Icon name="user" size={18} className="text-brand" />
              <select
                id="driver"
                defaultValue={activeDrivers[0].id}
                className={controlClass}
              >
                {activeDrivers.map((driver) => (
                  <option key={driver.id} value={driver.id}>
                    {driver.name} · {driver.code}
                  </option>
                ))}
              </select>
              <Icon name="chevronDown" size={18} className="text-text-muted" />
            </div>
          </div>
        </div>

        <div className="mt-7">
          <Button type="submit" variant="primary" icon="plus" full>
            Programar despacho
          </Button>
        </div>
      </form>
    </div>
  );
}
