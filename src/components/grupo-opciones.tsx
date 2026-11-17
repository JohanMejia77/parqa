import { cn } from "@/lib/utils";

export interface Opcion<T extends string> {
  valor: T;
  etiqueta: string;
  descripcion?: string;
  icono?: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
}

/**
 * Elección de una sola opción entre pocas (2 a 5), con todas a la vista:
 * botones de opción nativos dentro de un fieldset con su leyenda.
 */
export function GrupoOpciones<T extends string>({
  leyenda,
  nombre,
  opciones,
  valor,
  onCambiar,
  deshabilitado = false,
  ayuda,
  error,
  ref,
}: {
  leyenda: string;
  /** Nombre con el que el valor elegido viaja en el formulario. */
  nombre: string;
  opciones: Opcion<T>[];
  valor: T | null;
  onCambiar: (valor: T) => void;
  deshabilitado?: boolean;
  ayuda?: React.ReactNode;
  error?: string;
  /** Referencia al grupo, para llevar el foco a su primera opción cuando tiene un error. */
  ref?: React.Ref<HTMLFieldSetElement>;
}) {
  const idAyuda = `${nombre}-ayuda`;
  const idError = `${nombre}-error`;
  const descritoPor = [ayuda ? idAyuda : "", error ? idError : ""].filter(Boolean).join(" ");

  return (
    <fieldset
      ref={ref}
      aria-describedby={descritoPor || undefined}
      className="flex min-w-0 flex-col gap-2"
    >
      <legend className={cn("mb-2 text-sm leading-snug font-medium", error && "text-destructive")}>
        {leyenda}
      </legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {opciones.map(({ valor: valorOpcion, etiqueta, descripcion, icono: Icono }) => (
          <label
            key={valorOpcion}
            className={cn(
              "flex cursor-pointer items-start gap-2.5 rounded-lg border border-input p-3 text-sm transition-colors duration-150 hover:bg-muted/60",
              "has-checked:border-primary has-checked:bg-primary/5 has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
              "has-disabled:pointer-events-none has-disabled:opacity-60",
              error && "border-destructive"
            )}
          >
            <input
              type="radio"
              name={nombre}
              value={valorOpcion}
              checked={valor === valorOpcion}
              onChange={() => onCambiar(valorOpcion)}
              disabled={deshabilitado}
              required
              className="mt-0.5 size-4 shrink-0 accent-primary"
            />
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="flex items-center gap-1.5 leading-tight font-medium">
                {Icono && <Icono aria-hidden className="size-4" />}
                {etiqueta}
              </span>
              {descripcion && <span className="text-muted-foreground">{descripcion}</span>}
            </span>
          </label>
        ))}
      </div>
      {ayuda && (
        <p id={idAyuda} className="text-sm text-muted-foreground">
          {ayuda}
        </p>
      )}
      {error && (
        <p id={idError} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </fieldset>
  );
}
