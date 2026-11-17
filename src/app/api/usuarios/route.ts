import { connection } from "next/server";
import { leerJson, respuestaError } from "@/app/api/respuestas";
import { obtenerUsuarioActual } from "@/servicios/autenticacion";
import { consultarUsuarios, crearUsuario } from "@/servicios/usuarios";

// GET /api/usuarios  -> cuentas registradas (200). Solo administrador.
export async function GET() {
  // La respuesta depende de quién pregunta: se calcula en cada petición, nunca al compilar.
  await connection();
  try {
    return Response.json(await consultarUsuarios(await obtenerUsuarioActual()));
  } catch (error) {
    return respuestaError(error);
  }
}

// POST /api/usuarios  { nombre, nombreUsuario, contrasena, rol }  -> crea la cuenta (201).
export async function POST(request: Request) {
  try {
    const actor = await obtenerUsuarioActual();
    const usuario = await crearUsuario(actor, await leerJson(request));
    return Response.json(usuario, { status: 201 });
  } catch (error) {
    return respuestaError(error);
  }
}
