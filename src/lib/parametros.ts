// Lectura segura de parámetros de la URL (?placa=..., ?registro=...).

type Parametro = string | string[] | undefined;

export function textoParametro(valor: Parametro): string {
  return (Array.isArray(valor) ? valor[0] : valor) ?? "";
}

/** Devuelve el id numérico del parámetro o null si no es un entero positivo. */
export function idParametro(valor: Parametro): number | null {
  const id = Number(textoParametro(valor));
  return Number.isInteger(id) && id > 0 ? id : null;
}
