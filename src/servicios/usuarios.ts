import "server-only";
import { generarHash } from "@/lib/contrasenas.mjs";
import { textoDe } from "@/lib/parametros";
import {
  ErrorNegocio,
  LARGO_MAXIMO_CONTRASENA,
  LARGO_MINIMO_CONTRASENA,
  esRol,
  nombreUsuarioValido,
  normalizarNombreUsuario,
  type Usuario,
} from "@/modelos";
import { db, esViolacionUnica } from "@/repositorios/db";
import { insertarUsuario, listarUsuarios } from "@/repositorios/usuarios";
import { autorizar } from "./autenticacion";

/** Datos que llegan del formulario o de la API; se validan todos en el servidor. */
export interface DatosUsuario {
  nombre?: unknown;
  nombreUsuario?: unknown;
  contrasena?: unknown;
  rol?: unknown;
}

/**
 * HU-09 Crear usuario.
 * Solo el administrador crea cuentas. Guarda el hash de la contraseña, nunca la contraseña.
 */
export async function crearUsuario(actor: Usuario | null, datos: DatosUsuario): Promise<Usuario> {
  autorizar(actor, "ADMINISTRADOR");

  // Se quitan los espacios sobrantes: "  Laura   Gómez " -> "Laura Gómez".
  const nombre = textoDe(datos.nombre).trim().replace(/\s+/g, " ");
  if (nombre.length < 3 || nombre.length > 80) {
    throw new ErrorNegocio("Escribe el nombre completo de la persona (de 3 a 80 caracteres).", {
      campo: "nombre",
    });
  }

  const nombreUsuario = normalizarNombreUsuario(textoDe(datos.nombreUsuario));
  if (!nombreUsuarioValido(nombreUsuario)) {
    throw new ErrorNegocio(
      "El usuario debe tener de 3 a 30 caracteres: letras, números, punto, guion o guion bajo, sin espacios.",
      { campo: "nombreUsuario" }
    );
  }

  if (!esRol(datos.rol)) {
    throw new ErrorNegocio("Elige el rol de la cuenta: operador o administrador.", { campo: "rol" });
  }

  const contrasena = textoDe(datos.contrasena);
  if (contrasena.length < LARGO_MINIMO_CONTRASENA || contrasena.length > LARGO_MAXIMO_CONTRASENA) {
    throw new ErrorNegocio(
      `La contraseña debe tener entre ${LARGO_MINIMO_CONTRASENA} y ${LARGO_MAXIMO_CONTRASENA} caracteres.`,
      { campo: "contrasena" }
    );
  }

  try {
    return await insertarUsuario(db(), {
      nombreUsuario,
      nombre,
      rol: datos.rol,
      contrasenaHash: await generarHash(contrasena),
    });
  } catch (error) {
    // La restricción única de PostgreSQL decide, incluso si dos administradores
    // crean el mismo usuario al mismo tiempo.
    if (esViolacionUnica(error, "uq_usuario_nombre_usuario")) {
      throw new ErrorNegocio(`Ya existe una cuenta con el usuario ${nombreUsuario}. Elige otro.`, {
        campo: "nombreUsuario",
        motivo: "conflicto",
      });
    }
    throw error;
  }
}

/** HU-10 Consultar usuarios: cuentas registradas, sin contraseñas ni hashes. */
export async function consultarUsuarios(actor: Usuario | null): Promise<Usuario[]> {
  autorizar(actor, "ADMINISTRADOR");
  return listarUsuarios();
}
