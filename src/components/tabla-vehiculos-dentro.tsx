import Link from "next/link";
import { ArrowLeftFromLineIcon, ArrowRightToLineIcon, CarFrontIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Placa } from "@/components/placa";
import { NOMBRE_TIPO, permanencia, type RegistroDetalle } from "@/modelos";
import { formatearDuracion, formatearHora } from "@/lib/formato";

/** HU-03 Vehículos dentro del parqueadero, con acceso directo a registrar su salida. */
export function TablaVehiculosDentro({
  registros,
  ahora,
  textoAccion = "Registrar salida",
  placaSeleccionada,
}: {
  registros: RegistroDetalle[];
  ahora: Date;
  textoAccion?: string;
  placaSeleccionada?: string;
}) {
  if (registros.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CarFrontIcon />
          </EmptyMedia>
          <EmptyTitle>No hay vehículos dentro</EmptyTitle>
          <EmptyDescription>Cuando registres una entrada, el vehículo aparecerá aquí.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button render={<Link href="/entrada" />} nativeButton={false}>
            <ArrowRightToLineIcon data-icon="inline-start" />
            Registrar entrada
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Placa</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead>Celda</TableHead>
          <TableHead>Entrada</TableHead>
          <TableHead>Tiempo</TableHead>
          <TableHead>
            <span className="sr-only">Acción</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {registros.map((r) => (
          <TableRow key={r.id} data-state={r.placa === placaSeleccionada ? "selected" : undefined}>
            <TableCell>
              <Placa placa={r.placa} />
            </TableCell>
            <TableCell>{NOMBRE_TIPO[r.tipo]}</TableCell>
            <TableCell className="font-medium">{r.codigoCelda}</TableCell>
            <TableCell>{formatearHora(r.fechaEntrada)}</TableCell>
            <TableCell className="text-muted-foreground">
              {formatearDuracion(permanencia(r, ahora))}
            </TableCell>
            <TableCell className="text-right">
              <Button
                variant="outline"
                size="sm"
                render={<Link href={`/salida?placa=${r.placa}`} />}
                nativeButton={false}
              >
                <ArrowLeftFromLineIcon data-icon="inline-start" />
                {textoAccion}
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
