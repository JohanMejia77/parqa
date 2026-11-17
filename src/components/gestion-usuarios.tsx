"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { ShieldCheckIcon, TriangleAlertIcon, UserPlusIcon, UserRoundIcon } from "lucide-react";
import type { EstadoFormulario } from "@/acciones/estado";
import { crearUsuarioAccion } from "@/acciones/usuarios";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialogo, DialogoAcciones, DialogoCuerpo } from "@/components/ui/dialogo";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AvisoExito } from "@/components/aviso-exito";
import { CampoContrasena } from "@/components/campo-contrasena";
import { GrupoOpciones, type Opcion } from "@/components/grupo-opciones";
import { TablaAdaptable } from "@/components/tabla-adaptable";
import { TituloPagina } from "@/components/titulo-pagina";
import {
  LARGO_MAXIMO_CONTRASENA,
  LARGO_MINIMO_CONTRASENA,
  NOMBRE_ROL,
  type Rol,
} from "@/modelos";
import { cn } from "@/lib/utils";

/** Cuenta tal como se muestra en la tabla; la fecha llega ya escrita desde el servidor. */
export interface FilaUsuario {
  id: number;
  nombre: string;
  nombreUsuario: string;
  rol: Rol;
  creado: string;
}

const ROLES: Opcion<Rol>[] = [
  {
    valor: "OPERADOR",
    etiqueta: "Operador",
    descripcion: "Registra entradas y salidas y consulta el parqueadero.",
    icono: UserRoundIcon,
  },
  {
    valor: "ADMINISTRADOR",
    etiqueta: "Administrador",
    descripcion: "Crea usuarios y gestiona las celdas.",
    icono: ShieldCheckIcon,
  },
];

type Exito = NonNullable<EstadoFormulario["exito"]>;

function cantidad(n: number, singular: string, plural: string): string {
  return n === 1 ? `1 ${singular}` : `${n} ${plural}`;
}

