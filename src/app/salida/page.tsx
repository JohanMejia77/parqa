import { Suspense } from "react";
import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { io } from "next/cache";
import { CircleCheckIcon, SearchIcon, SearchXIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmarSalida } from "@/components/confirmar-salida";
import { Placa } from "@/components/placa";
import { TablaVehiculosDentro } from "@/components/tabla-vehiculos-dentro";
import { TituloPagina } from "@/components/titulo-pagina";
import { NOMBRE_TIPO, normalizarPlaca, permanencia, type RegistroDetalle } from "@/modelos";
import { buscarRegistroDentro, buscarRegistroPorId, listarVehiculosDentro } from "@/repositorios/registros";
import { formatearDuracion, formatearHora } from "@/lib/formato";
import { idParametro, textoParametro } from "@/lib/parametros";

export const metadata: Metadata = { title: "Registrar salida" };

export default function PaginaSalida({ searchParams }: PageProps<"/salida">) {
  return (
    <>
      <TituloPagina
        titulo="Registrar salida"
        descripcion="Busca el vehículo por su placa o elígelo de la lista, y confirma la salida."
      />
      <Suspense fallback={<SalidaCargando />}>
        <ContenidoSalida searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function ContenidoSalida({ searchParams }: Pick<PageProps<"/salida">, "searchParams">) {
  await io();
  const parametros = await searchParams;
  const placa = normalizarPlaca(textoParametro(parametros.placa));
  const registroId = idParametro(parametros.registro);

  const [cerrado, encontrado, dentro] = await Promise.all([
    registroId ? buscarRegistroPorId(registroId) : null,
    placa ? buscarRegistroDentro(placa) : null,
    listarVehiculosDentro(),
  ]);
  const ahora = new Date();

  return (
    <>
      {cerrado?.fechaSalida && (
        <Alert className="border-exito/40 bg-exito/5">
          <CircleCheckIcon className="text-exito" />
          <AlertTitle className="flex flex-wrap items-center gap-2">
            Salida registrada
            <Placa placa={cerrado.placa} />
          </AlertTitle>
          <AlertDescription>
            Celda {cerrado.codigoCelda} liberada. Entró a las {formatearHora(cerrado.fechaEntrada)} y salió a
            las {formatearHora(cerrado.fechaSalida)}: {formatearDuracion(permanencia(cerrado, ahora))} en
            el parqueadero.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Buscar vehículo</CardTitle>
            <CardDescription>Escribe la placa tal como aparece en el vehículo.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <Form key={placa} action="/salida" className="flex flex-wrap items-end gap-3">
              <Field className="w-auto">
                <FieldLabel htmlFor="placa">Placa</FieldLabel>
                <input
                  id="placa"
                  name="placa"
                  defaultValue={placa}
                  autoFocus={!placa}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="ABC123"
                  required
                  className="h-12 w-48 rounded-lg border-2 border-placa-foreground bg-placa px-3 text-center font-placa text-3xl font-semibold tracking-[0.12em] text-placa-foreground uppercase outline-none placeholder:text-placa-foreground/35 focus-visible:ring-4 focus-visible:ring-ring/40"
                />
              </Field>
              <Button type="submit" size="lg" variant="outline" className="h-12">
                <SearchIcon data-icon="inline-start" />
                Buscar
              </Button>
            </Form>

            {placa && !encontrado && (
              <Alert>
                <SearchXIcon />
                <AlertTitle>{placa} no está dentro del parqueadero</AlertTitle>
                <AlertDescription>
                  Revisa la placa o búscala en el <Link href={`/historial?placa=${placa}`}>historial</Link>.
                </AlertDescription>
              </Alert>
            )}

            {encontrado && (
              <>
                <Separator />
                <DetalleVehiculo registro={encontrado} ahora={ahora} />
                <ConfirmarSalida placa={encontrado.placa} />
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vehículos dentro</CardTitle>
            <CardDescription>Elige un vehículo para ver sus datos antes de confirmar.</CardDescription>
          </CardHeader>
          <CardContent>
            <TablaVehiculosDentro
              registros={dentro}
              ahora={ahora}
              textoAccion="Elegir"
              placaSeleccionada={encontrado?.placa}
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function DetalleVehiculo({ registro, ahora }: { registro: RegistroDetalle; ahora: Date }) {
  const datos = [
    ["Tipo", NOMBRE_TIPO[registro.tipo]],
    ["Celda", registro.codigoCelda],
    ["Entrada", formatearHora(registro.fechaEntrada)],
    ["Tiempo dentro", formatearDuracion(permanencia(registro, ahora))],
  ];

  return (
    <div className="flex flex-col gap-4">
      <Placa placa={registro.placa} tamano="lg" className="self-start" />
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
        {datos.map(([etiqueta, valor]) => (
          <div key={etiqueta} className="flex flex-col gap-0.5">
            <dt className="text-sm text-muted-foreground">{etiqueta}</dt>
            <dd className="text-base font-medium tabular-nums">{valor}</dd>
          </div>
        ))}
      </dl>
      <FieldDescription>La hora de salida se toma del servidor al confirmar.</FieldDescription>
    </div>
  );
}

function SalidaCargando() {
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <Skeleton className="h-64 rounded-xl" />
      <Skeleton className="h-72 rounded-xl" />
    </div>
  );
}
