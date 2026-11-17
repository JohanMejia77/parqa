// Hash de contraseñas con scrypt, incluido en Node.js (no necesita dependencias).
// Es un archivo .mjs porque lo usan la aplicación y el script scripts/db.mjs.

import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

// Costo recomendado por OWASP para scrypt: N = 2^14, r = 8, p = 5.
const COSTO = { N: 16384, r: 8, p: 5 };
const LARGO_CLAVE = 64;

/**
 * Deriva la clave de una contraseña. NFKC hace que la misma contraseña
 * escrita en teclados distintos produzca siempre el mismo resultado.
 * @param {string} contrasena
 * @param {Buffer} sal
 * @param {{ N: number, r: number, p: number }} costo
 * @param {number} largo
 * @returns {Promise<Buffer>}
 */
function derivarClave(contrasena, sal, costo, largo) {
  return new Promise((resolve, reject) => {
    scrypt(contrasena.normalize("NFKC"), sal, largo, costo, (error, clave) => {
      if (error) reject(error);
      else resolve(clave);
    });
  });
}

/**
 * Calcula el hash que se guarda en la base de datos, con el formato
 * "scrypt$N$r$p$sal$clave" (sal y clave en hexadecimal).
 * @param {string} contrasena
 * @returns {Promise<string>}
 */
export async function generarHash(contrasena) {
  const sal = randomBytes(16);
  const clave = await derivarClave(contrasena, sal, COSTO, LARGO_CLAVE);
  return ["scrypt", COSTO.N, COSTO.r, COSTO.p, sal.toString("hex"), clave.toString("hex")].join("$");
}

/**
 * Indica si la contraseña corresponde al hash guardado.
 * @param {string} contrasena
 * @param {string} hash
 * @returns {Promise<boolean>}
 */
export async function verificarContrasena(contrasena, hash) {
  const [algoritmo, N, r, p, sal, clave] = hash.split("$");
  if (algoritmo !== "scrypt" || !sal || !clave) return false;

  const esperada = Buffer.from(clave, "hex");
  const calculada = await derivarClave(
    contrasena,
    Buffer.from(sal, "hex"),
    { N: Number(N), r: Number(r), p: Number(p) },
    esperada.length
  );
  // Comparación en tiempo constante: no revela cuántos caracteres coinciden.
  return timingSafeEqual(calculada, esperada);
}
