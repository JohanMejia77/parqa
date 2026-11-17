import { connection, type NextRequest } from "next/server";
import { respuestaError } from "@/app/api/respuestas";
import { obtenerUsuarioActual } from "@/servicios/autenticacion";
import { consultarCeldasDisponibles } from "@/servicios/celdas";

// GET /api/celdas/disponibles?tipo=MOTO  -> celdas libres para asignar (200). Solo operador.
// Es una consulta: no reserva ninguna celda.
export async function GET(request: NextRequest) {
  // La respuesta depende de quién pregunta: se calcula en cada petición, nunca al compilar.
  await connection();
  try {
    const tipo = request.nextUrl.searchParams.get("tipo") ?? undefined;
    return Response.json(await consultarCeldasDisponibles(await obtenerUsuarioActual(), tipo));
  } catch (error) {
    return respuestaError(error);
  }
}
