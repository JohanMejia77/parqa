"use server";

import { refresh, revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ErrorNegocio } from "@/modelos";
import { registrarEntrada, registrarSalida } from "@/servicios/parqueadero";

// Controladores: reciben los datos del formulario, llaman al servicio y deciden la respuesta.

export interface EstadoFormulario {
  error?: string;
  campo?: "placa" | "celda";
}

export async function registrarEntradaAccion(
  _estado: EstadoFormulario,
  formData: FormData
): Promise<EstadoFormulario> {
  let registroId: number;
  try {
    registroId = await registrarEntrada(
      String(formData.get("placa") ?? ""),
      Number(formData.get("celda")) || null
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
    registroId = await registrarSalida(String(formData.get("placa") ?? ""));
  } catch (error) {
    return aEstado(error);
  }
  revalidatePath("/", "layout");
  redirect(`/salida?registro=${registroId}`);
}

function aEstado(error: unknown): EstadoFormulario {
  if (error instanceof ErrorNegocio) {
    // Los datos en pantalla pueden estar desactualizados (p. ej. otra persona ocupó la celda):
    // se vuelve a cargar la página para mostrar el estado real.
    refresh();
    return { error: error.message, campo: error.campo };
  }
  console.error(error);
  return {
    error: "No se pudo guardar. Verifica que PostgreSQL esté encendido e inténtalo de nuevo.",
  };
}
