import "server-only";
import { ErrorNegocio, NOMBRE_TIPO, normalizarPlaca, tipoSegunPlaca } from "@/modelos";
import { buscarCeldaPorId, celdaEstaOcupada } from "@/repositorios/celdas";
import { db, enTransaccion, esViolacionUnica } from "@/repositorios/db";
import { buscarRegistroDentro, cerrarRegistroDentro, crearRegistro } from "@/repositorios/registros";
import { obtenerOCrearVehiculo } from "@/repositorios/vehiculos";

/**
 * HU-01 Registrar entrada.
 * Valida la placa, registra el vehículo si es nuevo y ocupa la celda elegida.
 * Devuelve el id del registro creado.
 */
export async function registrarEntrada(
  placaIngresada: string,
  celdaId: number | null
): Promise<number> {
  const placa = normalizarPlaca(placaIngresada);
  if (!placa) {
    throw new ErrorNegocio("Escribe la placa del vehículo.", "placa");
  }
  const tipo = tipoSegunPlaca(placa);
  if (!tipo) {
    throw new ErrorNegocio(
      "La placa no tiene un formato válido. Usa ABC123 para carros o ABC12D para motos.",
      "placa"
    );
  }
  if (!celdaId) {
    throw new ErrorNegocio("Selecciona una celda libre.", "celda");
  }

  try {
    return await enTransaccion(async (cliente) => {
      const dentro = await buscarRegistroDentro(placa, cliente);
      if (dentro) {
        throw new ErrorNegocio(
          `El vehículo ${placa} ya está dentro, en la celda ${dentro.codigoCelda}.`,
          "placa"
        );
      }

      const celda = await buscarCeldaPorId(cliente, celdaId);
      if (!celda) {
        throw new ErrorNegocio("La celda seleccionada no existe.", "celda");
      }

      const vehiculo = await obtenerOCrearVehiculo(cliente, placa, tipo);
      if (celda.tipo !== vehiculo.tipo) {
        throw new ErrorNegocio(
          `La celda ${celda.codigo} es para ${NOMBRE_TIPO[celda.tipo].toLowerCase()}s.`,
          "celda"
        );
      }
      if (await celdaEstaOcupada(cliente, celda.id)) {
        throw new ErrorNegocio(`La celda ${celda.codigo} ya está ocupada. Elige otra.`, "celda");
      }

      const registro = await crearRegistro(cliente, vehiculo.id, celda.id);
      return registro.id;
    });
  } catch (error) {
    // Si dos operadores registran al mismo tiempo, los índices únicos de PostgreSQL
    // rechazan la segunda operación y la transacción se deshace.
    if (esViolacionUnica(error, "uq_registro_celda_ocupada")) {
      throw new ErrorNegocio("Otro vehículo acaba de ocupar esa celda. Elige otra.", "celda");
    }
    if (esViolacionUnica(error, "uq_registro_vehiculo_dentro")) {
      throw new ErrorNegocio(`El vehículo ${placa} ya está dentro.`, "placa");
    }
    throw error;
  }
}

/**
 * HU-02 Registrar salida.
 * Cierra el registro abierto de la placa con la hora actual y libera la celda.
 * Devuelve el id del registro cerrado.
 */
export async function registrarSalida(placaIngresada: string): Promise<number> {
  const placa = normalizarPlaca(placaIngresada);
  if (!placa) {
    throw new ErrorNegocio("Escribe la placa del vehículo.", "placa");
  }
  const id = await cerrarRegistroDentro(db(), placa);
  if (id === null) {
    throw new ErrorNegocio(`El vehículo ${placa} no está dentro del parqueadero.`, "placa");
  }
  return id;
}
