import { connection } from "next/server";
import { leerJson, respuestaError } from "@/app/api/respuestas";
import { idDe } from "@/lib/parametros";
import { obtenerUsuarioActual } from "@/servicios/autenticacion";
import { consultarCelda, editarCelda, eliminarCelda } from "@/servicios/celdas";

type Contexto = RouteContext<"/api/celdas/[id]">;

// GET /api/celdas/12  -> la celda con su ocupación y movimientos (200) o 404 si no existe.
export async function GET(_request: Request, { params }: Contexto) {
  // La respuesta depende de quién pregunta: se calcula en cada petición, nunca al compilar.
  await connection();
  try {
    const { id } = await params;
    return Response.json(await consultarCelda(await obtenerUsuarioActual(), idDe(id)));
  } catch (error) {
    return respuestaError(error);
  }
}

// PATCH /api/celdas/12  { codigo?, tipo? }  -> cambia solo lo que se envía (200).
export async function PATCH(request: Request, { params }: Contexto) {
  try {
    const { id } = await params;
    const actor = await obtenerUsuarioActual();
    return Response.json(await editarCelda(actor, idDe(id), await leerJson(request)));
  } catch (error) {
    return respuestaError(error);
  }
}

// DELETE /api/celdas/12  -> elimina la celda (204); 409 si está ocupada o tiene historial.
export async function DELETE(_request: Request, { params }: Contexto) {
  try {
    const { id } = await params;
    await eliminarCelda(await obtenerUsuarioActual(), idDe(id));
    return new Response(null, { status: 204 });
  } catch (error) {
    return respuestaError(error);
  }
}
