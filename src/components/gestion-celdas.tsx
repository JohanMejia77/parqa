"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Form from "next/form";
import Link from "next/link";
import {
  BikeIcon,
  CarFrontIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  SearchXIcon,
  SquareParkingIcon,
  Trash2Icon,
  TriangleAlertIcon,
} from "lucide-react";
import { crearCeldaAccion, editarCeldaAccion, eliminarCeldaAccion } from "@/acciones/celdas";
import type { EstadoFormulario } from "@/acciones/estado";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialogo, DialogoAcciones, DialogoCuerpo } from "@/components/ui/dialogo";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AvisoExito } from "@/components/aviso-exito";
import { GrupoOpciones, type Opcion } from "@/components/grupo-opciones";
import { Placa } from "@/components/placa";
import { TablaAdaptable } from "@/components/tabla-adaptable";
import { TituloPagina } from "@/components/titulo-pagina";
import {
  LARGO_MAXIMO_CODIGO_CELDA,
  NOMBRE_TIPO,
  limpiarCodigoCelda,
  type CeldaCatalogo,
  type TipoVehiculo,
} from "@/modelos";
import { cn } from "@/lib/utils";

const TIPOS: Opcion<TipoVehiculo>[] = [
  { valor: "CARRO", etiqueta: "Carro", icono: CarFrontIcon },
  { valor: "MOTO", etiqueta: "Moto", icono: BikeIcon },
];

const FILTROS_TIPO = [
  { valor: "", etiqueta: "Todas" },
  { valor: "CARRO", etiqueta: "Carros" },
  { valor: "MOTO", etiqueta: "Motos" },
];

type Exito = NonNullable<EstadoFormulario["exito"]>;

function cantidad(n: number, singular: string, plural: string): string {
  return n === 1 ? `1 ${singular}` : `${n} ${plural}`;
}

/** Por qué una celda no se puede eliminar; null si nunca se ha usado y sí se puede. */
function motivoParaConservar(celda: CeldaCatalogo): string | null {
  if (celda.placaOcupante) return `Está ocupada por el vehículo ${celda.placaOcupante}.`;
  if (celda.movimientos > 0) {
    return `Tiene ${cantidad(celda.movimientos, "movimiento", "movimientos")} en el historial.`;
  }
  return null;
}

