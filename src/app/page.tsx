import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeftFromLineIcon, ArrowRightToLineIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LeyendaCeldas, MapaCeldas } from "@/components/mapa-celdas";
import { TablaVehiculosDentro } from "@/components/tabla-vehiculos-dentro";
import { TituloPagina } from "@/components/titulo-pagina";
import { RUTA_INICIO } from "@/modelos";
import { listarEstadoCeldas } from "@/repositorios/celdas";
import { listarVehiculosDentro } from "@/repositorios/registros";
import { exigirUsuario } from "@/servicios/autenticacion";
import { formatearFechaLarga } from "@/lib/formato";

// El panel es la página de inicio del operador. Toda la página espera a saber quién
// la abre: el administrador que llega aquí sigue hacia su propia página de inicio.
export default function PaginaPanel() {
  return (
    <Suspense fallback={<PanelCargando />}>
      <ContenidoPanel />
    </Suspense>
  );
}

async function ContenidoPanel() {
  const usuario = await exigirUsuario();
  if (usuario.rol !== "OPERADOR") redirect(RUTA_INICIO[usuario.rol]);

  const [celdas, dentro] = await Promise.all([listarEstadoCeldas(), listarVehiculosDentro()]);
  const ahora = new Date();

  return (
    <>
      <TituloPagina
        titulo="Panel"
        descripcion={`Ocupación del parqueadero, ${formatearFechaLarga(ahora)}`}
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
    </>
  );
}

function PanelCargando() {
  return (
    <>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-5 w-72 max-w-full" />
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <Skeleton className="h-[26rem] rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    </>
  );
}
