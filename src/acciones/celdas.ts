"use server";

import { revalidatePath } from "next/cache";
import { idDe } from "@/lib/parametros";
import { obtenerUsuarioActual } from "@/servicios/autenticacion";
import { crearCelda, editarCelda, eliminarCelda } from "@/servicios/celdas";
import { aEstado, type EstadoFormulario } from "./estado";

// Las celdas también se ven en el panel y en el formulario de entrada del operador:
// después de cada cambio se descartan todas las páginas guardadas.
function celdasCambiaron() {
  revalidatePath("/", "layout");
}

/** Un campo que no viene en el formulario (por ejemplo, un control deshabilitado) no se cambia. */
function campo(formData: FormData, nombre: string): unknown {
  return formData.get(nombre) ?? undefined;
}

export async function crearCeldaAccion(
  _estado: EstadoFormulario,
  formData: FormData
): Promise<EstadoFormulario> {
  try {
    const celda = await crearCelda(await obtenerUsuarioActual(), {
      codigo: campo(formData, "codigo"),
      tipo: campo(formData, "tipo"),
    });
    celdasCambiaron();
    return { exito: { id: celda.id, mensaje: `La celda ${celda.codigo} quedó creada y libre.` } };
  } catch (error) {
    return aEstado(error);
  }
}

export async function editarCeldaAccion(
  _estado: EstadoFormulario,
  formData: FormData
): Promise<EstadoFormulario> {
  try {
    const celda = await editarCelda(await obtenerUsuarioActual(), idDe(formData.get("id")), {
      codigo: campo(formData, "codigo"),
      tipo: campo(formData, "tipo"),
    });
    celdasCambiaron();
    return { exito: { id: celda.id, mensaje: `Los cambios de la celda ${celda.codigo} quedaron guardados.` } };
  } catch (error) {
    return aEstado(error);
  }
}

export async function eliminarCeldaAccion(
  _estado: EstadoFormulario,
  formData: FormData
): Promise<EstadoFormulario> {
  try {
    const celda = await eliminarCelda(await obtenerUsuarioActual(), idDe(formData.get("id")));
    celdasCambiaron();
    return { exito: { id: celda.id, mensaje: `La celda ${celda.codigo} se eliminó del catálogo.` } };
  } catch (error) {
    return aEstado(error);
  }
}
