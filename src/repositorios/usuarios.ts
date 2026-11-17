import "server-only";
import type { Rol, Usuario } from "@/modelos";
import { db, type Conexion } from "./db";

// Columnas públicas de una cuenta: nunca se devuelve el hash de la contraseña.
const COLUMNAS_USUARIO = `id, nombre_usuario AS "nombreUsuario", nombre, rol, creado_en AS "creadoEn"`;

/** Cuentas registradas, ordenadas por nombre. */
export async function listarUsuarios(): Promise<Usuario[]> {
  const { rows } = await db().query<Usuario>(
    `SELECT ${COLUMNAS_USUARIO} FROM usuario ORDER BY nombre, nombre_usuario`
  );
  return rows;
}

/** Cuenta con su hash de contraseña. Solo la usa el inicio de sesión para verificarla. */
export async function buscarCredenciales(
  nombreUsuario: string
): Promise<(Usuario & { contrasenaHash: string }) | null> {
  const { rows } = await db().query<Usuario & { contrasenaHash: string }>(
    `SELECT ${COLUMNAS_USUARIO}, contrasena_hash AS "contrasenaHash"
     FROM usuario WHERE nombre_usuario = $1`,
    [nombreUsuario]
  );
  return rows[0] ?? null;
}

export async function insertarUsuario(
  con: Conexion,
  datos: { nombreUsuario: string; nombre: string; rol: Rol; contrasenaHash: string }
): Promise<Usuario> {
  const { rows } = await con.query<Usuario>(
    `INSERT INTO usuario (nombre_usuario, nombre, rol, contrasena_hash)
     VALUES ($1, $2, $3, $4)
     RETURNING ${COLUMNAS_USUARIO}`,
    [datos.nombreUsuario, datos.nombre, datos.rol, datos.contrasenaHash]
  );
  return rows[0];
}
