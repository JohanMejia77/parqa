// Entidades del dominio y reglas que no dependen de la base de datos.

export type TipoVehiculo = "CARRO" | "MOTO";

/** Rol de una cuenta: decide qué puede hacer en el sistema. */
export type Rol = "ADMINISTRADOR" | "OPERADOR";

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

/** Cuenta de acceso al sistema. Nunca incluye la contraseña ni su hash. */
export interface Usuario {
  id: number;
  nombreUsuario: string;
  nombre: string;
  rol: Rol;
  creadoEn: Date;
}

/** Celda con el vehículo que la ocupa en este momento (si hay uno). */
export interface EstadoCelda extends Celda {
  placaOcupante: string | null;
}

/** Celda del catálogo: su ocupación actual y cuántos movimientos tiene en el historial. */
export interface CeldaCatalogo extends EstadoCelda {
  movimientos: number;
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

export const NOMBRE_ROL: Record<Rol, string> = {
  ADMINISTRADOR: "Administrador",
  OPERADOR: "Operador",
};

/** Página a la que llega cada rol al iniciar sesión. */
export const RUTA_INICIO: Record<Rol, string> = {
  ADMINISTRADOR: "/celdas",
  OPERADOR: "/",
};

export function esTipoVehiculo(valor: unknown): valor is TipoVehiculo {
  return valor === "CARRO" || valor === "MOTO";
}

export function esRol(valor: unknown): valor is Rol {
  return valor === "ADMINISTRADOR" || valor === "OPERADOR";
}

// ---------- Placas ----------

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

// ---------- Celdas ----------

export const LARGO_MAXIMO_CODIGO_CELDA = 10;

// Letras y números separados por guiones sencillos: A-01, M-10, SOTANO-2.
const FORMATO_CODIGO_CELDA = /^[A-Z0-9]+(-[A-Z0-9]+)*$/;

/** Deja el código en mayúsculas y sin espacios a los lados: " a-01 " -> "A-01". */
export function normalizarCodigoCelda(codigo: string): string {
  return codigo.trim().toUpperCase();
}

export function codigoCeldaValido(codigo: string): boolean {
  return codigo.length <= LARGO_MAXIMO_CODIGO_CELDA && FORMATO_CODIGO_CELDA.test(codigo);
}

/**
 * Deja el texto en mayúsculas y solo con los caracteres que un código puede tener.
 * Se usa mientras se escribe el código en el formulario y para buscar celdas por código.
 */
export function limpiarCodigoCelda(texto: string): string {
  return texto
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "")
    .slice(0, LARGO_MAXIMO_CODIGO_CELDA);
}

// ---------- Usuarios ----------

export const LARGO_MINIMO_CONTRASENA = 8;
export const LARGO_MAXIMO_CONTRASENA = 72;

// De 3 a 30 letras, números, puntos o guiones. Admite tildes y ñ.
const FORMATO_NOMBRE_USUARIO = new RegExp("^[\\p{L}\\p{N}._-]{3,30}$", "u");

/** El nombre de usuario no distingue mayúsculas: " Laura.Gomez " -> "laura.gomez". */
export function normalizarNombreUsuario(nombreUsuario: string): string {
  return nombreUsuario.trim().toLowerCase();
}

export function nombreUsuarioValido(nombreUsuario: string): boolean {
  return FORMATO_NOMBRE_USUARIO.test(nombreUsuario);
}

// ---------- Errores ----------

/**
 * Por qué se rechazó una operación. La API lo convierte en el código HTTP:
 * invalido 422, no_autenticado 401, sin_permiso 403, no_encontrado 404, conflicto 409.
 */
export type MotivoError = "invalido" | "no_autenticado" | "sin_permiso" | "no_encontrado" | "conflicto";

/** Error de una regla del negocio; su mensaje se muestra tal cual a la persona. */
export class ErrorNegocio extends Error {
  /** Campo del formulario al que corresponde el error, si aplica. */
  readonly campo?: string;
  readonly motivo: MotivoError;

  constructor(message: string, detalle: { campo?: string; motivo?: MotivoError } = {}) {
    super(message);
    this.name = "ErrorNegocio";
    this.campo = detalle.campo;
    this.motivo = detalle.motivo ?? "invalido";
  }
}
