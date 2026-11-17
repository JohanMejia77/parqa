import { Suspense } from "react";
import type { Metadata } from "next";
import { Skeleton } from "@/components/ui/skeleton";
import { GestionCeldas } from "@/components/gestion-celdas";
import { SinPermiso } from "@/components/sin-permiso";
import { TituloPagina } from "@/components/titulo-pagina";
import { textoParametro } from "@/lib/parametros";
import { esTipoVehiculo, limpiarCodigoCelda } from "@/modelos";
import { exigirUsuario } from "@/servicios/autenticacion";
import { consultarCeldas } from "@/servicios/celdas";

export const metadata: Metadata = { title: "Celdas" };

const TITULO = {
  titulo: "Celdas",
  descripcion: "Catálogo de los espacios del parqueadero.",
};

export default function PaginaCeldas({ searchParams }: PageProps<"/celdas">) {
  return (
    <Suspense
      fallback={
        <>
          <TituloPagina {...TITULO} />
          <Skeleton className="h-96 rounded-xl" />
        </>
      }
    >
      <ContenidoCeldas searchParams={searchParams} />
    </Suspense>
  );
}

async function ContenidoCeldas({ searchParams }: Pick<PageProps<"/celdas">, "searchParams">) {
  const usuario = await exigirUsuario();
  if (usuario.rol !== "ADMINISTRADOR") {
    return (
      <>
        <TituloPagina {...TITULO} />
        <SinPermiso usuario={usuario} />
      </>
    );
  }

  // Los filtros llegan en la dirección (/celdas?buscar=A-0&tipo=CARRO); un valor extraño se ignora.
  const parametros = await searchParams;
  const buscar = limpiarCodigoCelda(textoParametro(parametros.buscar));
  const tipoPedido = textoParametro(parametros.tipo);
  const tipo = esTipoVehiculo(tipoPedido) ? tipoPedido : null;

  const celdas = await consultarCeldas(usuario, { buscar, tipo: tipo ?? undefined });

  // La key reinicia avisos y diálogos cuando cambia la búsqueda.
  return <GestionCeldas key={`${buscar}|${tipo}`} celdas={celdas} buscar={buscar} tipo={tipo} />;
}
