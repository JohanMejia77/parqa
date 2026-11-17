import "server-only";
import type { Usuario } from "@/modelos";
import { db } from "./db";

/** Abre una sesión que dura `horas` y devuelve la fecha en la que expira. */
export async function insertarSesion(
  tokenHash: string,
  usuarioId: number,
  horas: number
): Promise<Date> {
  const { rows } = await db().query<{ expiraEn: Date }>(
    `INSERT INTO sesion (token_hash, usuario_id, expira_en)
     VALUES ($1, $2, now() + make_interval(hours => $3))
     RETURNING expira_en AS "expiraEn"`,
    [tokenHash, usuarioId, horas]
  );
  return rows[0].expiraEn;
}

/** Usuario dueño de la sesión, o null si la sesión no existe, se cerró o ya expiró. */
export async function buscarUsuarioDeSesion(tokenHash: string): Promise<Usuario | null> {
  const { rows } = await db().query<Usuario>(
    `SELECT u.id, u.nombre_usuario AS "nombreUsuario", u.nombre, u.rol, u.creado_en AS "creadoEn"
     FROM sesion s
     JOIN usuario u ON u.id = s.usuario_id
     WHERE s.token_hash = $1 AND s.expira_en > now()`,
    [tokenHash]
  );
  return rows[0] ?? null;
}

export async function eliminarSesion(tokenHash: string): Promise<void> {
  await db().query("DELETE FROM sesion WHERE token_hash = $1", [tokenHash]);
}

/** Limpieza: borra las sesiones que ya expiraron. */
export async function eliminarSesionesVencidas(): Promise<void> {
  await db().query("DELETE FROM sesion WHERE expira_en <= now()");
}
