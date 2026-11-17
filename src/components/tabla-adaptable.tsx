import { useId } from "react";

/**
 * Tabla de datos que se adapta al ancho disponible (reglas en globals.css):
 * - En pantallas anchas es una tabla normal; si no cabe, se desplaza dentro de su contenedor,
 *   que también se puede enfocar y mover con el teclado.
 * - En pantallas angostas cada fila se muestra como una ficha. Cada celda necesita
 *   el atributo data-etiqueta con el nombre de su columna.
 */
export function TablaAdaptable({
  titulo,
  children,
}: {
  /** Nombre de la tabla para lectores de pantalla. */
  titulo: string;
  children: React.ReactNode;
}) {
  const id = useId();

  return (
    <div
      role="region"
      aria-labelledby={id}
      tabIndex={0}
      className="tabla-contenedor overflow-x-auto rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <table className="tabla-adaptable w-full text-sm">
        <caption id={id} className="sr-only">
          {titulo}
        </caption>
        {children}
      </table>
    </div>
  );
}
