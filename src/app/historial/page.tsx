import { Suspense } from "react";
import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { io } from "next/cache";
import { HistoryIcon, SearchIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Placa } from "@/components/placa";
import { TituloPagina } from "@/components/titulo-pagina";
import { NOMBRE_TIPO, normalizarPlaca, permanencia } from "@/modelos";
import { listarHistorial } from "@/repositorios/registros";
import { formatearDuracion, formatearFechaHora } from "@/lib/formato";
import { textoParametro } from "@/lib/parametros";

export const metadata: Metadata = { title: "Historial" };

const LIMITE = 100;

export default function PaginaHistorial({ searchParams }: PageProps<"/historial">) {
  return (
    <>
      <TituloPagina titulo="Historial" descripcion="Entradas y salidas registradas, de la más reciente a la más antigua." />
      <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
        <ContenidoHistorial searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function ContenidoHistorial({ searchParams }: Pick<PageProps<"/historial">, "searchParams">) {
  await io();
  const placa = normalizarPlaca(textoParametro((await searchParams).placa));
  const registros = await listarHistorial(placa, LIMITE);
  const ahora = new Date();

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>Movimientos</CardTitle>
        <CardDescription>
          {placa
            ? `${registros.length} movimientos de placas que contienen “${placa}”.`
            : `Últimos ${Math.min(registros.length, LIMITE)} movimientos.`}
        </CardDescription>
        <Form key={placa} action="/historial" className="col-span-full flex flex-wrap items-end gap-2 pt-2">
          <Field className="w-auto">
            <FieldLabel htmlFor="placa">Filtrar por placa</FieldLabel>
            <Input
              id="placa"
              name="placa"
              defaultValue={placa}
              placeholder="Ej. ABC123…"
              autoComplete="off"
              className="w-48 uppercase"
            />
          </Field>
          <Button type="submit" variant="outline">
            <SearchIcon data-icon="inline-start" />
            Filtrar
          </Button>
          {placa && (
            <Button variant="ghost" render={<Link href="/historial" />} nativeButton={false}>
              Quitar filtro
            </Button>
          )}
        </Form>
      </CardHeader>
      <CardContent>
        {registros.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <HistoryIcon />
              </EmptyMedia>
              <EmptyTitle>Sin movimientos</EmptyTitle>
              <EmptyDescription>
                {placa ? "Ninguna placa registrada coincide con el filtro." : "Aún no se ha registrado ninguna entrada."}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Placa</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Celda</TableHead>
                <TableHead>Entrada</TableHead>
                <TableHead>Salida</TableHead>
                <TableHead>Permanencia</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {registros.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <Placa placa={r.placa} />
                  </TableCell>
                  <TableCell>{NOMBRE_TIPO[r.tipo]}</TableCell>
                  <TableCell className="font-medium">{r.codigoCelda}</TableCell>
                  <TableCell>{formatearFechaHora(r.fechaEntrada)}</TableCell>
                  <TableCell>
                    {r.fechaSalida ? formatearFechaHora(r.fechaSalida) : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatearDuracion(permanencia(r, ahora))}
                  </TableCell>
                  <TableCell>
                    {r.fechaSalida ? (
                      <Badge variant="secondary">Finalizado</Badge>
                    ) : (
                      <Badge>Dentro</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
