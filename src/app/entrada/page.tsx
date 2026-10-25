import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { io } from "next/cache";
import { CircleCheckIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { FormularioEntrada } from "@/components/formulario-entrada";
import { Placa } from "@/components/placa";
import { TituloPagina } from "@/components/titulo-pagina";
import { listarEstadoCeldas } from "@/repositorios/celdas";
import { buscarRegistroPorId } from "@/repositorios/registros";
import { formatearHora } from "@/lib/formato";
import { idParametro } from "@/lib/parametros";

export const metadata: Metadata = { title: "Registrar entrada" };

export default function PaginaEntrada({ searchParams }: PageProps<"/entrada">) {
  return (
    <>
      <TituloPagina
        titulo="Registrar entrada"
        descripcion="Escribe la placa, confirma la celda y registra la hora de entrada."
      />
      <Suspense fallback={<EntradaCargando />}>
        <ContenidoEntrada searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function ContenidoEntrada({ searchParams }: Pick<PageProps<"/entrada">, "searchParams">) {
  await io();
  const registroId = idParametro((await searchParams).registro);
  const [celdas, registrada] = await Promise.all([
    listarEstadoCeldas(),
    registroId ? buscarRegistroPorId(registroId) : null,
  ]);

  return (
    <>
      {registrada && (
        <Alert className="border-exito/40 bg-exito/5">
          <CircleCheckIcon className="text-exito" />
          <AlertTitle className="flex flex-wrap items-center gap-2">
            Entrada registrada
            <Placa placa={registrada.placa} />
          </AlertTitle>
          <AlertDescription>
            Celda {registrada.codigoCelda} · Hora de entrada: {formatearHora(registrada.fechaEntrada)} ·{" "}
            <Link href="/">Ver el panel</Link>
          </AlertDescription>
        </Alert>
      )}
      {/* La key reinicia el formulario después de cada registro exitoso. */}
      <FormularioEntrada key={registroId ?? "nuevo"} celdas={celdas} />
    </>
  );
}

function EntradaCargando() {
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)]">
      <Skeleton className="h-96 rounded-xl" />
      <Skeleton className="h-96 rounded-xl" />
    </div>
  );
}
