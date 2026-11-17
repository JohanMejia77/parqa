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
    // Si PostgreSQL se reinicia, las conexiones en espera fallan. Sin este manejador ese
    // fallo detendría la aplicación; con él, la siguiente consulta abre una conexión nueva.
    global.poolAutosColombia.on("error", (error) => {
      console.error("Se perdió una conexión con PostgreSQL:", error.message);
    });
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

/**
 * Indica si PostgreSQL rechazó un dato por su contenido (códigos SQLSTATE de la clase 22):
 * por ejemplo, un texto con caracteres que la base de datos no puede guardar.
 */
export function esDatoNoAdmitido(error: unknown): boolean {
  const codigo = (error as { code?: unknown })?.code;
  return typeof codigo === "string" && codigo.startsWith("22");
}

/** Indica si `error` es la violación de una llave foránea (por ejemplo, borrar una celda con registros). */
export function esViolacionForanea(error: unknown): boolean {
  return (error as { code?: string })?.code === "23503";
}
