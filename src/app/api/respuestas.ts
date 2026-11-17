import "server-only";
import { ErrorNegocio, type MotivoError } from "@/modelos";
import { esDatoNoAdmitido } from "@/repositorios/db";

// Utilidades de la API REST (src/app/api): leer el cuerpo JSON y responder los errores.

const ESTADO_HTTP: Record<MotivoError, number> = {
  invalido: 422,
  no_autenticado: 401,
  sin_permiso: 403,
  no_encontrado: 404,
  conflicto: 409,
};

/** Convierte un error en la respuesta JSON de la API: { error, campo? } con su código HTTP. */
export function respuestaError(error: unknown): Response {
  if (error instanceof ErrorNegocio) {
    return Response.json(
      { error: error.message, campo: error.campo },
      { status: ESTADO_HTTP[error.motivo] }
    );
  }
  if (esDatoNoAdmitido(error)) {
    return Response.json(
      { error: "Uno de los datos tiene caracteres que no se pueden guardar. Revísalo e inténtalo de nuevo." },
      { status: 422 }
    );
  }
  // Error inesperado (por ejemplo, PostgreSQL apagado): el detalle queda en el servidor.
  console.error(error);
  return Response.json(
    { error: "No se pudo completar la operación. Inténtalo de nuevo." },
    { status: 500 }
  );
}

/** Lee el cuerpo de la petición, que debe ser un objeto JSON: { "codigo": "A-21", ... }. */
export async function leerJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const cuerpo: unknown = await request.json();
    if (cuerpo !== null && typeof cuerpo === "object" && !Array.isArray(cuerpo)) {
      return cuerpo as Record<string, unknown>;
    }
  } catch {
    // Un cuerpo vacío o mal escrito se rechaza igual que uno con otro formato.
  }
  throw new ErrorNegocio("El cuerpo de la petición debe ser un objeto JSON.");
}
