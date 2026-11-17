// Prepara la base de datos de Autos Colombia.
//
//   npm run db:setup  -> crea la base (si no existe), las tablas, los datos iniciales
//                        y la cuenta inicial de administrador
//   npm run db:reset  -> borra las tablas y las vuelve a crear con los datos iniciales
//
// Usa las variables DATABASE_URL, ADMIN_USUARIO y ADMIN_CONTRASENA del archivo .env.

import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import pg from "pg";
import { generarHash } from "../src/lib/contrasenas.mjs";

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
      await cliente.query("DROP TABLE IF EXISTS sesion, usuario, registro, vehiculo, celda CASCADE");
      console.log("Tablas anteriores eliminadas.");
    }
    await cliente.query(await readFile("db/schema.sql", "utf8"));
    console.log("Tablas listas (db/schema.sql).");
    await cliente.query(await readFile("db/seed.sql", "utf8"));
    console.log("Datos iniciales cargados (db/seed.sql).");
    await crearAdministradorInicial(cliente);
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

// Crea la primera cuenta de administrador con los datos del archivo .env.
// Las demás cuentas las crea el administrador desde la aplicación (Usuarios > Crear usuario).
async function crearAdministradorInicial(cliente) {
  const { rowCount } = await cliente.query(
    "SELECT 1 FROM usuario WHERE rol = 'ADMINISTRADOR' LIMIT 1"
  );
  if (rowCount > 0) {
    console.log("Ya existe una cuenta de administrador: no se crea otra.");
    return;
  }

  // Mismas reglas que la aplicación (src/modelos/index.ts).
  const nombreUsuario = (process.env.ADMIN_USUARIO ?? "").trim().toLowerCase();
  const contrasena = process.env.ADMIN_CONTRASENA ?? "";
  if (!/^[\p{L}\p{N}._-]{3,30}$/u.test(nombreUsuario) || contrasena.length < 8) {
    throw new Error(
      "define en el archivo .env ADMIN_USUARIO (3 a 30 caracteres: letras, números, punto o guion) " +
        "y ADMIN_CONTRASENA (mínimo 8 caracteres). Puedes copiarlos de .env.example."
    );
  }

  await cliente.query(
    `INSERT INTO usuario (nombre_usuario, nombre, rol, contrasena_hash)
     VALUES ($1, 'Administrador principal', 'ADMINISTRADOR', $2)`,
    [nombreUsuario, await generarHash(contrasena)]
  );
  console.log(
    `Cuenta de administrador "${nombreUsuario}" creada. Su contraseña es la de ADMIN_CONTRASENA en .env.`
  );
}

function explicar(error) {
  if (error.code === "ECONNREFUSED") {
    return `PostgreSQL no responde en ${destino.host}. Verifica que el servicio esté encendido.`;
  }
  if (error.code === "28P01") {
    return "usuario o contraseña incorrectos. Revisa DATABASE_URL en el archivo .env.";
  }
  if (error.code === "23505" && error.constraint === "uq_usuario_nombre_usuario") {
    return "ya existe una cuenta con el nombre de ADMIN_USUARIO. Elige otro en el archivo .env.";
  }
  return error.message;
}
