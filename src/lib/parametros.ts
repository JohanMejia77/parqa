// Lectura segura de datos que llegan de fuera: URL (?placa=..., ?registro=...),
// formularios y cuerpos JSON. Nada de lo que envía el navegador se da por válido.

type Parametro = string | string[] | undefined;

export function textoParametro(valor: Parametro): string {
  return (Array.isArray(valor) ? valor[0] : valor) ?? "";
}

/** Devuelve el id numérico del parámetro o null si no es un entero positivo. */
export function idParametro(valor: Parametro): number | null {
  return idDe(textoParametro(valor));
}

/** Devuelve `valor` si es texto; cualquier otra cosa (número, archivo, null) se trata como vacío. */
export function textoDe(valor: unknown): string {
  return typeof valor === "string" ? valor : "";
}

/** Convierte `valor` (texto o número) en un id; null si no es un entero positivo. */
export function idDe(valor: unknown): number | null {
  const id = typeof valor === "number" ? valor : Number(textoDe(valor).trim() || NaN);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}
