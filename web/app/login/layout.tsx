import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Iniciar sesión · BusTrack",
  description: "Inicia sesión para rastrear tu bus en tiempo real.",
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
