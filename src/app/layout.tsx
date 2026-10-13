import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CoffeeTrack IoT - Plataforma de Telemetría",
  description: "Monitoreo y dosificación inteligente de máquinas de café automáticas 4G LTE",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}
