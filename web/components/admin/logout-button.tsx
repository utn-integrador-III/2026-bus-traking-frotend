"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/icon";

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onLogout() {
    setPending(true);
    await fetch("/api/session", { method: "DELETE" }).catch(() => null);
    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={onLogout}
      disabled={pending}
      aria-label="Cerrar sesión"
      title="Cerrar sesión"
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-on-dark-muted transition-colors hover:bg-on-dark/10 hover:text-on-dark disabled:opacity-50"
    >
      <Icon name="logout" size={18} />
    </button>
  );
}
