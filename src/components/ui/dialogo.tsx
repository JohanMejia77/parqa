"use client";

import { useEffect, useId, useRef } from "react";
import { cn } from "@/lib/utils";

// Diálogo modal construido sobre el elemento nativo <dialog>. El navegador se encarga de:
// dejar inactivo el resto de la página, mantener el foco dentro, cerrar con Esc y
// devolver el foco al botón que lo abrió. Sus animaciones están en globals.css (.dialogo).

let animaLaSalida: boolean | undefined;

/**
 * Chrome y Edge animan solos la salida de un <dialog> (transición de `display` y `overlay`).
 * En Firefox y Safari hay que esperar la animación antes de cerrarlo.
 */
function navegadorAnimaLaSalida(): boolean {
  if (animaLaSalida !== undefined) return animaLaSalida;
  if (!CSS.supports("overlay", "auto") || !CSS.supports("transition-behavior", "allow-discrete")) {
    return (animaLaSalida = false);
  }
  // Firefox acepta allow-discrete pero no anima `display`: se comprueba con un elemento de prueba.
  const prueba = document.createElement("div");
  prueba.style.cssText = "transition: display 1s allow-discrete !important; display: block;";
  document.body.appendChild(prueba);
  void getComputedStyle(prueba).display;
  prueba.style.display = "none";
  animaLaSalida = getComputedStyle(prueba).display === "block";
  prueba.remove();
  return animaLaSalida;
}

async function cerrarConAnimacion(dialogo: HTMLDialogElement) {
  if (!navegadorAnimaLaSalida()) {
    dialogo.setAttribute("data-closing", "");
    const animaciones = dialogo.getAnimations({ subtree: true });
    if (animaciones.length > 0) {
      await Promise.race([
        Promise.allSettled(animaciones.map((animacion) => animacion.finished)),
        new Promise((resolver) => setTimeout(resolver, 1000)),
      ]);
    }
    dialogo.removeAttribute("data-closing");
  }
  if (dialogo.open) dialogo.close();
}

export function Dialogo({
  abierto,
  onCerrar,
  titulo,
  descripcion,
  cierreExterior = false,
  className,
  children,
}: {
  abierto: boolean;
  /** Se llama cuando el diálogo se cierra por cualquier vía: botón, tecla Esc o clic fuera. */
  onCerrar: () => void;
  titulo: React.ReactNode;
  descripcion?: React.ReactNode;
  /** Permite cerrar con un clic fuera. No conviene en formularios: se perdería lo escrito. */
  cierreExterior?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const idTitulo = useId();
  const idDescripcion = useId();

  useEffect(() => {
    const dialogo = ref.current;
    if (!dialogo) return;
    if (abierto && !dialogo.open) dialogo.showModal();
    else if (!abierto && dialogo.open) void cerrarConAnimacion(dialogo);
  }, [abierto]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={idTitulo}
      aria-describedby={descripcion ? idDescripcion : undefined}
      // closedby es reciente y los tipos de React aún no lo incluyen. Donde no existe,
      // el diálogo se sigue cerrando con Esc y con sus botones.
      {...(cierreExterior ? ({ closedby: "any" } as object) : null)}
      onCancel={(evento) => {
        // Esc o clic fuera: se cierra con la misma animación que los botones.
        evento.preventDefault();
        void cerrarConAnimacion(evento.currentTarget);
      }}
      onClose={onCerrar}
      className={cn(
        "dialogo m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-xl bg-card text-card-foreground shadow-xl ring-1 ring-foreground/10 outline-none",
        className
      )}
    >
      <div className="flex flex-col gap-1.5 px-5 pt-5">
        <h2 id={idTitulo} className="font-heading text-lg leading-snug font-semibold text-balance">
          {titulo}
        </h2>
        {descripcion && (
          <p id={idDescripcion} className="text-sm text-pretty text-muted-foreground">
            {descripcion}
          </p>
        )}
      </div>
      {children}
    </dialog>
  );
}

/** Zona de contenido del diálogo. */
export function DialogoCuerpo({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-5 px-5 pt-4", className)} {...props} />;
}

/**
 * Barra de botones. En el código va primero la acción segura (Cancelar): es la que
 * recibe el foco al abrir una confirmación y el orden visual coincide con el del teclado.
 */
export function DialogoAcciones({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "mt-5 flex flex-wrap justify-end gap-2 border-t bg-muted/50 px-5 py-3.5",
        className
      )}
      {...props}
    />
  );
}