/** Gestión de celdas del administrador: consultar y buscar (HU-11), crear (HU-12), editar (HU-13) y eliminar (HU-14). */
export function GestionCeldas({
  celdas,
  buscar,
  tipo,
}: {
  celdas: CeldaCatalogo[];
  /** Filtros con los que se cargó la lista. */
  buscar: string;
  tipo: TipoVehiculo | null;
}) {
  // Cada vez que se abre un diálogo cambia su `clave`, para que su formulario empiece limpio.
  const clave = useRef(0);
  const [formulario, setFormulario] = useState<{ clave: number; celda: CeldaCatalogo | null }>({
    clave: 0,
    celda: null,
  });
  const [formularioAbierto, setFormularioAbierto] = useState(false);
  const [eliminacion, setEliminacion] = useState<{ clave: number; celda: CeldaCatalogo } | null>(null);
  const [eliminacionAbierta, setEliminacionAbierta] = useState(false);
  const [aviso, setAviso] = useState<(Exito & { clave: number; titulo: string }) | null>(null);

  function abrirFormulario(celda: CeldaCatalogo | null) {
    setFormulario({ clave: ++clave.current, celda });
    setFormularioAbierto(true);
  }

  function abrirEliminacion(celda: CeldaCatalogo) {
    setEliminacion({ clave: ++clave.current, celda });
    setEliminacionAbierta(true);
  }

  function terminar(titulo: string, exito: Exito) {
    setFormularioAbierto(false);
    setEliminacionAbierta(false);
    setAviso({ ...exito, titulo, clave: ++clave.current });
  }

  const filtrado = buscar !== "" || tipo !== null;
  const ocupadas = celdas.filter((c) => c.placaOcupante).length;
  const porEliminar = eliminacion?.celda;
  const motivo = porEliminar ? motivoParaConservar(porEliminar) : null;

  return (
    <>
      <TituloPagina titulo="Celdas" descripcion="Catálogo de los espacios del parqueadero.">
        <Button size="lg" onClick={() => abrirFormulario(null)}>
          <PlusIcon data-icon="inline-start" />
          Nueva celda
        </Button>
      </TituloPagina>

      {aviso && (
        <AvisoExito key={aviso.clave} titulo={aviso.titulo}>
          {aviso.mensaje}
        </AvisoExito>
      )}

      <Card>
        <CardHeader className="border-b">
          <CardTitle>Catálogo</CardTitle>
          <CardDescription>
            {filtrado
              ? `${cantidad(celdas.length, "celda coincide", "celdas coinciden")} con la búsqueda.`
              : `${cantidad(celdas.length, "celda", "celdas")}: ${
                  celdas.filter((c) => c.tipo === "CARRO").length
                } para carros y ${celdas.filter((c) => c.tipo === "MOTO").length} para motos. ${cantidad(
                  ocupadas,
                  "ocupada",
                  "ocupadas"
                )} en este momento.`}
          </CardDescription>
          <search className="col-span-full pt-2">
            <Form action="/celdas" className="flex flex-wrap items-end gap-x-5 gap-y-3">
              <Field className="w-auto">
                <FieldLabel htmlFor="buscar">Buscar por código</FieldLabel>
                <Input
                  id="buscar"
                  name="buscar"
                  type="search"
                  defaultValue={buscar}
                  placeholder="Ej. A-0"
                  maxLength={LARGO_MAXIMO_CODIGO_CELDA}
                  autoComplete="off"
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint="search"
                  className="w-44 uppercase placeholder:normal-case"
                />
              </Field>
              <fieldset className="flex min-w-0 flex-col gap-2">
                <legend className="mb-2 text-sm leading-snug font-medium">Tipo</legend>
                <div className="flex h-8 items-center gap-4 text-sm">
                  {FILTROS_TIPO.map(({ valor, etiqueta }) => (
                    <label key={valor} className="flex cursor-pointer items-center gap-1.5">
                      <input
                        type="radio"
                        name="tipo"
                        value={valor}
                        defaultChecked={(tipo ?? "") === valor}
                        className="size-4 accent-primary"
                      />
                      {etiqueta}
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="flex gap-2">
                <Button type="submit" variant="outline">
                  <SearchIcon data-icon="inline-start" />
                  Buscar
                </Button>
                {filtrado && (
                  <Button variant="ghost" render={<Link href="/celdas" />} nativeButton={false}>
                    Quitar filtros
                  </Button>
                )}
              </div>
            </Form>
          </search>
        </CardHeader>
        <CardContent>
          {celdas.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">{filtrado ? <SearchXIcon /> : <SquareParkingIcon />}</EmptyMedia>
                <EmptyTitle>{filtrado ? "Ninguna celda coincide" : "Aún no hay celdas"}</EmptyTitle>
                <EmptyDescription>
                  {filtrado
                    ? "Revisa el código o el tipo que elegiste, o quita los filtros para ver todo el catálogo."
                    : "Crea la primera celda para poder asignarla a los vehículos que entren."}
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                {filtrado ? (
                  <Button variant="outline" render={<Link href="/celdas" />} nativeButton={false}>
                    Quitar filtros
                  </Button>
                ) : (
                  <Button onClick={() => abrirFormulario(null)}>
                    <PlusIcon data-icon="inline-start" />
                    Nueva celda
                  </Button>
                )}
              </EmptyContent>
            </Empty>
          ) : (
            <TablaAdaptable titulo="Catálogo de celdas">
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Código</TableHead>
                  <TableHead scope="col">Tipo</TableHead>
                  <TableHead scope="col">Estado</TableHead>
                  <TableHead scope="col">Movimientos</TableHead>
                  <TableHead scope="col">
                    <span className="sr-only">Acciones</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {celdas.map((celda) => {
                  const destacada = aviso?.id === celda.id;
                  const Icono = celda.tipo === "MOTO" ? BikeIcon : CarFrontIcon;
                  return (
                    <TableRow
                      // La fila recién creada o editada se vuelve a montar para repetir el destello.
                      key={destacada ? `${celda.id}-${aviso.clave}` : celda.id}
                      className={cn(destacada && "fila-destacada")}
                    >
                      <th scope="row" className="p-2 text-left align-middle font-semibold whitespace-nowrap">
                        {celda.codigo}
                      </th>
                      <TableCell data-etiqueta="Tipo">
                        <span className="inline-flex items-center gap-1.5">
                          <Icono aria-hidden className="size-4 text-muted-foreground" />
                          {NOMBRE_TIPO[celda.tipo]}
                        </span>
                      </TableCell>
                      <TableCell data-etiqueta="Estado">
                        {celda.placaOcupante ? (
                          <span className="inline-flex items-center gap-2">
                            <Badge>Ocupada</Badge>
                            <Placa placa={celda.placaOcupante} />
                          </span>
                        ) : (
                          <Badge variant="outline">Libre</Badge>
                        )}
                      </TableCell>
                      <TableCell
                        data-etiqueta="Movimientos"
                        className={cn(celda.movimientos === 0 && "text-muted-foreground")}
                      >
                        {celda.movimientos}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            aria-label={`Editar la celda ${celda.codigo}`}
                            onClick={() => abrirFormulario(celda)}
                          >
                            <PencilIcon data-icon="inline-start" />
                            Editar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={`Eliminar la celda ${celda.codigo}`}
                            onClick={() => abrirEliminacion(celda)}
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2Icon data-icon="inline-start" />
                            Eliminar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </TablaAdaptable>
          )}
        </CardContent>
      </Card>

      <Dialogo
        abierto={formularioAbierto}
        onCerrar={() => setFormularioAbierto(false)}
        titulo={formulario.celda ? `Editar la celda ${formulario.celda.codigo}` : "Nueva celda"}
        descripcion={
          formulario.celda
            ? "La celda conserva su historial de movimientos."
            : "Queda libre y lista para asignarla a un vehículo."
        }
      >
        <FormularioCelda
          key={formulario.clave}
          celda={formulario.celda}
          onExito={(exito) => terminar(formulario.celda ? "Celda actualizada" : "Celda creada", exito)}
          onCancelar={() => setFormularioAbierto(false)}
        />
      </Dialogo>

      <Dialogo
        abierto={eliminacionAbierta}
        onCerrar={() => setEliminacionAbierta(false)}
        cierreExterior
        titulo={
          !porEliminar
            ? "Eliminar celda"
            : motivo
              ? `La celda ${porEliminar.codigo} no se puede eliminar`
              : `¿Eliminar la celda ${porEliminar.codigo}?`
        }
        descripcion={
          motivo
            ? `${motivo} Las celdas que ya se usaron se conservan para no perder sus registros.`
            : "Sale del catálogo y deja de ofrecerse a los vehículos. Esta acción no se puede deshacer."
        }
      >
        {eliminacion && (
          <EliminarCelda
            key={eliminacion.clave}
            celda={eliminacion.celda}
            sePuede={!motivo}
            onExito={(exito) => terminar("Celda eliminada", exito)}
            onCancelar={() => setEliminacionAbierta(false)}
          />
        )}
      </Dialogo>
    </>
  );
}

function FormularioCelda({
  celda,
  onExito,
  onCancelar,
}: {
  /** Celda que se edita; null para crear una nueva. */
  celda: CeldaCatalogo | null;
  onExito: (exito: Exito) => void;
  onCancelar: () => void;
}) {
  const [estado, accion, enviando] = useActionState<EstadoFormulario, FormData>(
    async (previo, formData) => {
      const resultado = await (celda ? editarCeldaAccion : crearCeldaAccion)(previo, formData);
      if (resultado.exito) onExito(resultado.exito);
      return resultado;
    },
    {}
  );
  const [codigo, setCodigo] = useState(celda?.codigo ?? "");
  const [tipo, setTipo] = useState<TipoVehiculo | null>(celda?.tipo ?? null);
  // El error del servidor se oculta en cuanto se corrige algún dato.
  const [editadoTrasError, setEditadoTrasError] = useState(false);
  const codigoRef = useRef<HTMLInputElement>(null);
  const tipoRef = useRef<HTMLFieldSetElement>(null);

  // Lleva el foco al campo que tiene el error.
  useEffect(() => {
    if (estado.campo === "codigo") codigoRef.current?.focus();
    if (estado.campo === "tipo") tipoRef.current?.querySelector("input")?.focus();
  }, [estado]);

  const error = editadoTrasError ? undefined : estado.error;
  const errorCodigo = estado.campo === "codigo" ? error : undefined;
  const errorTipo = estado.campo === "tipo" ? error : undefined;
  const errorGeneral = !estado.campo ? error : undefined;

  return (
    <form action={accion} onSubmit={() => setEditadoTrasError(false)}>
      {celda && <input type="hidden" name="id" value={celda.id} />}
      <DialogoCuerpo>
        <Field data-invalid={Boolean(errorCodigo) || undefined}>
          <FieldLabel htmlFor="codigo-celda">Código</FieldLabel>
          <Input
            ref={codigoRef}
            id="codigo-celda"
            name="codigo"
            value={codigo}
            onChange={(e) => {
              setCodigo(limpiarCodigoCelda(e.target.value));
              setEditadoTrasError(true);
            }}
            placeholder="A-21"
            autoComplete="off"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="next"
            required
            aria-invalid={Boolean(errorCodigo) || undefined}
            aria-describedby="codigo-celda-ayuda"
            className="h-10 max-w-44 font-semibold tracking-wide"
          />
          <FieldDescription id="codigo-celda-ayuda">
            Hasta {LARGO_MAXIMO_CODIGO_CELDA} caracteres: letras, números y guiones. No se puede repetir.
          </FieldDescription>
          <FieldError>{errorCodigo}</FieldError>
        </Field>

        <GrupoOpciones
          ref={tipoRef}
          leyenda="Tipo de vehículo"
          nombre="tipo"
          opciones={TIPOS}
          valor={tipo}
          onCambiar={(valor) => {
            setTipo(valor);
            setEditadoTrasError(true);
          }}
          deshabilitado={Boolean(celda?.placaOcupante)}
          ayuda={
            celda?.placaOcupante
              ? `Está ocupada por el vehículo ${celda.placaOcupante}: el tipo se puede cambiar cuando salga.`
              : "Solo se asigna a vehículos de este tipo."
          }
          error={errorTipo}
        />

        {errorGeneral && (
          <Alert variant="destructive">
            <TriangleAlertIcon />
            <AlertTitle>No se guardó la celda</AlertTitle>
            <AlertDescription>{errorGeneral}</AlertDescription>
          </Alert>
        )}
      </DialogoCuerpo>
      <DialogoAcciones>
        <Button type="button" variant="outline" size="lg" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button type="submit" size="lg" disabled={enviando}>
          {enviando && <Spinner data-icon="inline-start" />}
          {enviando ? "Guardando…" : celda ? "Guardar cambios" : "Crear celda"}
        </Button>
      </DialogoAcciones>
    </form>
  );
}

function EliminarCelda({
  celda,
  sePuede,
  onExito,
  onCancelar,
}: {
  celda: CeldaCatalogo;
  /** false cuando la celda está ocupada o tiene historial: el diálogo solo explica por qué. */
  sePuede: boolean;
  onExito: (exito: Exito) => void;
  onCancelar: () => void;
}) {
  const [estado, accion, enviando] = useActionState<EstadoFormulario, FormData>(
    async (previo, formData) => {
      const resultado = await eliminarCeldaAccion(previo, formData);
      if (resultado.exito) onExito(resultado.exito);
      return resultado;
    },
    {}
  );

  if (!sePuede) {
    return (
      <DialogoAcciones>
        <Button type="button" size="lg" onClick={onCancelar}>
          Entendido
        </Button>
      </DialogoAcciones>
    );
  }

  return (
    <form action={accion}>
      <input type="hidden" name="id" value={celda.id} />
      {estado.error && (
        <DialogoCuerpo>
          <Alert variant="destructive">
            <TriangleAlertIcon />
            <AlertTitle>No se eliminó la celda</AlertTitle>
            <AlertDescription>{estado.error}</AlertDescription>
          </Alert>
        </DialogoCuerpo>
      )}
      <DialogoAcciones>
        <Button type="button" variant="outline" size="lg" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button type="submit" variant="destructive" size="lg" disabled={enviando}>
          {enviando ? <Spinner data-icon="inline-start" /> : <Trash2Icon data-icon="inline-start" />}
          {enviando ? "Eliminando…" : "Eliminar celda"}
        </Button>
      </DialogoAcciones>
    </form>
  );
}
