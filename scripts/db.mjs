// Prepara la base de datos de Autos Colombia.
//
//   npm run db:setup  -> crea la base (si no existe), las tablas y los datos iniciales
//   npm run db:reset  -> borra las tablas y las vuelve a crear con los datos iniciales
//
// Usa la variable DATABASE_URL del archivo .env.

import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import pg from "pg";

const modo = process.argv[2] ?? "setup";

if (existsSync(".env")) process.loadEnvFile(".env");

const url = process.env.DATABASE_URL;
if (!url) {
  console.error(
    "Falta DATABASE_URL. Copia .env.example como .env y ajusta usuario y contraseña de PostgreSQL."
  );
  process.exit(1);
}

const destino = new URL(url);
const nombreBase = decodeURIComponent(destino.pathname.slice(1));

try {
  await crearBaseSiNoExiste();

  const cliente = new pg.Client({ connectionString: url });
  await cliente.connect();
  try {
    if (modo === "reset") {
      await cliente.query("DROP TABLE IF EXISTS registro, vehiculo, celda CASCADE");
      console.log("Tablas anteriores eliminadas.");
    }
    await cliente.query(await readFile("db/schema.sql", "utf8"));
    console.log("Tablas listas (db/schema.sql).");
    await cliente.query(await readFile("db/seed.sql", "utf8"));
    console.log("Datos iniciales cargados (db/seed.sql).");
  } finally {
    await cliente.end();
  }

  console.log(`\nBase de datos "${nombreBase}" lista. Ejecuta: npm run dev`);
} catch (error) {
  console.error(`\nNo se pudo preparar la base de datos: ${explicar(error)}`);
  process.exit(1);
}

// Se conecta a la base administrativa "postgres" del mismo servidor y crea la base del proyecto.
async function crearBaseSiNoExiste() {
  const admin = new URL(url);
  admin.pathname = "/postgres";
  const cliente = new pg.Client({ connectionString: admin.toString() });
  await cliente.connect();
  try {
    const { rowCount } = await cliente.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [nombreBase]
    );
    if (rowCount === 0) {
      await cliente.query(`CREATE DATABASE "${nombreBase.replaceAll('"', '""')}"`);
      console.log(`Base de datos "${nombreBase}" creada.`);
    }
  } finally {
    await cliente.end();
  }
}

function explicar(error) {
  if (error.code === "ECONNREFUSED") {
    return `PostgreSQL no responde en ${destino.host}. Verifica que el servicio esté encendido.`;
  }
  if (error.code === "28P01") {
    return "usuario o contraseña incorrectos. Revisa DATABASE_URL en el archivo .env.";
  }
  return error.message;
}
