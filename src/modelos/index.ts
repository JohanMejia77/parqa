// Entidades del dominio y reglas que no dependen de la base de datos.

export type TipoVehiculo = "CARRO" | "MOTO";

export interface Vehiculo {
  id: number;
  placa: string;
  tipo: TipoVehiculo;
  creadoEn: Date;
}

export interface Celda {
  id: number;
  codigo: string;
  tipo: TipoVehiculo;
}

export interface Registro {
  id: number;
  vehiculoId: number;
  celdaId: number;
  fechaEntrada: Date;
  fechaSalida: Date | null;
}

/** Celda con el vehículo que la ocupa en este momento (si hay uno). */
export interface EstadoCelda extends Celda {
  placaOcupante: string | null;
}

/** Registro con los datos de vehículo y celda, listo para mostrar en pantalla. */
export interface RegistroDetalle extends Registro {
  placa: string;
  tipo: TipoVehiculo;
  codigoCelda: string;
}

export const NOMBRE_TIPO: Record<TipoVehiculo, string> = {
  CARRO: "Carro",
  MOTO: "Moto",
};

const FORMATO_CARRO = /^[A-Z]{3}\d{3}$/; // ABC123
const FORMATO_MOTO = /^[A-Z]{3}\d{2}[A-Z]$/; // ABC12D

/** Deja la placa en mayúsculas y sin espacios ni guiones: " abc-123 " -> "ABC123". */
export function normalizarPlaca(placa: string): string {
  return placa.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/**
 * Deduce el tipo de vehículo a partir del formato de la placa colombiana.
 * Devuelve null si la placa no tiene un formato válido.
 */
export function tipoSegunPlaca(placa: string): TipoVehiculo | null {
  if (FORMATO_CARRO.test(placa)) return "CARRO";
  if (FORMATO_MOTO.test(placa)) return "MOTO";
  return null;
}

/** Tiempo transcurrido entre la entrada y la salida (o hasta `ahora` si sigue dentro). */
export function permanencia(registro: Registro, ahora: Date): number {
  const fin = registro.fechaSalida ?? ahora;
  return fin.getTime() - registro.fechaEntrada.getTime();
}

/** Error de una regla del negocio; su mensaje se muestra tal cual al operador. */
export class ErrorNegocio extends Error {
  constructor(
    message: string,
    readonly campo?: "placa" | "celda"
  ) {
    super(message);
    this.name = "ErrorNegocio";
  }
}
