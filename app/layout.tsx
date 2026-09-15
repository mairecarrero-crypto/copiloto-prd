import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Copiloto PRD — de una idea a un documento para construir",
  description:
    "Asistente que entrevista a personas sin formación técnica y convierte su idea en un PRD listo para construir.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
