"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/icon";
import { LogoutButton } from "@/components/admin/logout-button";
import type { SessionUser } from "@/lib/api/types";
import type { IconName } from "@bustrack/design";

type NavItem = {
  href: string;
  label: string;
  icon: IconName;
};

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Panel", icon: "grid" },
  { href: "/routes", label: "Rutas", icon: "shareNet" },
  { href: "/users", label: "Usuarios", icon: "users" },
  { href: "/incidents", label: "Alertas", icon: "alertTriangle" },
];

export function Sidebar({
  user,
  onNavigate,
}: {
  user: SessionUser;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-64 shrink-0 flex-col bg-brand text-on-dark">
      <div className="flex items-center gap-3 px-6 py-7">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent text-brand">
          <Icon name="bus" size={24} strokeWidth={2.2} />
        </div>
        <div>
          <div className="text-3xl font-extrabold leading-none">BusTrack</div>
          <div className="mt-1 text-2xs font-bold uppercase tracking-widest text-admin">
            Consola admin
          </div>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1.5 px-4 py-4">
        {navItems.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-md font-bold transition-colors ${
                active
                  ? "bg-accent text-brand"
                  : "text-on-dark-secondary hover:bg-on-dark/10 hover:text-on-dark"
              }`}
            >
              <Icon name={item.icon} size={20} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 px-4 py-4">
        <div className="flex items-center gap-3 rounded-xl px-3 py-2.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy-600 text-on-dark-secondary">
            <Icon name="user" size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <div
              title={user.name ?? user.email}
              className="truncate text-md font-bold text-on-dark"
            >
              {user.name ?? "Administrador"}
            </div>
            <div title={user.email} className="truncate text-xs text-on-dark-muted">
              {user.email}
            </div>
          </div>
          <LogoutButton />
        </div>
      </div>
    </div>
  );
}
