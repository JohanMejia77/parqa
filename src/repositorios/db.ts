import "server-only";
import { Pool, type PoolClient } from "pg";

// Un único pool de conexiones para toda la aplicación.
// En desarrollo se guarda en globalThis para no abrir un pool nuevo en cada recarga.
const global = globalThis as unknown as { poolAutosColombia?: Pool };

function obtenerPool(): Pool {
  if (!global.poolAutosColombia) {
    if (!process.env.DATABASE_URL) {
      throw new Error("Falta DATABASE_URL. Copia .env.example como .env y configura PostgreSQL.");
    }
    global.poolAutosColombia = new Pool({ connectionString: process.env.DATABASE_URL });
  }
  return global.poolAutosColombia;
}

/** Conexión sobre la que se ejecutan las consultas: el pool o un cliente en transacción. */
export type Conexion = Pick<PoolClient, "query">;

export function db(): Conexion {
  return obtenerPool();
}

/** Ejecuta `trabajo` dentro de una transacción: todo se guarda o nada se guarda. */
export async function enTransaccion<T>(trabajo: (cliente: Conexion) => Promise<T>): Promise<T> {
  const cliente = await obtenerPool().connect();
  try {
    await cliente.query("BEGIN");
    const resultado = await trabajo(cliente);
    await cliente.query("COMMIT");
    return resultado;
  } catch (error) {
    await cliente.query("ROLLBACK");
    throw error;
  } finally {
    cliente.release();
  }
}

/** Indica si `error` es la violación de la restricción única `restriccion` de PostgreSQL. */
export function esViolacionUnica(error: unknown, restriccion: string): boolean {
  const e = error as { code?: string; constraint?: string };
  return e?.code === "23505" && e.constraint === restriccion;
}
