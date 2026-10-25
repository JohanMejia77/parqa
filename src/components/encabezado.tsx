"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeftFromLineIcon, ArrowRightToLineIcon, HistoryIcon, LayoutGridIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const ENLACES = [
  { href: "/", texto: "Panel", icono: LayoutGridIcon },
  { href: "/entrada", texto: "Entrada", icono: ArrowRightToLineIcon },
  { href: "/salida", texto: "Salida", icono: ArrowLeftFromLineIcon },
  { href: "/historial", texto: "Historial", icono: HistoryIcon },
];

export function Encabezado() {
  const ruta = usePathname();

  return (
    <header className="bg-primary text-primary-foreground">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-1 px-4 sm:px-6">
        <Link
          href="/"
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

        <nav aria-label="Principal" className="-mx-2 flex overflow-x-auto">
          {ENLACES.map(({ href, texto, icono: Icono }) => {
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
      </div>
    </header>
  );
}
