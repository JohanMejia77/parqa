import { leerJson, respuestaError } from "@/app/api/respuestas";
import { idDe, textoDe } from "@/lib/parametros";
import { buscarRegistroPorId } from "@/repositorios/registros";
import { obtenerUsuarioActual } from "@/servicios/autenticacion";
import { registrarEntrada } from "@/servicios/parqueadero";

// POST /api/entradas  { placa, celdaId }  -> registra la entrada (201). Solo operador.
export async function POST(request: Request) {
  try {
    const actor = await obtenerUsuarioActual();
    const { placa, celdaId } = await leerJson(request);
    const registroId = await registrarEntrada(actor, textoDe(placa), idDe(celdaId));
    return Response.json(await buscarRegistroPorId(registroId), { status: 201 });
  } catch (error) {
    return respuestaError(error);
  }
}
