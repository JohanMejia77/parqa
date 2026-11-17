import "server-only";
import { cache } from "react";
import { createHash, randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { verificarContrasena } from "@/lib/contrasenas.mjs";
import { COOKIE_SESION } from "@/lib/cookie-sesion";
import { textoDe } from "@/lib/parametros";
import {
  ErrorNegocio,
  LARGO_MAXIMO_CONTRASENA,
  NOMBRE_ROL,
  normalizarNombreUsuario,
  type Rol,
  type Usuario,
} from "@/modelos";
import {
  buscarUsuarioDeSesion,
  eliminarSesion,
  eliminarSesionesVencidas,
  insertarSesion,
} from "@/repositorios/sesiones";
import { buscarCredenciales } from "@/repositorios/usuarios";

/** Una sesión dura una jornada de trabajo; después hay que volver a iniciar sesión. */
const HORAS_SESION = 8;

// Hash con el que se compara cuando el usuario no existe: así la respuesta tarda lo mismo
// que con una cuenta real y no revela qué nombres de usuario están registrados.
const HASH_DE_RELLENO = `scrypt$16384$8$5$${"0".repeat(32)}$${"0".repeat(128)}`;

/** En la base solo se guarda el hash del token; el token viaja únicamente en la cookie. */
function hashDeToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * HU-06 Iniciar sesión.
 * Verifica el usuario y la contraseña, abre la sesión y deja su token en una cookie
 * que el navegador no puede leer con JavaScript (HttpOnly).
 */
export async function iniciarSesion(
  nombreUsuarioIngresado: unknown,
  contrasenaIngresada: unknown
): Promise<Usuario> {
  const nombreUsuario = normalizarNombreUsuario(textoDe(nombreUsuarioIngresado));
  const contrasena = textoDe(contrasenaIngresada);
  if (!nombreUsuario) {
    throw new ErrorNegocio("Escribe tu usuario.", { campo: "nombreUsuario" });
  }
  if (!contrasena) {
    throw new ErrorNegocio("Escribe tu contraseña.", { campo: "contrasena" });
  }

  const cuenta = await buscarCredenciales(nombreUsuario);
  const coincide =
    contrasena.length <= LARGO_MAXIMO_CONTRASENA &&
    (await verificarContrasena(contrasena, cuenta?.contrasenaHash ?? HASH_DE_RELLENO));
  if (!cuenta || !coincide) {
    // El mismo mensaje si el usuario no existe o si la contraseña no coincide.
    throw new ErrorNegocio("Usuario o contraseña incorrectos.", { motivo: "no_autenticado" });
  }

  await eliminarSesionesVencidas();
  const token = randomBytes(32).toString("base64url");
  const expiraEn = await insertarSesion(hashDeToken(token), cuenta.id, HORAS_SESION);

  const peticion = await headers();
  (await cookies()).set(COOKIE_SESION, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: peticion.get("x-forwarded-proto") === "https",
    expires: expiraEn,
    path: "/",
  });

  // Se devuelve la cuenta sin el hash de la contraseña.
  return {
    id: cuenta.id,
    nombreUsuario: cuenta.nombreUsuario,
    nombre: cuenta.nombre,
    rol: cuenta.rol,
    creadoEn: cuenta.creadoEn,
  };
}

/**
 * HU-07 Cerrar sesión.
 * Borra la sesión en la base de datos, de modo que su token deja de servir aunque
 * alguien lo haya copiado, y luego borra la cookie.
 */
export async function cerrarSesion(): Promise<void> {
  const almacen = await cookies();
  const token = almacen.get(COOKIE_SESION)?.value;
  if (token) await eliminarSesion(hashDeToken(token));
  almacen.delete(COOKIE_SESION);
}

/**
 * Usuario que hace la petición, o null si no hay sesión, se cerró o ya expiró.
 * `cache` evita repetir la consulta cuando varias partes de una misma página lo piden.
 */
export const obtenerUsuarioActual = cache(async (): Promise<Usuario | null> => {
  const token = (await cookies()).get(COOKIE_SESION)?.value;
  return token ? buscarUsuarioDeSesion(hashDeToken(token)) : null;
});

/** Para las páginas: devuelve el usuario actual o lleva al inicio de sesión. */
export async function exigirUsuario(): Promise<Usuario> {
  const usuario = await obtenerUsuarioActual();
  if (!usuario) redirect("/login");
  return usuario;
}

/**
 * HU-08 Separación de roles.
 * Comprueba que quien hace la operación inició sesión y tiene el rol que la operación exige.
 * Todos los servicios que cambian datos la llaman antes de hacer cualquier otra cosa.
 */
export function autorizar(actor: Usuario | null, rol: Rol): asserts actor is Usuario {
  if (!actor) {
    throw new ErrorNegocio("Inicia sesión para continuar.", { motivo: "no_autenticado" });
  }
  if (actor.rol !== rol) {
    throw new ErrorNegocio(
      `Esta operación es solo para el rol ${NOMBRE_ROL[rol].toLowerCase()}.`,
      { motivo: "sin_permiso" }
    );
  }
}
