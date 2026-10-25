import { Suspense } from "react";
import Link from "next/link";
import { io } from "next/cache";
import { ArrowLeftFromLineIcon, ArrowRightToLineIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LeyendaCeldas, MapaCeldas } from "@/components/mapa-celdas";
import { TablaVehiculosDentro } from "@/components/tabla-vehiculos-dentro";
import { TituloPagina } from "@/components/titulo-pagina";
import { listarEstadoCeldas } from "@/repositorios/celdas";
import { listarVehiculosDentro } from "@/repositorios/registros";
import { formatearFechaLarga } from "@/lib/formato";

export default function PaginaPanel() {
  return (
    <>
      <TituloPagina
        titulo="Panel"
        descripcion={
          <Suspense fallback="Ocupación del parqueadero">
            <Fecha />
          </Suspense>
        }
      >
        <Button size="lg" render={<Link href="/entrada" />} nativeButton={false}>
          <ArrowRightToLineIcon data-icon="inline-start" />
          Registrar entrada
        </Button>
        <Button size="lg" variant="outline" render={<Link href="/salida" />} nativeButton={false}>
          <ArrowLeftFromLineIcon data-icon="inline-start" />
          Registrar salida
        </Button>
      </TituloPagina>

      <Suspense fallback={<PanelCargando />}>
        <ContenidoPanel />
      </Suspense>
    </>
  );
}

async function Fecha() {
  await io();
  const hoy = formatearFechaLarga(new Date());
  return <>Ocupación del parqueadero, {hoy}</>;
}

async function ContenidoPanel() {
  await io();
  const [celdas, dentro] = await Promise.all([listarEstadoCeldas(), listarVehiculosDentro()]);
  const ahora = new Date();

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <Card>
        <CardHeader>
          <CardTitle>Celdas</CardTitle>
          <CardDescription>Disponibilidad en este momento.</CardDescription>
        </CardHeader>
        <CardContent>
          <MapaCeldas celdas={celdas} />
        </CardContent>
        <CardFooter className="border-t py-3">
          <LeyendaCeldas />
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vehículos dentro</CardTitle>
          <CardDescription>
            {dentro.length === 1 ? "1 vehículo" : `${dentro.length} vehículos`}, del que lleva más tiempo al más reciente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TablaVehiculosDentro registros={dentro} ahora={ahora} textoAccion="Salida" />
        </CardContent>
      </Card>
    </div>
  );
}

function PanelCargando() {
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <Skeleton className="h-[26rem] rounded-xl" />
      <Skeleton className="h-72 rounded-xl" />
    </div>
  );
}
