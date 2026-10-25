"use client";

import { useActionState } from "react";
import { ArrowLeftFromLineIcon, TriangleAlertIcon } from "lucide-react";
import { registrarSalidaAccion, type EstadoFormulario } from "@/acciones/registros";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

/** Botón que confirma la salida del vehículo (HU-02). */
export function ConfirmarSalida({ placa }: { placa: string }) {
  const [estado, accion, enviando] = useActionState<EstadoFormulario, FormData>(
    registrarSalidaAccion,
    {}
  );

  return (
    <form action={accion} className="flex flex-col gap-3">
      <input type="hidden" name="placa" value={placa} />
      {estado.error && (
        <Alert variant="destructive">
          <TriangleAlertIcon />
          <AlertTitle>No se registró la salida</AlertTitle>
          <AlertDescription>{estado.error}</AlertDescription>
        </Alert>
      )}
      <Button type="submit" size="lg" disabled={enviando} className="self-start">
        {enviando ? <Spinner data-icon="inline-start" /> : <ArrowLeftFromLineIcon data-icon="inline-start" />}
        {enviando ? "Registrando…" : "Confirmar salida"}
      </Button>
    </form>
  );
}
