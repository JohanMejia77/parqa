import "server-only";
import type { Celda, EstadoCelda } from "@/modelos";
import { db, type Conexion } from "./db";

/** Todas las celdas con la placa del vehículo que las ocupa (null si están libres). */
export async function listarEstadoCeldas(): Promise<EstadoCelda[]> {
  const { rows } = await db().query<EstadoCelda>(`
    SELECT c.id, c.codigo, c.tipo, v.placa AS "placaOcupante"
    FROM celda c
    LEFT JOIN registro r ON r.celda_id = c.id AND r.fecha_salida IS NULL
    LEFT JOIN vehiculo v ON v.id = r.vehiculo_id
    ORDER BY c.codigo
  `);
  return rows;
}

export async function buscarCeldaPorId(con: Conexion, id: number): Promise<Celda | null> {
  const { rows } = await con.query<Celda>("SELECT id, codigo, tipo FROM celda WHERE id = $1", [id]);
  return rows[0] ?? null;
}

export async function celdaEstaOcupada(con: Conexion, celdaId: number): Promise<boolean> {
  const { rowCount } = await con.query(
    "SELECT 1 FROM registro WHERE celda_id = $1 AND fecha_salida IS NULL",
    [celdaId]
  );
  return rowCount !== 0;
}
