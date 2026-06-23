"use client";

import { useState } from "react";
import { Icon } from "@/components/icon";
import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/admin/badge";
import { Button } from "@/components/admin/button";
import { Tabs } from "@/components/admin/tabs";
import { Toggle } from "@/components/admin/toggle";
import {
  drivers as initialDrivers,
  passengers as initialPassengers,
} from "@/lib/admin-data";

const tabs = [
  { value: "drivers", label: "Conductores" },
  { value: "passengers", label: "Pasajeros" },
];

function Avatar({ active }: { active: boolean }) {
  return (
    <div
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
        active ? "bg-surface-alt text-text-secondary" : "bg-divider text-text-muted"
      }`}
    >
      <Icon name="user" size={22} />
    </div>
  );
}

export default function UsersPage() {
  const [tab, setTab] = useState("drivers");
  const [drivers, setDrivers] = useState(initialDrivers);
  const [passengers, setPassengers] = useState(initialPassengers);

  const toggleDriver = (id: string) =>
    setDrivers((prev) =>
      prev.map((d) => (d.id === id ? { ...d, active: !d.active } : d)),
    );
  const togglePassenger = (id: string) =>
    setPassengers((prev) =>
      prev.map((p) => (p.id === id ? { ...p, active: !p.active } : p)),
    );

  return (
    <>
      <PageHeader
        title="Usuarios"
        subtitle="Gestión de conductores y pasajeros"
        action={
          <Button variant="primary" icon="plus">
            {tab === "drivers" ? "Nuevo conductor" : "Nuevo pasajero"}
          </Button>
        }
      />

      <Tabs options={tabs} value={tab} onChange={setTab} />

      <div className="mt-5 flex flex-col gap-3">
        {tab === "drivers"
          ? drivers.map((driver) => (
              <div
                key={driver.id}
                className={`flex items-center gap-4 rounded-2xl border border-border bg-surface p-4 shadow-card-soft ${
                  driver.active ? "" : "opacity-70"
                }`}
              >
                <Avatar active={driver.active} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-md font-bold text-brand">
                    {driver.name}
                  </div>
                  <div className="truncate text-xs text-text-secondary">
                    Lic. {driver.license} · {driver.code}
                  </div>
                </div>
                {driver.active ? null : <Badge tone="neutral">Inactivo</Badge>}
                <Toggle
                  checked={driver.active}
                  onChange={() => toggleDriver(driver.id)}
                  label={`Activar ${driver.name}`}
                />
              </div>
            ))
          : passengers.map((passenger) => (
              <div
                key={passenger.id}
                className={`flex items-center gap-4 rounded-2xl border border-border bg-surface p-4 shadow-card-soft ${
                  passenger.active ? "" : "opacity-70"
                }`}
              >
                <Avatar active={passenger.active} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-md font-bold text-brand">
                      {passenger.name}
                    </span>
                    {passenger.senior ? (
                      <Badge tone="info">Adulto mayor</Badge>
                    ) : null}
                  </div>
                  <div className="truncate text-xs text-text-secondary">
                    {passenger.email}
                  </div>
                </div>
                <Toggle
                  checked={passenger.active}
                  onChange={() => togglePassenger(passenger.id)}
                  label={`Activar ${passenger.name}`}
                />
              </div>
            ))}
      </div>
    </>
  );
}
