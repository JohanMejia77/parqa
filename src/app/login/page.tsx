import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FormularioLogin } from "@/components/formulario-login";
import { RUTA_INICIO } from "@/modelos";
import { obtenerUsuarioActual } from "@/servicios/autenticacion";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default function PaginaLogin() {
  return (
    <div className="flex flex-1 items-center justify-center pb-16">
      <Suspense fallback={null}>
        <SesionAbierta />
      </Suspense>
      <FormularioLogin />
    </div>
  );
}

/** Quien ya tiene la sesión abierta no necesita el formulario: va a su página de inicio. */
async function SesionAbierta() {
  const usuario = await obtenerUsuarioActual();
  if (usuario) redirect(RUTA_INICIO[usuario.rol]);
  return null;
}
