import "server-only";
import { textoDe } from "@/lib/parametros";
import {
  ErrorNegocio,
  LARGO_MAXIMO_CODIGO_CELDA,
  codigoCeldaValido,
  esTipoVehiculo,
  limpiarCodigoCelda,
  normalizarCodigoCelda,
  type Celda,
  type CeldaCatalogo,
  type TipoVehiculo,
  type Usuario,
} from "@/modelos";
import {
  actualizarCelda,
  bloquearCelda,
  buscarCeldaCatalogo,
  celdaEstaOcupada,
  eliminarCeldaPorId,
  insertarCelda,
  listarCatalogoCeldas,
  listarCeldasLibres,
} from "@/repositorios/celdas";
import { db, enTransaccion, esViolacionForanea, esViolacionUnica } from "@/repositorios/db";
import { autorizar } from "./autenticacion";

/** Datos que llegan del formulario o de la API; se validan todos en el servidor. */
export interface DatosCelda {
  codigo?: unknown;
  tipo?: unknown;
}

function leerCodigo(valor: unknown): string {
  const codigo = normalizarCodigoCelda(textoDe(valor));
  if (!codigo) {
    throw new ErrorNegocio("Escribe el código de la celda.", { campo: "codigo" });
  }
  if (!codigoCeldaValido(codigo)) {
    throw new ErrorNegocio(
      `El código admite hasta ${LARGO_MAXIMO_CODIGO_CELDA} caracteres: letras, números y guiones sencillos. Ejemplo: A-21.`,
      { campo: "codigo" }
    );
  }
  return codigo;
}

function leerTipo(valor: unknown): TipoVehiculo {
  if (!esTipoVehiculo(valor)) {
    throw new ErrorNegocio("Elige el tipo de vehículo de la celda: CARRO o MOTO.", { campo: "tipo" });
  }
  return valor;
}

function celdaNoExiste(): ErrorNegocio {
  return new ErrorNegocio("La celda no existe. Puede que otra persona la haya eliminado.", {
    motivo: "no_encontrado",
  });
}

function codigoRepetido(codigo: string): ErrorNegocio {
  return new ErrorNegocio(`Ya existe una celda con el código ${codigo}. Usa otro código.`, {
    campo: "codigo",
    motivo: "conflicto",
  });
}

/** HU-11 Consultar y buscar celdas: catálogo con ocupación y movimientos de cada celda. */
export async function consultarCeldas(
  actor: Usuario | null,
  filtro: { buscar?: unknown; tipo?: unknown } = {}
): Promise<CeldaCatalogo[]> {
  autorizar(actor, "ADMINISTRADOR");
  const tipo = filtro.tipo === undefined || filtro.tipo === "" ? null : leerTipo(filtro.tipo);
  return listarCatalogoCeldas(limpiarCodigoCelda(textoDe(filtro.buscar)), tipo);
}

export async function consultarCelda(actor: Usuario | null, id: number | null): Promise<CeldaCatalogo> {
  autorizar(actor, "ADMINISTRADOR");
  const celda = id ? await buscarCeldaCatalogo(id) : null;
  if (!celda) throw celdaNoExiste();
  return celda;
}

/** Consulta auxiliar del operador (HU-04): celdas libres para asignar a un vehículo. No reserva nada. */
export async function consultarCeldasDisponibles(
  actor: Usuario | null,
  tipo?: unknown
): Promise<Celda[]> {
  autorizar(actor, "OPERADOR");
  return listarCeldasLibres(tipo === undefined || tipo === "" ? null : leerTipo(tipo));
}

/** HU-12 Crear celda. El código es único después de normalizarlo (mayúsculas, sin espacios a los lados). */
export async function crearCelda(actor: Usuario | null, datos: DatosCelda): Promise<Celda> {
  autorizar(actor, "ADMINISTRADOR");
  const codigo = leerCodigo(datos.codigo);
  const tipo = leerTipo(datos.tipo);

  try {
    return await insertarCelda(db(), codigo, tipo);
  } catch (error) {
    // Si dos administradores crean el mismo código a la vez, PostgreSQL acepta solo uno.
    if (esViolacionUnica(error, "uq_celda_codigo")) throw codigoRepetido(codigo);
    throw error;
  }
}

/**
 * HU-13 Editar celda. Se puede cambiar el código, el tipo o ambos; lo que no se envía no cambia.
 * La celda conserva su identificador y su historial.
 */
export async function editarCelda(
  actor: Usuario | null,
  id: number | null,
  cambios: DatosCelda
): Promise<Celda> {
  autorizar(actor, "ADMINISTRADOR");
  if (cambios.codigo === undefined && cambios.tipo === undefined) {
    throw new ErrorNegocio("Indica el código o el tipo que quieres cambiar.");
  }
  const codigoNuevo = cambios.codigo === undefined ? null : leerCodigo(cambios.codigo);
  const tipoNuevo = cambios.tipo === undefined ? null : leerTipo(cambios.tipo);
  if (!id) throw celdaNoExiste();

  try {
    return await enTransaccion(async (con) => {
      const actual = await bloquearCelda(con, id, "FOR UPDATE");
      if (!actual) throw celdaNoExiste();

      const tipo = tipoNuevo ?? actual.tipo;
      if (tipo !== actual.tipo && (await celdaEstaOcupada(con, id))) {
        throw new ErrorNegocio(
          `La celda ${actual.codigo} está ocupada. Cambia su tipo cuando el vehículo salga.`,
          { campo: "tipo", motivo: "conflicto" }
        );
      }
      return actualizarCelda(con, id, codigoNuevo ?? actual.codigo, tipo);
    });
  } catch (error) {
    if (esViolacionUnica(error, "uq_celda_codigo")) throw codigoRepetido(codigoNuevo ?? "");
    throw error;
  }
}

/**
 * HU-14 Eliminar celda. Solo se elimina una celda que nunca se ha usado:
 * si está ocupada o tiene movimientos en el historial, se conserva.
 */
export async function eliminarCelda(actor: Usuario | null, id: number | null): Promise<Celda> {
  autorizar(actor, "ADMINISTRADOR");
  if (!id) throw celdaNoExiste();

  try {
    return await enTransaccion(async (con) => {
      const celda = await bloquearCelda(con, id, "FOR UPDATE");
      const uso = celda ? await buscarCeldaCatalogo(id, con) : null;
      if (!celda || !uso) throw celdaNoExiste();

      if (uso.placaOcupante) {
        throw new ErrorNegocio(
          `La celda ${celda.codigo} está ocupada por el vehículo ${uso.placaOcupante} y no se puede eliminar.`,
          { motivo: "conflicto" }
        );
      }
      if (uso.movimientos > 0) {
        throw new ErrorNegocio(
          `La celda ${celda.codigo} tiene ${uso.movimientos === 1 ? "1 movimiento" : `${uso.movimientos} movimientos`} en el historial y no se puede eliminar.`,
          { motivo: "conflicto" }
        );
      }
      await eliminarCeldaPorId(con, id);
      return celda;
    });
  } catch (error) {
    // Última defensa: la llave foránea de registro impide borrar una celda con movimientos.
    if (esViolacionForanea(error)) {
      throw new ErrorNegocio("La celda tiene movimientos registrados y no se puede eliminar.", {
        motivo: "conflicto",
      });
    }
    throw error;
  }
}
