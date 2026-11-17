"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { idDe, textoDe } from "@/lib/parametros";
import { obtenerUsuarioActual } from "@/servicios/autenticacion";
import { registrarEntrada, registrarSalida } from "@/servicios/parqueadero";
import { aEstado, type EstadoFormulario } from "./estado";

// Controladores: reciben los datos del formulario, llaman al servicio y deciden la respuesta.
// El servicio comprueba que quien envía el formulario sea un operador con sesión abierta.

export async function registrarEntradaAccion(
  _estado: EstadoFormulario,
  formData: FormData
): Promise<EstadoFormulario> {
  let registroId: number;
  try {
    registroId = await registrarEntrada(
      await obtenerUsuarioActual(),
      textoDe(formData.get("placa")),
      idDe(formData.get("celda"))
    );
  } catch (error) {
    return aEstado(error);
  }
  revalidatePath("/", "layout");
  redirect(`/entrada?registro=${registroId}`);
}

export async function registrarSalidaAccion(
  _estado: EstadoFormulario,
  formData: FormData
): Promise<EstadoFormulario> {
  let registroId: number;
  try {
    registroId = await registrarSalida(await obtenerUsuarioActual(), textoDe(formData.get("placa")));
  } catch (error) {
    return aEstado(error);
  }
  revalidatePath("/", "layout");
  redirect(`/salida?registro=${registroId}`);
}
