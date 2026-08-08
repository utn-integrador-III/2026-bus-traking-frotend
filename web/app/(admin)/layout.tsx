import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { readSession } from "@/lib/auth/session";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await readSession();

  if (!session || session.user.role !== "Admin") {
    redirect("/login");
  }

  return <AdminShell user={session.user}>{children}</AdminShell>;
}