/** Gestión de usuarios del administrador: crear cuentas (HU-09) y consultarlas (HU-10). */
export function GestionUsuarios({
  usuarios,
  idActual,
}: {
  usuarios: FilaUsuario[];
  /** Cuenta con la que se inició sesión, para señalarla en la lista. */
  idActual: number;
}) {
  // Cada vez que se abre el diálogo cambia su `clave`, para que el formulario empiece limpio.
  const [clave, setClave] = useState(0);
  const [abierto, setAbierto] = useState(false);
  const [aviso, setAviso] = useState<(Exito & { clave: number }) | null>(null);

  const administradores = usuarios.filter((u) => u.rol === "ADMINISTRADOR").length;

  function abrir() {
    setClave((actual) => actual + 1);
    setAbierto(true);
  }

  return (
    <>
      <TituloPagina titulo="Usuarios" descripcion="Cuentas con acceso al sistema y el rol de cada una.">
        <Button size="lg" onClick={abrir}>
          <UserPlusIcon data-icon="inline-start" />
          Crear usuario
        </Button>
      </TituloPagina>

      {aviso && (
        <AvisoExito key={aviso.clave} titulo="Cuenta creada">
          {aviso.mensaje}
        </AvisoExito>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Cuentas</CardTitle>
          <CardDescription>
            {cantidad(usuarios.length, "cuenta", "cuentas")}:{" "}
            {cantidad(administradores, "administrador", "administradores")} y{" "}
            {cantidad(usuarios.length - administradores, "operador", "operadores")}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TablaAdaptable titulo="Cuentas de usuario">
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Nombre</TableHead>
                <TableHead scope="col">Usuario</TableHead>
                <TableHead scope="col">Rol</TableHead>
                <TableHead scope="col">Creada</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usuarios.map((usuario) => {
                const destacada = aviso?.id === usuario.id;
                return (
                  <TableRow
                    key={destacada ? `${usuario.id}-${aviso.clave}` : usuario.id}
                    className={cn(destacada && "fila-destacada")}
                  >
                    <th scope="row" className="p-2 text-left align-middle font-medium">
                      <span className="inline-flex flex-wrap items-center gap-2">
                        {usuario.nombre}
                        {usuario.id === idActual && <Badge variant="outline">Tu cuenta</Badge>}
                      </span>
                    </th>
                    <TableCell data-etiqueta="Usuario" translate="no" className="font-mono text-[0.8rem]">
                      {usuario.nombreUsuario}
                    </TableCell>
                    <TableCell data-etiqueta="Rol">
                      <Badge variant={usuario.rol === "ADMINISTRADOR" ? "default" : "secondary"}>
                        {NOMBRE_ROL[usuario.rol]}
                      </Badge>
                    </TableCell>
                    <TableCell data-etiqueta="Creada" className="text-muted-foreground">
                      {usuario.creado}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </TablaAdaptable>
        </CardContent>
      </Card>

      <Dialogo
        abierto={abierto}
        onCerrar={() => setAbierto(false)}
        titulo="Crear usuario"
        descripcion="La persona podrá iniciar sesión en cuanto guardes la cuenta."
        className="max-w-lg"
      >
        <FormularioUsuario
          key={clave}
          onExito={(exito) => {
            setAbierto(false);
            setAviso({ ...exito, clave });
          }}
          onCancelar={() => setAbierto(false)}
        />
      </Dialogo>
    </>
  );
}

function FormularioUsuario({
  onExito,
  onCancelar,
}: {
  onExito: (exito: Exito) => void;
  onCancelar: () => void;
}) {
  const [estado, accion, enviando] = useActionState<EstadoFormulario, FormData>(
    async (previo, formData) => {
      const resultado = await crearUsuarioAccion(previo, formData);
      if (resultado.exito) onExito(resultado.exito);
      return resultado;
    },
    {}
  );
  // Los datos se conservan si el servidor rechaza alguno, para corregir sin volver a escribir todo.
  const [nombre, setNombre] = useState("");
  const [nombreUsuario, setNombreUsuario] = useState("");
  const [rol, setRol] = useState<Rol | null>(null);
  const [contrasena, setContrasena] = useState("");
  // El error del servidor se oculta en cuanto se corrige algún dato.
  const [editadoTrasError, setEditadoTrasError] = useState(false);
  const formularioRef = useRef<HTMLFormElement>(null);

  // Lleva el foco al campo que tiene el error.
  useEffect(() => {
    if (!estado.campo) return;
    formularioRef.current?.querySelector<HTMLInputElement>(`[name="${estado.campo}"]`)?.focus();
  }, [estado]);

  function alEditar<T>(guardar: (valor: T) => void) {
    return (valor: T) => {
      guardar(valor);
      setEditadoTrasError(true);
    };
  }

  const error = editadoTrasError ? undefined : estado.error;
  const errorDe = (campo: string) => (estado.campo === campo ? error : undefined);
  const errorGeneral = !estado.campo ? error : undefined;

  return (
    <form ref={formularioRef} action={accion} onSubmit={() => setEditadoTrasError(false)}>
      <DialogoCuerpo>
        <Field data-invalid={Boolean(errorDe("nombre")) || undefined}>
          <FieldLabel htmlFor="nombre">Nombre completo</FieldLabel>
          <Input
            id="nombre"
            name="nombre"
            value={nombre}
            onChange={(e) => alEditar(setNombre)(e.target.value)}
            autoComplete="off"
            enterKeyHint="next"
            required
            maxLength={80}
            aria-invalid={Boolean(errorDe("nombre")) || undefined}
            className="h-10"
          />
          <FieldError>{errorDe("nombre")}</FieldError>
        </Field>

        <Field data-invalid={Boolean(errorDe("nombreUsuario")) || undefined}>
          <FieldLabel htmlFor="nombreUsuario">Usuario</FieldLabel>
          <Input
            id="nombreUsuario"
            name="nombreUsuario"
            value={nombreUsuario}
            onChange={(e) => alEditar(setNombreUsuario)(e.target.value)}
            placeholder="laura.gomez"
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="next"
            required
            maxLength={30}
            aria-invalid={Boolean(errorDe("nombreUsuario")) || undefined}
            aria-describedby="nombreUsuario-ayuda"
            className="h-10 max-w-64"
          />
          <FieldDescription id="nombreUsuario-ayuda">
            Con él inicia sesión. De 3 a 30 caracteres: letras, números, punto, guion o guion bajo.
          </FieldDescription>
          <FieldError>{errorDe("nombreUsuario")}</FieldError>
        </Field>

        <GrupoOpciones
          leyenda="Rol"
          nombre="rol"
          opciones={ROLES}
          valor={rol}
          onCambiar={alEditar(setRol)}
          error={errorDe("rol")}
        />

        <Field data-invalid={Boolean(errorDe("contrasena")) || undefined}>
          <FieldLabel htmlFor="contrasena">Contraseña</FieldLabel>
          <CampoContrasena
            id="contrasena"
            name="contrasena"
            value={contrasena}
            onChange={(e) => alEditar(setContrasena)(e.target.value)}
            autoComplete="new-password"
            enterKeyHint="done"
            required
            minLength={LARGO_MINIMO_CONTRASENA}
            maxLength={LARGO_MAXIMO_CONTRASENA}
            aria-invalid={Boolean(errorDe("contrasena")) || undefined}
            aria-describedby="contrasena-ayuda"
            className="h-10"
          />
          <FieldDescription id="contrasena-ayuda">
            Mínimo {LARGO_MINIMO_CONTRASENA} caracteres. Entrégasela a la persona en privado: no se vuelve a
            mostrar.
          </FieldDescription>
          <FieldError>{errorDe("contrasena")}</FieldError>
        </Field>

        {errorGeneral && (
          <Alert variant="destructive">
            <TriangleAlertIcon />
            <AlertTitle>No se creó la cuenta</AlertTitle>
            <AlertDescription>{errorGeneral}</AlertDescription>
          </Alert>
        )}
      </DialogoCuerpo>
      <DialogoAcciones>
        <Button type="button" variant="outline" size="lg" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button type="submit" size="lg" disabled={enviando}>
          {enviando ? <Spinner data-icon="inline-start" /> : <UserPlusIcon data-icon="inline-start" />}
          {enviando ? "Creando…" : "Crear usuario"}
        </Button>
      </DialogoAcciones>
    </form>
  );
}
