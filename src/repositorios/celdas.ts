import "server-only";
import type { Celda, CeldaCatalogo, EstadoCelda, TipoVehiculo } from "@/modelos";
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

/** Celdas sin vehículo en este momento; si se indica `tipo`, solo las de ese tipo. */
export async function listarCeldasLibres(tipo: TipoVehiculo | null = null): Promise<Celda[]> {
  const { rows } = await db().query<Celda>(
    `SELECT c.id, c.codigo, c.tipo
     FROM celda c
     WHERE NOT EXISTS (SELECT 1 FROM registro r WHERE r.celda_id = c.id AND r.fecha_salida IS NULL)
       AND ($1::text IS NULL OR c.tipo = $1)
     ORDER BY c.codigo`,
    [tipo]
  );
  return rows;
}

// Catálogo: cada celda con su ocupante actual y el número de movimientos de su historial.
const SELECT_CATALOGO = `
  SELECT c.id, c.codigo, c.tipo,
         v.placa AS "placaOcupante",
         (SELECT count(*)::int FROM registro h WHERE h.celda_id = c.id) AS movimientos
  FROM celda c
  LEFT JOIN registro r ON r.celda_id = c.id AND r.fecha_salida IS NULL
  LEFT JOIN vehiculo v ON v.id = r.vehiculo_id
`;

/** Catálogo de celdas; `buscar` filtra los códigos que lo contienen y `tipo` el tipo de vehículo. */
export async function listarCatalogoCeldas(
  buscar = "",
  tipo: TipoVehiculo | null = null
): Promise<CeldaCatalogo[]> {
  const { rows } = await db().query<CeldaCatalogo>(
    `${SELECT_CATALOGO}
     WHERE c.codigo LIKE '%' || $1 || '%' AND ($2::text IS NULL OR c.tipo = $2)
     ORDER BY c.codigo`,
    [buscar, tipo]
  );
  return rows;
}

export async function buscarCeldaCatalogo(
  id: number,
  con: Conexion = db()
): Promise<CeldaCatalogo | null> {
  const { rows } = await con.query<CeldaCatalogo>(`${SELECT_CATALOGO} WHERE c.id = $1`, [id]);
  return rows[0] ?? null;
}

/**
 * Busca la celda y bloquea su fila hasta que termine la transacción, para que
 * registrar una entrada y editar o eliminar la misma celda no se crucen:
 * "FOR SHARE" impide que la cambien; "FOR UPDATE" además impide que la usen.
 */
export async function bloquearCelda(
  con: Conexion,
  id: number,
  bloqueo: "FOR SHARE" | "FOR UPDATE"
): Promise<Celda | null> {
  const { rows } = await con.query<Celda>(
    `SELECT id, codigo, tipo FROM celda WHERE id = $1 ${bloqueo}`,
    [id]
  );
  return rows[0] ?? null;
}

export async function celdaEstaOcupada(con: Conexion, celdaId: number): Promise<boolean> {
  const { rowCount } = await con.query(
    "SELECT 1 FROM registro WHERE celda_id = $1 AND fecha_salida IS NULL",
    [celdaId]
  );
  return rowCount !== 0;
}

export async function insertarCelda(
  con: Conexion,
  codigo: string,
  tipo: TipoVehiculo
): Promise<Celda> {
  const { rows } = await con.query<Celda>(
    "INSERT INTO celda (codigo, tipo) VALUES ($1, $2) RETURNING id, codigo, tipo",
    [codigo, tipo]
  );
  return rows[0];
}

export async function actualizarCelda(
  con: Conexion,
  id: number,
  codigo: string,
  tipo: TipoVehiculo
): Promise<Celda> {
  const { rows } = await con.query<Celda>(
    "UPDATE celda SET codigo = $2, tipo = $3 WHERE id = $1 RETURNING id, codigo, tipo",
    [id, codigo, tipo]
  );
  return rows[0];
}

export async function eliminarCeldaPorId(con: Conexion, id: number): Promise<void> {
  await con.query("DELETE FROM celda WHERE id = $1", [id]);
}
