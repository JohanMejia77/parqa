import { leerJson, respuestaError } from "@/app/api/respuestas";
import { textoDe } from "@/lib/parametros";
import { buscarRegistroPorId } from "@/repositorios/registros";
import { obtenerUsuarioActual } from "@/servicios/autenticacion";
import { registrarSalida } from "@/servicios/parqueadero";

// POST /api/salidas  { placa }  -> registra la salida y libera la celda (200). Solo operador.
export async function POST(request: Request) {
  try {
    const actor = await obtenerUsuarioActual();
    const { placa } = await leerJson(request);
    const registroId = await registrarSalida(actor, textoDe(placa));
    return Response.json(await buscarRegistroPorId(registroId));
  } catch (error) {
    return respuestaError(error);
  }
}
