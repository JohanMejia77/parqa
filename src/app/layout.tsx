import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Geist, Geist_Mono } from "next/font/google";
import { Encabezado } from "@/components/encabezado";
import { obtenerUsuarioActual } from "@/servicios/autenticacion";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Tipografía condensada para las placas (inspirada en la rotulación vial).
const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  subsets: ["latin"],
  weight: ["600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "Autos Colombia",
    template: "%s · Autos Colombia",
  },
  description:
    "Gestión del parqueadero Autos Colombia: entradas y salidas de vehículos, usuarios y celdas.",
};

export const viewport: Viewport = {
  themeColor: "#1c2130",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es-CO"
      className={`${geistSans.variable} ${geistMono.variable} ${barlowCondensed.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <a
          href="#contenido"
          className="sr-only rounded-md bg-placa px-3 py-2 text-sm font-medium text-placa-foreground focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50"
        >
          Saltar al contenido
        </a>
        {/* Mientras se lee la sesión se muestra el encabezado solo con la marca. */}
        <Suspense fallback={<Encabezado />}>
          <EncabezadoConSesion />
        </Suspense>
        <main
          id="contenido"
          className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6"
        >
          {children}
        </main>
      </body>
    </html>
  );
}

async function EncabezadoConSesion() {
  const usuario = await obtenerUsuarioActual();
  // Al navegador solo viaja lo que el encabezado muestra: el nombre y el rol.
  return <Encabezado usuario={usuario && { nombre: usuario.nombre, rol: usuario.rol }} />;
}
