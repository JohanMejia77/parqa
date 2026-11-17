import { connection, type NextRequest } from "next/server";
import { leerJson, respuestaError } from "@/app/api/respuestas";
import { obtenerUsuarioActual } from "@/servicios/autenticacion";
import { consultarCeldas, crearCelda } from "@/servicios/celdas";

// GET /api/celdas?buscar=A-0&tipo=CARRO  -> catálogo de celdas (200). Solo administrador.
export async function GET(request: NextRequest) {
  // La respuesta depende de quién pregunta: se calcula en cada petición, nunca al compilar.
  await connection();
  try {
    const parametros = request.nextUrl.searchParams;
    const celdas = await consultarCeldas(await obtenerUsuarioActual(), {
      buscar: parametros.get("buscar") ?? undefined,
      tipo: parametros.get("tipo") ?? undefined,
    });
    return Response.json(celdas);
  } catch (error) {
    return respuestaError(error);
  }
}

// POST /api/celdas  { codigo, tipo }  -> crea la celda (201).
export async function POST(request: Request) {
  try {
    const actor = await obtenerUsuarioActual();
    const celda = await crearCelda(actor, await leerJson(request));
    return Response.json(celda, { status: 201 });
  } catch (error) {
    return respuestaError(error);
  }
}
