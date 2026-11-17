"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useFormStatus } from "react-dom";
import {
  ArrowLeftFromLineIcon,
  ArrowRightToLineIcon,
  HistoryIcon,
  LayoutGridIcon,
  LogOutIcon,
  SquareParkingIcon,
  UsersIcon,
} from "lucide-react";
import { cerrarSesionAccion } from "@/acciones/sesion";
import { NOMBRE_ROL, RUTA_INICIO, type Rol } from "@/modelos";
import { cn } from "@/lib/utils";

// Cada rol ve solo las páginas que puede usar.
const ENLACES: Record<Rol, { href: string; texto: string; icono: typeof LayoutGridIcon }[]> = {
  OPERADOR: [
    { href: "/", texto: "Panel", icono: LayoutGridIcon },
    { href: "/entrada", texto: "Entrada", icono: ArrowRightToLineIcon },
    { href: "/salida", texto: "Salida", icono: ArrowLeftFromLineIcon },
    { href: "/historial", texto: "Historial", icono: HistoryIcon },
  ],
  ADMINISTRADOR: [
    { href: "/celdas", texto: "Celdas", icono: SquareParkingIcon },
    { href: "/usuarios", texto: "Usuarios", icono: UsersIcon },
  ],
};

/** `usuario` es la cuenta con sesión abierta; sin él solo se muestra la marca. */
export function Encabezado({ usuario }: { usuario?: { nombre: string; rol: Rol } | null }) {
  const ruta = usePathname();
  const enlaces = usuario ? ENLACES[usuario.rol] : [];

  return (
    <header className="bg-primary text-primary-foreground">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-1 px-4 sm:px-6">
        <Link
          href={usuario ? RUTA_INICIO[usuario.rol] : "/login"}
          className="flex items-center gap-2.5 py-3 outline-none focus-visible:ring-3 focus-visible:ring-placa/60"
        >
          <span
            aria-hidden
            className="grid h-7 w-10 place-items-center rounded-[5px] border-[1.5px] border-placa-foreground bg-placa font-placa text-base leading-none font-bold text-placa-foreground"
          >
            AC
          </span>
          <span className="text-[0.95rem] font-semibold tracking-tight">Autos Colombia</span>
        </Link>

        {usuario && (
          <>
            <nav aria-label="Principal" className="-mx-2 flex overflow-x-auto">
              {enlaces.map(({ href, texto, icono: Icono }) => {
                const activo = href === "/" ? ruta === "/" : ruta.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={activo ? "page" : undefined}
                    className={cn(
                      "relative flex items-center gap-2 px-2.5 py-4 text-sm font-medium sm:px-3 text-primary-foreground/70 transition-colors outline-none hover:text-primary-foreground focus-visible:text-primary-foreground focus-visible:ring-3 focus-visible:ring-placa/60 focus-visible:ring-inset",
                      "after:absolute after:inset-x-3 after:bottom-0 after:h-[3px] after:rounded-t-full after:bg-placa after:opacity-0 after:transition-opacity",
                      activo && "text-primary-foreground after:opacity-100"
                    )}
                  >
                    <Icono aria-hidden className="hidden size-4 sm:block" />
                    {texto}
                  </Link>
                );
              })}
            </nav>

            <div className="ml-auto flex items-center gap-3 py-2">
              <p className="hidden text-right text-sm leading-tight md:block">
                <span className="block font-medium">{usuario.nombre}</span>
                <span className="block text-xs text-primary-foreground/65">{NOMBRE_ROL[usuario.rol]}</span>
              </p>
              <form action={cerrarSesionAccion}>
                <BotonCerrarSesion />
              </form>
            </div>
          </>
        )}
      </div>
    </header>
  );
}

function BotonCerrarSesion() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="flex h-9 items-center gap-2 rounded-lg border border-primary-foreground/25 px-3 text-sm font-medium text-primary-foreground/85 transition-[color,background-color,scale] duration-150 ease-out outline-none hover:bg-primary-foreground/10 hover:text-primary-foreground focus-visible:ring-3 focus-visible:ring-placa/60 active:scale-[0.97] motion-reduce:active:scale-100 disabled:opacity-60"
    >
      <LogOutIcon aria-hidden className="size-4" />
      {pending ? "Saliendo…" : "Cerrar sesión"}
    </button>
  );
}
