"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ErrorNegocio, RUTA_INICIO } from "@/modelos";
import { cerrarSesion, iniciarSesion } from "@/servicios/autenticacion";
import type { EstadoFormulario } from "./estado";

export async function iniciarSesionAccion(
  _estado: EstadoFormulario,
  formData: FormData
): Promise<EstadoFormulario> {
  let destino: string;
  try {
    const usuario = await iniciarSesion(formData.get("nombreUsuario"), formData.get("contrasena"));
    destino = RUTA_INICIO[usuario.rol];
  } catch (error) {
    if (error instanceof ErrorNegocio) {
      return { error: error.message, campo: error.campo };
    }
    console.error(error);
    return {
      error: "No se pudo iniciar sesión. Verifica que PostgreSQL esté encendido e inténtalo de nuevo.",
    };
  }
  // Las páginas guardadas en el navegador se descartan: ahora dependen de la nueva sesión.
  revalidatePath("/", "layout");
  redirect(destino);
}

export async function cerrarSesionAccion(): Promise<void> {
  await cerrarSesion();
  revalidatePath("/", "layout");
  redirect("/login");
}
