import { NOMBRE_TIPO, type EstadoCelda, type TipoVehiculo } from "@/modelos";
import { cn } from "@/lib/utils";

const TIPOS: TipoVehiculo[] = ["CARRO", "MOTO"];

/**
 * Plano de celdas del parqueadero.
 * Si recibe `onSeleccionar`, las celdas libres se pueden elegir con un clic.
 */
export function MapaCeldas({
  celdas,
  tipos = TIPOS,
  seleccionada,
  onSeleccionar,
}: {
  celdas: EstadoCelda[];
  tipos?: TipoVehiculo[];
  seleccionada?: number | null;
  onSeleccionar?: (celdaId: number) => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      {tipos.map((tipo) => {
        const delTipo = celdas.filter((c) => c.tipo === tipo);
        const libres = delTipo.filter((c) => !c.placaOcupante).length;
        return (
          <section key={tipo} aria-labelledby={`celdas-${tipo}`} className="flex flex-col gap-2.5">
            <div className="flex items-baseline justify-between gap-2">
              <h3 id={`celdas-${tipo}`} className="text-sm font-medium">
                {NOMBRE_TIPO[tipo]}s
              </h3>
              <p className="text-sm text-muted-foreground tabular-nums">
                <span className="font-semibold text-foreground">{libres}</span> libres de {delTipo.length}
              </p>
            </div>
            <ul className="grid grid-cols-5 gap-1.5">
              {delTipo.map((celda) => (
                <li key={celda.id}>
                  <Celda
                    celda={celda}
                    elegida={celda.id === seleccionada}
                    onSeleccionar={onSeleccionar}
                  />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function Celda({
  celda,
  elegida,
  onSeleccionar,
}: {
  celda: EstadoCelda;
  elegida: boolean;
  onSeleccionar?: (celdaId: number) => void;
}) {
  const base =
    "flex h-12 w-full flex-col items-center justify-center rounded-md text-xs leading-tight tabular-nums";

  if (celda.placaOcupante) {
    return (
      <div
        className={cn(base, "bg-primary text-primary-foreground")}
        title={`Celda ${celda.codigo}: ocupada por ${celda.placaOcupante}`}
      >
        <span className="text-primary-foreground/65">{celda.codigo}</span>
        <span className="font-placa text-sm font-semibold tracking-wider">{celda.placaOcupante}</span>
        <span className="sr-only">ocupada</span>
      </div>
    );
  }

  const libre = cn(
    base,
    "border border-dashed border-input bg-card text-muted-foreground",
    elegida && "border-solid border-placa-foreground bg-placa font-semibold text-placa-foreground"
  );

  if (!onSeleccionar) {
    return (
      <div className={libre} title={`Celda ${celda.codigo}: libre`}>
        {celda.codigo}
        <span className="sr-only">libre</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      aria-pressed={elegida}
      onClick={() => onSeleccionar(celda.id)}
      className={cn(
        libre,
        "cursor-pointer transition-colors outline-none hover:border-foreground/40 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
      )}
    >
      {celda.codigo}
      <span className="sr-only">{elegida ? "seleccionada" : "libre"}</span>
    </button>
  );
}

export function LeyendaCeldas() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      <li className="flex items-center gap-1.5">
        <span aria-hidden className="size-3 rounded-[3px] border border-dashed border-input bg-card" />
        Libre
      </li>
      <li className="flex items-center gap-1.5">
        <span aria-hidden className="size-3 rounded-[3px] bg-primary" />
        Ocupada
      </li>
    </ul>
  );
}
