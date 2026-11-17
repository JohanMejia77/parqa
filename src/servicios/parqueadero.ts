import "server-only";
import {
  ErrorNegocio,
  NOMBRE_TIPO,
  normalizarPlaca,
  tipoSegunPlaca,
  type Usuario,
} from "@/modelos";
import { bloquearCelda, celdaEstaOcupada } from "@/repositorios/celdas";
import { db, enTransaccion, esViolacionUnica } from "@/repositorios/db";
import { buscarRegistroDentro, cerrarRegistroDentro, crearRegistro } from "@/repositorios/registros";
import { obtenerOCrearVehiculo } from "@/repositorios/vehiculos";
import { autorizar } from "./autenticacion";

/**
 * HU-01 Registrar entrada.
 * Valida la placa, registra el vehículo si es nuevo y ocupa la celda elegida.
 * Devuelve el id del registro creado. Solo la puede hacer un operador.
 */
export async function registrarEntrada(
  actor: Usuario | null,
  placaIngresada: string,
  celdaId: number | null
): Promise<number> {
  autorizar(actor, "OPERADOR");

  const placa = normalizarPlaca(placaIngresada);
  if (!placa) {
    throw new ErrorNegocio("Escribe la placa del vehículo.", { campo: "placa" });
  }
  const tipo = tipoSegunPlaca(placa);
  if (!tipo) {
    throw new ErrorNegocio(
      "La placa no tiene un formato válido. Usa ABC123 para carros o ABC12D para motos.",
      { campo: "placa" }
    );
  }
  if (!celdaId) {
    throw new ErrorNegocio("Selecciona una celda libre.", { campo: "celda" });
  }

  try {
    return await enTransaccion(async (cliente) => {
      const dentro = await buscarRegistroDentro(placa, cliente);
      if (dentro) {
        throw new ErrorNegocio(
          `El vehículo ${placa} ya está dentro, en la celda ${dentro.codigoCelda}.`,
          { campo: "placa", motivo: "conflicto" }
        );
      }

      // Se bloquea la celda para que el administrador no la edite ni la elimine
      // mientras se registra la entrada.
      const celda = await bloquearCelda(cliente, celdaId, "FOR SHARE");
      if (!celda) {
        throw new ErrorNegocio("La celda seleccionada no existe.", {
          campo: "celda",
          motivo: "no_encontrado",
        });
      }

      const vehiculo = await obtenerOCrearVehiculo(cliente, placa, tipo);
      if (celda.tipo !== vehiculo.tipo) {
        throw new ErrorNegocio(
          `La celda ${celda.codigo} es para ${NOMBRE_TIPO[celda.tipo].toLowerCase()}s.`,
          { campo: "celda" }
        );
      }
      if (await celdaEstaOcupada(cliente, celda.id)) {
        throw new ErrorNegocio(`La celda ${celda.codigo} ya está ocupada. Elige otra.`, {
          campo: "celda",
          motivo: "conflicto",
        });
      }

      const registro = await crearRegistro(cliente, vehiculo.id, celda.id);
      return registro.id;
    });
  } catch (error) {
    // Si dos operadores registran al mismo tiempo, los índices únicos de PostgreSQL
    // rechazan la segunda operación y la transacción se deshace.
    if (esViolacionUnica(error, "uq_registro_celda_ocupada")) {
      throw new ErrorNegocio("Otro vehículo acaba de ocupar esa celda. Elige otra.", {
        campo: "celda",
        motivo: "conflicto",
      });
    }
    if (esViolacionUnica(error, "uq_registro_vehiculo_dentro")) {
      throw new ErrorNegocio(`El vehículo ${placa} ya está dentro.`, {
        campo: "placa",
        motivo: "conflicto",
      });
    }
    throw error;
  }
}

/**
 * HU-02 Registrar salida.
 * Cierra el registro abierto de la placa con la hora actual y libera la celda.
 * Devuelve el id del registro cerrado. Solo la puede hacer un operador.
 */
export async function registrarSalida(actor: Usuario | null, placaIngresada: string): Promise<number> {
  autorizar(actor, "OPERADOR");

  const placa = normalizarPlaca(placaIngresada);
  if (!placa) {
    throw new ErrorNegocio("Escribe la placa del vehículo.", { campo: "placa" });
  }
  const id = await cerrarRegistroDentro(db(), placa);
  if (id === null) {
    throw new ErrorNegocio(`El vehículo ${placa} no está dentro del parqueadero.`, {
      campo: "placa",
      motivo: "no_encontrado",
    });
  }
  return id;
}
