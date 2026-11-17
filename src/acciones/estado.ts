import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { ErrorNegocio } from "@/modelos";
import { esDatoNoAdmitido } from "@/repositorios/db";

/** Lo que una acción le devuelve al formulario que la envió. */
export interface EstadoFormulario {
  error?: string;
  /** Campo al que corresponde el error; si falta, el error es general. */
  campo?: string;
  /** Operación terminada sin cambiar de página (formularios dentro de un diálogo). */
  exito?: { id: number; mensaje: string };
}

/** Convierte el error de un servicio en el estado que muestra el formulario. */
export function aEstado(error: unknown): EstadoFormulario {
  if (error instanceof ErrorNegocio) {
    // La sesión expiró o se cerró en otra pestaña: hay que iniciar sesión de nuevo.
    if (error.motivo === "no_autenticado") redirect("/login");
    // Los datos en pantalla pueden estar desactualizados (p. ej. otra persona ocupó la celda):
    // se vuelve a cargar la página para mostrar el estado real.
    refresh();
    return { error: error.message, campo: error.campo };
  }
  if (esDatoNoAdmitido(error)) {
    return {
      error: "Uno de los datos tiene caracteres que no se pueden guardar. Revísalo e inténtalo de nuevo.",
    };
  }
  console.error(error);
  return {
    error: "No se pudo guardar. Verifica que PostgreSQL esté encendido e inténtalo de nuevo.",
  };
}
