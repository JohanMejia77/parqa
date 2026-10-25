// Formatos de fecha y tiempo en la hora de Colombia, sin importar la zona del equipo.

const ZONA = "America/Bogota";

const formatoHora = new Intl.DateTimeFormat("es-CO", {
  timeZone: ZONA,
  hour: "numeric",
  minute: "2-digit",
});

const formatoFechaHora = new Intl.DateTimeFormat("es-CO", {
  timeZone: ZONA,
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

const formatoFechaLarga = new Intl.DateTimeFormat("es-CO", {
  timeZone: ZONA,
  weekday: "long",
  day: "numeric",
  month: "long",
});

/** "3:20 p. m." */
export function formatearHora(fecha: Date): string {
  return formatoHora.format(fecha);
}

/** "22 oct, 3:20 p. m." */
export function formatearFechaHora(fecha: Date): string {
  return formatoFechaHora.format(fecha);
}

/** "jueves, 22 de octubre" */
export function formatearFechaLarga(fecha: Date): string {
  return formatoFechaLarga.format(fecha);
}

/** Duración legible: "45 min", "2 h 15 min", "1 d 3 h". */
export function formatearDuracion(milisegundos: number): string {
  const minutos = Math.max(0, Math.floor(milisegundos / 60_000));
  const dias = Math.floor(minutos / 1440);
  const horas = Math.floor((minutos % 1440) / 60);
  const resto = minutos % 60;
  if (dias > 0) return `${dias} d ${horas} h`;
  if (horas > 0) return `${horas} h ${resto} min`;
  return `${resto} min`;
}
