import "server-only";
import type { Registro, RegistroDetalle } from "@/modelos";
import { db, type Conexion } from "./db";

const SELECT_DETALLE = `
  SELECT r.id,
         r.vehiculo_id   AS "vehiculoId",
         r.celda_id      AS "celdaId",
         r.fecha_entrada AS "fechaEntrada",
         r.fecha_salida  AS "fechaSalida",
         v.placa,
         v.tipo,
         c.codigo        AS "codigoCelda"
  FROM registro r
  JOIN vehiculo v ON v.id = r.vehiculo_id
  JOIN celda c ON c.id = r.celda_id
`;

/** Vehículos que están dentro del parqueadero, del que lleva más tiempo al más reciente. */
export async function listarVehiculosDentro(): Promise<RegistroDetalle[]> {
  const { rows } = await db().query<RegistroDetalle>(
    `${SELECT_DETALLE} WHERE r.fecha_salida IS NULL ORDER BY r.fecha_entrada`
  );
  return rows;
}

/** Últimos movimientos; si se indica `placa`, filtra las placas que la contienen. */
export async function listarHistorial(placa = "", limite = 100): Promise<RegistroDetalle[]> {
  const { rows } = await db().query<RegistroDetalle>(
    `${SELECT_DETALLE} WHERE v.placa LIKE '%' || $1 || '%' ORDER BY r.fecha_entrada DESC LIMIT $2`,
    [placa, limite]
  );
  return rows;
}

export async function buscarRegistroPorId(id: number): Promise<RegistroDetalle | null> {
  const { rows } = await db().query<RegistroDetalle>(`${SELECT_DETALLE} WHERE r.id = $1`, [id]);
  return rows[0] ?? null;
}

/** Registro abierto (vehículo dentro) de una placa, o null si ese vehículo no está dentro. */
export async function buscarRegistroDentro(
  placa: string,
  con: Conexion = db()
): Promise<RegistroDetalle | null> {
  const { rows } = await con.query<RegistroDetalle>(
    `${SELECT_DETALLE} WHERE v.placa = $1 AND r.fecha_salida IS NULL`,
    [placa]
  );
  return rows[0] ?? null;
}

export async function crearRegistro(
  con: Conexion,
  vehiculoId: number,
  celdaId: number
): Promise<Registro> {
  const { rows } = await con.query<Registro>(
    `INSERT INTO registro (vehiculo_id, celda_id) VALUES ($1, $2)
     RETURNING id, vehiculo_id AS "vehiculoId", celda_id AS "celdaId",
               fecha_entrada AS "fechaEntrada", fecha_salida AS "fechaSalida"`,
    [vehiculoId, celdaId]
  );
  return rows[0];
}

/** Cierra el registro abierto de la placa con la hora actual. Devuelve su id o null si no había. */
export async function cerrarRegistroDentro(con: Conexion, placa: string): Promise<number | null> {
  const { rows } = await con.query<{ id: number }>(
    `UPDATE registro r SET fecha_salida = now()
     FROM vehiculo v
     WHERE v.id = r.vehiculo_id AND v.placa = $1 AND r.fecha_salida IS NULL
     RETURNING r.id`,
    [placa]
  );
  return rows[0]?.id ?? null;
}
