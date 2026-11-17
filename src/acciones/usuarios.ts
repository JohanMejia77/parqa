"use server";

import { revalidatePath } from "next/cache";
import { NOMBRE_ROL } from "@/modelos";
import { obtenerUsuarioActual } from "@/servicios/autenticacion";
import { crearUsuario } from "@/servicios/usuarios";
import { aEstado, type EstadoFormulario } from "./estado";

export async function crearUsuarioAccion(
  _estado: EstadoFormulario,
  formData: FormData
): Promise<EstadoFormulario> {
  try {
    const usuario = await crearUsuario(await obtenerUsuarioActual(), {
      nombre: formData.get("nombre"),
      nombreUsuario: formData.get("nombreUsuario"),
      contrasena: formData.get("contrasena"),
      rol: formData.get("rol"),
    });
    revalidatePath("/usuarios");
    return {
      exito: {
        id: usuario.id,
        mensaje: `${usuario.nombre} ya puede iniciar sesión como ${NOMBRE_ROL[usuario.rol].toLowerCase()} con el usuario ${usuario.nombreUsuario}.`,
      },
    };
  } catch (error) {
    return aEstado(error);
  }
}
