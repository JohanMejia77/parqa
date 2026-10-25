"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRightToLineIcon, BikeIcon, CarFrontIcon, TriangleAlertIcon } from "lucide-react";
import { registrarEntradaAccion, type EstadoFormulario } from "@/acciones/registros";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { LeyendaCeldas, MapaCeldas } from "@/components/mapa-celdas";
import { NOMBRE_TIPO, normalizarPlaca, tipoSegunPlaca, type EstadoCelda } from "@/modelos";
import { cn } from "@/lib/utils";

/** HU-01 Registrar entrada: placa (el tipo se deduce de su formato) y celda libre. */
export function FormularioEntrada({ celdas }: { celdas: EstadoCelda[] }) {
  const [estado, accion, enviando] = useActionState<EstadoFormulario, FormData>(
    registrarEntradaAccion,
    {}
  );
  const [placa, setPlaca] = useState("");
  const [celdaElegidaId, setCeldaElegidaId] = useState<number | null>(null);
  // El error del servidor se oculta en cuanto el operador corrige algún dato.
  const [editadoTrasError, setEditadoTrasError] = useState(false);
  const placaRef = useRef<HTMLInputElement>(null);
  const celdaRef = useRef<HTMLButtonElement>(null);

  // Lleva el foco al campo que tiene el error.
  useEffect(() => {
    if (estado.campo === "placa") placaRef.current?.focus();
    if (estado.campo === "celda") celdaRef.current?.focus();
  }, [estado]);

  const tipo = tipoSegunPlaca(placa);
  const libres = celdas.filter((c) => c.tipo === tipo && !c.placaOcupante);
  // Se usa la celda que eligió el operador si sigue libre; si no, la primera libre.
  const celda = libres.find((c) => c.id === celdaElegidaId) ?? libres[0] ?? null;
  const yaDentro = celdas.find((c) => placa !== "" && c.placaOcupante === placa);

  const error = editadoTrasError ? undefined : estado.error;
  const errorPlaca = estado.campo === "placa" ? error : undefined;
  const errorCelda = estado.campo === "celda" ? error : undefined;
  const errorGeneral = !estado.campo ? error : undefined;

  function elegirCelda(celdaId: number) {
    setCeldaElegidaId(celdaId);
    setEditadoTrasError(true);
  }

  return (
    <form
      action={accion}
      onSubmit={() => setEditadoTrasError(false)}
      className="grid items-start gap-6 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)]"
    >
      <Card>
        <CardHeader>
          <CardTitle>Datos del vehículo</CardTitle>
          <CardDescription>Si la placa es nueva, el vehículo queda registrado al entrar.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field data-invalid={Boolean(errorPlaca) || undefined}>
              <FieldLabel htmlFor="placa">Placa</FieldLabel>
              <input
                ref={placaRef}
                id="placa"
                name="placa"
                value={placa}
                onChange={(e) => {
                  setPlaca(normalizarPlaca(e.target.value).slice(0, 6));
                  setEditadoTrasError(true);
                }}
                autoFocus
                autoComplete="off"
                spellCheck={false}
                placeholder="ABC123"
                aria-invalid={Boolean(errorPlaca) || undefined}
                aria-describedby="placa-ayuda"
                className="h-16 w-full max-w-72 rounded-lg border-2 border-placa-foreground bg-placa px-4 text-center font-placa text-4xl font-semibold tracking-[0.12em] text-placa-foreground uppercase outline-none placeholder:text-placa-foreground/35 focus-visible:ring-4 focus-visible:ring-ring/40 aria-invalid:border-destructive aria-invalid:ring-4 aria-invalid:ring-destructive/25"
              />
              <AyudaPlaca id="placa-ayuda" placa={placa} />
              <FieldError>{errorPlaca}</FieldError>
            </Field>

            {yaDentro && (
              <Alert>
                <TriangleAlertIcon />
                <AlertTitle>Este vehículo ya está dentro</AlertTitle>
                <AlertDescription>
                  Ocupa la celda {yaDentro.codigo}.{" "}
                  <Link href={`/salida?placa=${placa}`}>Registrar su salida</Link>
                </AlertDescription>
              </Alert>
            )}

            <Field data-invalid={Boolean(errorCelda) || undefined} data-disabled={!tipo || undefined}>
              <FieldLabel htmlFor="celda">Celda</FieldLabel>
              <Select
                name="celda"
                value={celda ? String(celda.id) : null}
                onValueChange={(valor) => elegirCelda(Number(valor))}
                items={libres.map((c) => ({ value: String(c.id), label: c.codigo }))}
                disabled={!tipo || libres.length === 0}
              >
                <SelectTrigger
                  ref={celdaRef}
                  id="celda"
                  className="w-full max-w-72"
                  aria-invalid={Boolean(errorCelda) || undefined}
                >
                  <SelectValue placeholder={tipo ? "Sin celdas libres" : "Escribe primero la placa"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {libres.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.codigo}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <FieldDescription>
                {tipo
                  ? libres.length > 0
                    ? `${libres.length} libres para ${NOMBRE_TIPO[tipo].toLowerCase()}s. También puedes elegirla en el plano.`
                    : `No hay celdas libres para ${NOMBRE_TIPO[tipo].toLowerCase()}s.`
                  : "Se muestran solo las celdas libres del tipo del vehículo."}
              </FieldDescription>
              <FieldError>{errorCelda}</FieldError>
            </Field>

            {errorGeneral && (
              <Alert variant="destructive">
                <TriangleAlertIcon />
                <AlertTitle>No se registró la entrada</AlertTitle>
                <AlertDescription>{errorGeneral}</AlertDescription>
              </Alert>
            )}
          </FieldGroup>
        </CardContent>
        <CardFooter className="border-t py-4">
          <Button type="submit" size="lg" disabled={enviando}>
            {enviando ? <Spinner data-icon="inline-start" /> : <ArrowRightToLineIcon data-icon="inline-start" />}
            {enviando ? "Registrando…" : "Registrar entrada"}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Plano de celdas</CardTitle>
          <CardDescription>
            {celda ? `Celda elegida: ${celda.codigo}` : "Elige una celda libre después de escribir la placa."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MapaCeldas
            celdas={celdas}
            tipos={tipo ? [tipo] : undefined}
            seleccionada={celda?.id ?? null}
            onSeleccionar={tipo ? elegirCelda : undefined}
          />
        </CardContent>
        <CardFooter className="border-t py-3">
          <LeyendaCeldas />
        </CardFooter>
      </Card>
    </form>
  );
}

function AyudaPlaca({ id, placa }: { id: string; placa: string }) {
  const tipo = tipoSegunPlaca(placa);
  const Icono = tipo === "MOTO" ? BikeIcon : CarFrontIcon;

  if (tipo) {
    return (
      <FieldDescription id={id} className="flex items-center gap-1.5 text-foreground">
        <Icono aria-hidden className="size-4" />
        {NOMBRE_TIPO[tipo]} detectado por el formato de la placa.
      </FieldDescription>
    );
  }
  return (
    <FieldDescription id={id} className={cn(placa.length >= 6 && "text-destructive")}>
      {placa.length >= 6
        ? "Formato no válido. Carros: 3 letras y 3 números. Motos: 3 letras, 2 números y 1 letra."
        : "Carros: ABC123 · Motos: ABC12D"}
    </FieldDescription>
  );
}
