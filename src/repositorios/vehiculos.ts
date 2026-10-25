import "server-only";
import type { TipoVehiculo, Vehiculo } from "@/modelos";
import type { Conexion } from "./db";

/**
 * Devuelve el vehículo con esa placa; si no existe, lo registra.
 * El ON CONFLICT evita duplicados aunque dos operadores lo registren a la vez.
 */
export async function obtenerOCrearVehiculo(
  con: Conexion,
  placa: string,
  tipo: TipoVehiculo
): Promise<Vehiculo> {
  const { rows } = await con.query<Vehiculo>(
    `INSERT INTO vehiculo (placa, tipo) VALUES ($1, $2)
     ON CONFLICT (placa) DO UPDATE SET placa = EXCLUDED.placa
     RETURNING id, placa, tipo, creado_en AS "creadoEn"`,
    [placa, tipo]
  );
  return rows[0];
}
