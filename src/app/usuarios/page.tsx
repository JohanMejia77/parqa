import { Suspense } from "react";
import type { Metadata } from "next";
import { Skeleton } from "@/components/ui/skeleton";
import { GestionUsuarios } from "@/components/gestion-usuarios";
import { SinPermiso } from "@/components/sin-permiso";
import { TituloPagina } from "@/components/titulo-pagina";
import { formatearFecha } from "@/lib/formato";
import { exigirUsuario } from "@/servicios/autenticacion";
import { consultarUsuarios } from "@/servicios/usuarios";

export const metadata: Metadata = { title: "Usuarios" };

const TITULO = {
  titulo: "Usuarios",
  descripcion: "Cuentas con acceso al sistema y el rol de cada una.",
};

export default function PaginaUsuarios() {
  return (
    <Suspense
      fallback={
        <>
          <TituloPagina {...TITULO} />
          <Skeleton className="h-72 rounded-xl" />
        </>
      }
    >
      <ContenidoUsuarios />
    </Suspense>
  );
}

async function ContenidoUsuarios() {
  const usuario = await exigirUsuario();
  if (usuario.rol !== "ADMINISTRADOR") {
    return (
      <>
        <TituloPagina {...TITULO} />
        <SinPermiso usuario={usuario} />
      </>
    );
  }

  const usuarios = await consultarUsuarios(usuario);

  return (
    <GestionUsuarios
      idActual={usuario.id}
      // La fecha se escribe aquí, en el servidor, para que se vea igual en cualquier navegador.
      usuarios={usuarios.map(({ id, nombre, nombreUsuario, rol, creadoEn }) => ({
        id,
        nombre,
        nombreUsuario,
        rol,
        creado: formatearFecha(creadoEn),
      }))}
    />
  );
}
