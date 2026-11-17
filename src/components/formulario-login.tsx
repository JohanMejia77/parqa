"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { LogInIcon, TriangleAlertIcon } from "lucide-react";
import type { EstadoFormulario } from "@/acciones/estado";
import { iniciarSesionAccion } from "@/acciones/sesion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { CampoContrasena } from "@/components/campo-contrasena";

/** HU-06 Iniciar sesión con usuario y contraseña. */
export function FormularioLogin() {
  const [estado, accion, enviando] = useActionState<EstadoFormulario, FormData>(
    iniciarSesionAccion,
    {}
  );
  // El usuario se conserva tras un intento fallido; la contraseña se vuelve a pedir.
  const [nombreUsuario, setNombreUsuario] = useState("");
  const usuarioRef = useRef<HTMLInputElement>(null);
  const contrasenaRef = useRef<HTMLInputElement>(null);

  // Lleva el foco al campo que hay que corregir.
  useEffect(() => {
    if (!estado.error) return;
    if (estado.campo === "nombreUsuario") usuarioRef.current?.focus();
    else contrasenaRef.current?.focus();
  }, [estado]);

  const errorUsuario = estado.campo === "nombreUsuario" ? estado.error : undefined;
  const errorContrasena = estado.campo === "contrasena" ? estado.error : undefined;
  const errorGeneral = !estado.campo ? estado.error : undefined;

  return (
    <Card className="aparece w-full max-w-sm">
      <form action={accion} className="contents">
        <CardHeader>
          <h1 className="font-heading text-xl leading-snug font-semibold tracking-tight">
            Iniciar sesión
          </h1>
          <CardDescription>Entra con la cuenta que te dio el administrador.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field data-invalid={Boolean(errorUsuario) || undefined}>
              <FieldLabel htmlFor="nombreUsuario">Usuario</FieldLabel>
              <Input
                ref={usuarioRef}
                id="nombreUsuario"
                name="nombreUsuario"
                value={nombreUsuario}
                onChange={(e) => setNombreUsuario(e.target.value)}
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="next"
                autoFocus
                required
                aria-invalid={Boolean(errorUsuario) || undefined}
                className="h-10"
              />
              <FieldError>{errorUsuario}</FieldError>
            </Field>

            <Field data-invalid={Boolean(errorContrasena) || undefined}>
              <FieldLabel htmlFor="contrasena">Contraseña</FieldLabel>
              <CampoContrasena
                ref={contrasenaRef}
                id="contrasena"
                name="contrasena"
                autoComplete="current-password"
                enterKeyHint="done"
                required
                aria-invalid={Boolean(errorContrasena) || undefined}
                className="h-10"
              />
              <FieldError>{errorContrasena}</FieldError>
            </Field>

            {errorGeneral && (
              <Alert variant="destructive">
                <TriangleAlertIcon />
                <AlertTitle>No se inició la sesión</AlertTitle>
                <AlertDescription>{errorGeneral}</AlertDescription>
              </Alert>
            )}
          </FieldGroup>
        </CardContent>
        <CardFooter className="flex-col items-stretch gap-3 py-4">
          <Button type="submit" size="lg" disabled={enviando} className="h-10">
            {enviando ? <Spinner data-icon="inline-start" /> : <LogInIcon data-icon="inline-start" />}
            {enviando ? "Entrando…" : "Iniciar sesión"}
          </Button>
          <p className="text-center text-sm text-pretty text-muted-foreground">
            ¿Olvidaste tu contraseña o no tienes cuenta? Habla con el administrador del parqueadero.
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
