import { connection } from "next/server";
import { leerJson, respuestaError } from "@/app/api/respuestas";
import { ErrorNegocio } from "@/modelos";
import { cerrarSesion, iniciarSesion, obtenerUsuarioActual } from "@/servicios/autenticacion";

// POST /api/sesion  { nombreUsuario, contrasena }  -> inicia sesión (200) y entrega la cookie.
export async function POST(request: Request) {
  try {
    const { nombreUsuario, contrasena } = await leerJson(request);
    return Response.json(await iniciarSesion(nombreUsuario, contrasena));
  } catch (error) {
    return respuestaError(error);
  }
}

// GET /api/sesion  -> usuario de la sesión actual (200) o 401 si no hay sesión válida.
export async function GET() {
  // La respuesta depende de quién pregunta: se calcula en cada petición, nunca al compilar.
  await connection();
  try {
    const usuario = await obtenerUsuarioActual();
    if (!usuario) {
      throw new ErrorNegocio("Inicia sesión para continuar.", { motivo: "no_autenticado" });
    }
    return Response.json(usuario);
  } catch (error) {
    return respuestaError(error);
  }
}

// DELETE /api/sesion  -> cierra la sesión (204). El token anterior deja de servir.
export async function DELETE() {
  try {
    await cerrarSesion();
    return new Response(null, { status: 204 });
  } catch (error) {
    return respuestaError(error);
  }
}
