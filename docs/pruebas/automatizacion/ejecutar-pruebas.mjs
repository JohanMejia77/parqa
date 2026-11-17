// Ejecuta el plan de pruebas PP-02 (usuarios y celdas) contra el entorno de pruebas
// y guarda una evidencia por caso en docs/pruebas/evidencias.
// Cómo preparar el entorno y ejecutarlo: docs/pruebas/README.md
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";
import { abrirNavegador } from "./navegador.mjs";

const env = process.env;
const BASE = env.PRUEBAS_URL ?? "http://localhost:3100";
const BASE_VACIA = env.PRUEBAS_URL_VACIA ?? "http://localhost:3101";
const BD = env.PRUEBAS_DATABASE_URL;
const SALIDA = process.argv[2] ?? "docs/pruebas/evidencias";

// Las contraseñas de prueba y la conexión se configuran en variables de entorno, nunca en
// archivos del repositorio, y no se escriben en las evidencias.
const CLAVE = { admin: env.ADMIN_PRUEBA_CLAVE, operador: env.OPERADOR_PRUEBA_CLAVE, nueva: env.NUEVA_CUENTA_CLAVE };
if (!BD || !CLAVE.admin || !CLAVE.operador || !CLAVE.nueva) {
  console.error("Faltan variables de entorno. Mira docs/pruebas/README.md.");
  process.exit(1);
}
mkdirSync(SALIDA, { recursive: true });

const bd = new pg.Client({ connectionString: BD });
await bd.connect();
const ui = await abrirNavegador({ base: BASE });

let registro = [];
let comprobaciones = [];
let capturas = [];
const resultados = {};
const log = (linea = "") => registro.push(linea);
const hash = (token) => createHash("sha256").update(token).digest("hex");
const ANONIMO = { quien: "sin sesión", token: null };

function ok(condicion, texto) {
  comprobaciones.push({ texto, ok: Boolean(condicion) });
  log(`   ${condicion ? "[OK]   " : "[FALLA]"} ${texto}`);
  return Boolean(condicion);
}

function ocultar(cuerpo) {
  if (!cuerpo || typeof cuerpo !== "object") return cuerpo;
  return "contrasena" in cuerpo ? { ...cuerpo, contrasena: "<oculta>" } : cuerpo;
}

/** Petición HTTP. `sesion` = { quien, token }. Deja en la evidencia la operación y el estado. */
async function pedir(sesion, metodo, ruta, cuerpo, base = BASE) {
  const headers = {};
  if (sesion.token) headers.Cookie = `ac_sesion=${sesion.token}`;
  let body;
  if (cuerpo !== undefined) {
    headers["Content-Type"] = "application/json";
    body = typeof cuerpo === "string" ? cuerpo : JSON.stringify(cuerpo);
  }
  const r = await fetch(base + ruta, { method: metodo, headers, body, redirect: "manual" });
  const texto = await r.text();
  let json = null;
  try { json = texto ? JSON.parse(texto) : null; } catch {}
  const setCookie = r.headers.getSetCookie?.() ?? [];
  const token = setCookie.map((c) => /^ac_sesion=([^;]*)/.exec(c)?.[1]).find((v) => v !== undefined);
  log(`>> ${metodo} ${ruta}   (${sesion.quien})`);
  if (cuerpo !== undefined) log(`   cuerpo: ${typeof cuerpo === "string" ? JSON.stringify(cuerpo) : JSON.stringify(ocultar(cuerpo))}`);
  const extras = [];
  if (setCookie.length) extras.push("Set-Cookie: " + setCookie.map((c) => c.replace(/^ac_sesion=[^;]*/, "ac_sesion=<oculto>")).join(" | "));
  if (r.headers.get("location")) extras.push("Location: " + r.headers.get("location"));
  log(`<< ${r.status}${extras.length ? "   " + extras.join("   ") : ""}`);
  if (json !== null) log(`   ${texto.length > 700 ? texto.slice(0, 700) + " …" : texto}`);
  return { estado: r.status, json, token, setCookie, location: r.headers.get("location") };
}

async function iniciar(nombreUsuario, contrasena, base = BASE) {
  const r = await pedir(ANONIMO, "POST", "/api/sesion", { nombreUsuario, contrasena }, base);
  return { ...r, sesion: { quien: `sesión de ${nombreUsuario}`, token: r.token ?? null } };
}

async function consulta(descripcion, sql, parametros = [], mostrarParametros = true) {
  const { rows, rowCount } = await bd.query(sql, parametros);
  log(`BD> ${descripcion}`);
  log(`    ${sql.replace(/\s+/g, " ").trim()}${parametros.length && mostrarParametros ? "   " + JSON.stringify(parametros) : ""}`);
  log(`    => ${rows.length ? JSON.stringify(rows) : `${rowCount} fila(s)`}`);
  return rows;
}

async function foto(id, sufijo, nav = ui) {
  await nav.esperar(450);
  const nombre = `${id}-${sufijo}.png`;
  await nav.captura(join(SALIDA, nombre));
  capturas.push(nombre);
  log(`UI> captura: ${nombre}`);
}

async function ver(descripcion, expresion, nav = ui) {
  const valor = await nav.js(expresion);
  log(`UI> ${descripcion}: ${JSON.stringify(valor)}`);
  return valor;
}

const MENU = `[...document.querySelectorAll('header nav a')].map((a) => a.textContent.trim())`;
const TEXTO_PRINCIPAL = `document.querySelector('main').innerText.replace(/\\s+/g, ' ').slice(0, 260)`;
const clicBoton = (texto, ambito = "main") =>
  ui.js(`(() => { const b = [...document.querySelectorAll(${JSON.stringify(ambito + " button")})].find((x) => x.textContent.trim().includes(${JSON.stringify(texto)})); if (!b) return false; b.click(); return true; })()`);

/** Inicia sesión escribiendo en el formulario, como lo haría una persona. */
async function entrarPorFormulario(nombreUsuario, contrasena) {
  await ui.cookie(null);
  await ui.ir("/login");
  await ui.llenar("#nombreUsuario", nombreUsuario);
  await ui.llenar("#contrasena", contrasena);
  log(`UI> /login: se escribe el usuario "${nombreUsuario}" y su contraseña (oculta) y se envía el formulario`);
  await ui.tecla("Enter");
  await ui.esperar(2600);
}

async function caso(id, titulo, ejecutar) {
  registro = [];
  comprobaciones = [];
  capturas = [];
  try {
    await ejecutar();
  } catch (error) {
    ok(false, `La ejecución se interrumpió: ${error.message}`);
  }
  const aprobado = comprobaciones.length > 0 && comprobaciones.every((c) => c.ok);
  const archivo = `${id}.txt`;
  writeFileSync(
    join(SALIDA, archivo),
    [
      `${id} · ${titulo}`,
      `Plan PP-02 · Autos Colombia 0.2.0 (compilación de producción) · ${BASE} · base autos_colombia_pruebas`,
      `Ejecutado: ${new Date().toLocaleString("es-CO", { timeZone: "America/Bogota" })} (hora de Colombia)`,
      "Las contraseñas y los tokens de sesión se ocultan a propósito.",
      "",
      ...registro,
      "",
      `Resultado: ${aprobado ? "APROBADO" : "FALLIDO"} (${comprobaciones.filter((c) => c.ok).length} de ${comprobaciones.length} comprobaciones)`,
      "",
    ].join("\n")
  );
  resultados[id] = { titulo, estado: aprobado ? "Aprobado" : "Fallido", comprobaciones, evidencias: [archivo, ...capturas] };
  console.log(`${aprobado ? "APROBADO" : "FALLIDO "}  ${id}  ${titulo}  (${comprobaciones.filter((c) => c.ok).length}/${comprobaciones.length})`);
}

const contar = async (tabla) => Number((await bd.query(`SELECT count(*) AS n FROM ${tabla}`)).rows[0].n);
const sinSecretos = (objeto) => !Object.keys(objeto ?? {}).some((k) => /contrasena|hash|clave|password|token/i.test(k));

// =============================================================
// Preparación: cuentas y celdas que pide el plan (sección Preparación)
// =============================================================
const ids = {};
let A; // sesión de admin_prueba
let O; // sesión de operador_prueba
await caso("00-preparacion", "Preparación del conjunto de prueba", async () => {
  A = (await iniciar("admin_prueba", CLAVE.admin)).sesion;
  ok(A.token, "admin_prueba (rol ADMINISTRADOR) existe y puede iniciar sesión");
  const u = await pedir(A, "POST", "/api/usuarios", { nombre: "Operador de Prueba", nombreUsuario: "operador_prueba", contrasena: CLAVE.operador, rol: "OPERADOR" });
  ok(u.estado === 201, "operador_prueba creado con rol OPERADOR");
  for (const [clave, codigo, tipo] of [["libre", "T-LIBRE-01", "CARRO"], ["hist", "T-HIST-01", "CARRO"], ["ocup", "T-OCUP-01", "CARRO"], ["elim", "T-ELIM-01", "MOTO"]]) {
    const r = await pedir(A, "POST", "/api/celdas", { codigo, tipo });
    ids[clave] = r.json?.id;
    ok(r.estado === 201, `celda ${codigo} creada`);
  }
  O = (await iniciar("operador_prueba", CLAVE.operador)).sesion;
  ok(O.token, "operador_prueba puede iniciar sesión");
  ok((await pedir(O, "POST", "/api/entradas", { placa: "TST001", celdaId: ids.hist })).estado === 201, "T-HIST-01: entrada de TST001");
  ok((await pedir(O, "POST", "/api/salidas", { placa: "TST001" })).estado === 200, "T-HIST-01: salida de TST001 (queda libre y con historial)");
  ok((await pedir(O, "POST", "/api/entradas", { placa: "TST002", celdaId: ids.ocup })).estado === 201, "T-OCUP-01: entrada de TST002 (queda ocupada)");
  await consulta("Estado de las celdas de prueba", `SELECT c.codigo, c.tipo, (SELECT count(*)::int FROM registro r WHERE r.celda_id = c.id) AS movimientos, EXISTS (SELECT 1 FROM registro r WHERE r.celda_id = c.id AND r.fecha_salida IS NULL) AS ocupada FROM celda c WHERE c.codigo LIKE 'T-%' ORDER BY c.codigo`);
  ok(!(await bd.query("SELECT 1 FROM celda WHERE codigo IN ('T-NUEVA-01', 'T-CONC-01')")).rowCount, "T-NUEVA-01 y T-CONC-01 no existen todavía");
});

// =============================================================
// Usuarios
// =============================================================
await caso("US-01", "Login del administrador (SD01)", async () => {
  const r = await iniciar("admin_prueba", CLAVE.admin);
  ok(r.estado === 200 && r.json?.rol === "ADMINISTRADOR", "API de login: 200 y rol ADMINISTRADOR");
  ok(r.setCookie.some((c) => /HttpOnly/i.test(c) && /SameSite=lax/i.test(c)), "la cookie de sesión es HttpOnly y SameSite=Lax");
  ok(sinSecretos(r.json), "la respuesta no incluye contraseña ni hash");
  await entrarPorFormulario("admin_prueba", CLAVE.admin);
  const ruta = await ver("página a la que llega", "location.pathname");
  const menu = await ver("opciones del menú", MENU);
  ok(ruta === "/celdas", "acceso concedido: llega a Celdas");
  ok(menu.join() === "Celdas,Usuarios", "el menú muestra Celdas y Usuarios");
  ok(!menu.some((m) => /Entrada|Salida|Panel|Historial/.test(m)), "no se muestran operaciones de entrada/salida");
  await foto("US-01", "menu-administrador");
});

await caso("US-02", "Login del operador (SD01)", async () => {
  const r = await iniciar("operador_prueba", CLAVE.operador);
  ok(r.estado === 200 && r.json?.rol === "OPERADOR", "API de login: 200 y rol OPERADOR");
  await entrarPorFormulario("operador_prueba", CLAVE.operador);
  const ruta = await ver("página a la que llega", "location.pathname");
  const menu = await ver("opciones del menú", MENU);
  ok(ruta === "/", "acceso concedido: llega al Panel");
  ok(menu.join() === "Panel,Entrada,Salida,Historial", "el menú muestra Panel (consulta de vehículos), Entrada, Salida e Historial");
  ok(!menu.some((m) => /Usuarios|Celdas/.test(m)), "no aparecen Usuarios ni administración de celdas");
  await foto("US-02", "menu-operador");
});

await caso("US-03", "Credenciales incorrectas (SD01)", async () => {
  const mala = await iniciar("admin_prueba", "clave-incorrecta-123");
  const inexistente = await iniciar("usuario_que_no_existe", "clave-incorrecta-123");
  ok(mala.estado === 401, "usuario existente con clave incorrecta: 401");
  ok(inexistente.estado === 401, "usuario inexistente: 401");
  ok(mala.json?.error === inexistente.json?.error, `mismo mensaje genérico en las dos variantes: "${mala.json?.error}"`);
  ok(!mala.token && !inexistente.token, "ningún intento entrega cookie de sesión");
  ok((await pedir(ANONIMO, "GET", "/api/usuarios")).estado === 401, "sin sesión no se entra a un módulo protegido por API: 401");
  const pagina = await pedir(ANONIMO, "GET", "/celdas");
  ok(pagina.estado === 307 && pagina.location?.endsWith("/login"), "sin sesión, la página protegida redirige a /login");
  await entrarPorFormulario("admin_prueba", "clave-incorrecta-123");
  const mensaje = await ver("mensaje en pantalla", `document.querySelector('[role=alert]')?.innerText.replace(/\\s+/g, ' ')`);
  ok((await ver("página", "location.pathname")) === "/login" && /incorrectos/.test(mensaje ?? ""), "la interfaz rechaza el intento con el mensaje genérico y sigue en /login");
  ok((await ui.tokenActual()) === null, "el navegador no recibe sesión");
  await foto("US-03", "credenciales-incorrectas");
  await ui.ir("/celdas");
  ok((await ver("al pedir /celdas sin sesión", "location.pathname")) === "/login", "no se permite entrar al módulo: vuelve a /login");
});

await caso("US-04", "Campos obligatorios del login (SD01)", async () => {
  const sinUsuario = await pedir(ANONIMO, "POST", "/api/sesion", { nombreUsuario: "", contrasena: "cualquiera-123" });
  const sinClave = await pedir(ANONIMO, "POST", "/api/sesion", { nombreUsuario: "admin_prueba", contrasena: "" });
  const vacio = await pedir(ANONIMO, "POST", "/api/sesion", {});
  ok(sinUsuario.estado === 422 && sinUsuario.json?.campo === "nombreUsuario", "API con usuario vacío: 422 e indica el campo nombreUsuario");
  ok(sinClave.estado === 422 && sinClave.json?.campo === "contrasena", "API con clave vacía: 422 e indica el campo contrasena");
  ok(vacio.estado === 422, "API sin ningún dato: 422");
  ok(!sinUsuario.token && !sinClave.token && !vacio.token, "el servidor no crea sesión en ningún caso");
  await ui.cookie(null);
  await ui.ir("/login");
  await ui.tecla("Enter");
  const usuarioVacio = await ver("envío con usuario vacío (validación del navegador)", `(() => { const f = document.querySelector('main form'); f.requestSubmit?.(); const u = document.querySelector('#nombreUsuario'); return { formularioValido: f.checkValidity(), faltaUsuario: u.validity.valueMissing, mensaje: u.validationMessage }; })()`);
  ok(usuarioVacio.formularioValido === false && usuarioVacio.faltaUsuario, "la interfaz indica que falta el usuario y no envía el formulario");
  await ui.llenar("#nombreUsuario", "admin_prueba");
  await ui.tecla("Enter");
  const claveVacia = await ver("envío con clave vacía (validación del navegador)", `(() => { const c = document.querySelector('#contrasena'); return { faltaClave: c.validity.valueMissing, mensaje: c.validationMessage, pagina: location.pathname }; })()`);
  ok(claveVacia.faltaClave && claveVacia.pagina === "/login", "la interfaz indica que falta la contraseña y sigue en /login");
  ok((await ui.tokenActual()) === null, "no se creó sesión");
  await foto("US-04", "campos-obligatorios");
});

await caso("US-05", "Sesión vencida o revocada (SD02)", async () => {
  const vencida = (await iniciar("admin_prueba", CLAVE.admin)).sesion;
  const revocada = (await iniciar("admin_prueba", CLAVE.admin)).sesion;
  vencida.quien = "sesión vencida";
  revocada.quien = "sesión revocada";
  const v = await bd.query("UPDATE sesion SET expira_en = now() - interval '1 minute' WHERE token_hash = $1", [hash(vencida.token)]);
  log(`BD> se vence una sesión: UPDATE sesion SET expira_en = now() - interval '1 minute' WHERE token_hash = <hash de la sesión>  => ${v.rowCount} fila(s)`);
  const d = await bd.query("DELETE FROM sesion WHERE token_hash = $1", [hash(revocada.token)]);
  log(`BD> se revoca otra sesión: DELETE FROM sesion WHERE token_hash = <hash de la sesión>  => ${d.rowCount} fila(s)`);
  ok(v.rowCount === 1 && d.rowCount === 1, "se prepararon una sesión vencida y una revocada");
  const antes = await contar("celda");
  for (const sesion of [vencida, revocada]) {
    ok((await pedir(sesion, "GET", "/api/celdas")).estado === 401, `${sesion.quien}: la consulta protegida responde 401`);
    ok((await pedir(sesion, "POST", "/api/celdas", { codigo: "T-US05-1", tipo: "CARRO" })).estado === 401, `${sesion.quien}: la operación protegida responde 401`);
  }
  ok((await contar("celda")) === antes && !(await bd.query("SELECT 1 FROM celda WHERE codigo = 'T-US05-1'")).rowCount, "no se consultó ni se cambió información: el catálogo sigue igual");
  await ui.cookie(vencida.token);
  await ui.ir("/celdas", 2600);
  ok((await ver("página con la sesión vencida", "location.pathname")) === "/login", "la interfaz solicita autenticarse (vuelve a /login)");
  await foto("US-05", "sesion-vencida");
});

await caso("US-06", "Cierre de sesión efectivo (SD12)", async () => {
  for (const [usuario, clave] of [["admin_prueba", CLAVE.admin], ["operador_prueba", CLAVE.operador]]) {
    const s = (await iniciar(usuario, clave)).sesion;
    ok((await pedir(s, "GET", "/api/sesion")).estado === 200, `${usuario}: la sesión es válida antes de cerrar`);
    ok((await pedir(s, "DELETE", "/api/sesion")).estado === 204, `${usuario}: cierre de sesión por API: 204`);
    s.quien = `sesión anterior de ${usuario}, ya cerrada`;
    ok((await pedir(s, "GET", "/api/sesion")).estado === 401, `${usuario}: la sesión anterior ya no autoriza solicitudes (401)`);
    ok(!(await bd.query("SELECT 1 FROM sesion WHERE token_hash = $1", [hash(s.token)])).rowCount, `${usuario}: la sesión ya no existe en la base de datos`);
  }
  await entrarPorFormulario("admin_prueba", CLAVE.admin);
  const anterior = { quien: "cookie anterior del navegador", token: await ui.tokenActual() };
  ok(anterior.token, "se inicia sesión en el navegador");
  await clicBoton("Cerrar sesión", "header");
  await ui.esperar(2600);
  ok((await ver("página después de pulsar Cerrar sesión", "location.pathname")) === "/login", "se muestra el login");
  await foto("US-06", "despues-de-cerrar");
  await ui.ir("/celdas");
  ok((await ver("al volver a abrir una ruta protegida", "location.pathname")) === "/login", "la ruta protegida vuelve a pedir autenticación");
  ok((await pedir(anterior, "GET", "/api/celdas")).estado === 401, "reutilizar la sesión anterior por API responde 401");
});

await caso("US-07", "Crear una cuenta de operador (SD03)", async () => {
  await ui.cookie(A.token);
  await ui.ir("/usuarios");
  await clicBoton("Crear usuario");
  await ui.esperar(500);
  await ui.llenar("dialog[open] #nombre", "Operador Nuevo");
  await ui.llenar("dialog[open] #nombreUsuario", "operador_nuevo");
  await ui.clic("dialog[open] input[name=rol][value=OPERADOR]");
  await ui.llenar("dialog[open] #contrasena", CLAVE.nueva);
  log('UI> Usuarios > Crear usuario: nombre "Operador Nuevo", usuario "operador_nuevo", rol OPERADOR y una contraseña (oculta)');
  await foto("US-07", "formulario");
  await ui.tecla("Enter");
  await ui.esperar(2600);
  const aviso = await ver("aviso", `document.querySelector('[role=status]')?.innerText.replace(/\\s+/g, ' ')`);
  ok(/Cuenta creada/.test(aviso ?? "") && /operador_nuevo/.test(aviso ?? ""), "la interfaz confirma la cuenta creada");
  await foto("US-07", "cuenta-creada");
  const filas = await consulta("Cuentas con ese usuario", "SELECT nombre_usuario, nombre, rol FROM usuario WHERE nombre_usuario = 'operador_nuevo'");
  ok(filas.length === 1 && filas[0].rol === "OPERADOR", "se creó una sola cuenta, con su perfil (nombre) y rol OPERADOR en la misma fila");
  const nuevo = await iniciar("operador_nuevo", CLAVE.nueva);
  ok(nuevo.estado === 200 && nuevo.json?.rol === "OPERADOR", "la cuenta nueva puede iniciar sesión");
  ok((await pedir(nuevo.sesion, "GET", "/api/celdas/disponibles")).estado === 200, "recibe los permisos de operador (consulta de disponibilidad: 200)");
  ok((await pedir(nuevo.sesion, "POST", "/api/usuarios", { nombre: "Otra Persona", nombreUsuario: "no_debe_crearse", contrasena: CLAVE.nueva, rol: "OPERADOR" })).estado === 403, "no recibe permisos de administrador (crear usuarios: 403)");
  ok((await pedir(nuevo.sesion, "GET", "/api/celdas")).estado === 403, "no recibe permisos de administrador (catálogo de celdas: 403)");
  const porApi = await pedir(A, "POST", "/api/usuarios", { nombre: "Operador por API", nombreUsuario: "operador_api", contrasena: CLAVE.nueva, rol: "OPERADOR" });
  ok(porApi.estado === 201 && porApi.json?.rol === "OPERADOR", "API de creación: 201 (segunda cuenta de operador, creada por API)");
});

let N; // sesión de admin_nuevo
await caso("US-08", "Crear una cuenta de administrador (SD03)", async () => {
  const creada = await pedir(A, "POST", "/api/usuarios", { nombre: "Admin Nuevo", nombreUsuario: "admin_nuevo", contrasena: CLAVE.nueva, rol: "ADMINISTRADOR" });
  ok(creada.estado === 201 && creada.json?.rol === "ADMINISTRADOR", "API de creación: 201 con rol ADMINISTRADOR");
  await entrarPorFormulario("admin_nuevo", CLAVE.nueva);
  N = { quien: "sesión de admin_nuevo", token: await ui.tokenActual() };
  const menu = await ver("menú de la cuenta nueva", MENU);
  ok(menu.join() === "Celdas,Usuarios", "la cuenta nueva entra y ve Celdas y Usuarios");
  await ui.ir("/usuarios");
  ok(/Crear usuario/.test(await ver("página Usuarios", TEXTO_PRINCIPAL)), "puede acceder a Crear usuarios");
  await foto("US-08", "administrador-nuevo");
  ok((await pedir(N, "GET", "/api/usuarios")).estado === 200, "API: puede consultar usuarios (200)");
  ok((await pedir(N, "GET", "/api/celdas")).estado === 200, "API: puede gestionar celdas (200)");
  ok((await pedir(N, "POST", "/api/entradas", { placa: "TST901", celdaId: ids.libre })).estado === 403, "no recibe permisos del operador (registrar entrada: 403)");
  ok((await pedir(N, "GET", "/api/celdas/disponibles")).estado === 403, "no recibe permisos del operador (disponibilidad: 403)");
});

await caso("US-09", "Usuario de acceso duplicado (SD03)", async () => {
  const antes = await contar("usuario");
  const igual = await pedir(A, "POST", "/api/usuarios", { nombre: "Otro Operador", nombreUsuario: "operador_prueba", contrasena: CLAVE.nueva, rol: "OPERADOR" });
  const mayusculas = await pedir(A, "POST", "/api/usuarios", { nombre: "Otro Operador", nombreUsuario: " OPERADOR_PRUEBA ", contrasena: CLAVE.nueva, rol: "OPERADOR" });
  ok(igual.estado === 409, "API: 409 con el mismo usuario de acceso");
  ok(mayusculas.estado === 409, "API: 409 también si cambia mayúsculas o espacios");
  const filas = await consulta("Cuentas con ese usuario", "SELECT id, nombre FROM usuario WHERE nombre_usuario = 'operador_prueba'");
  ok(filas.length === 1 && filas[0].nombre === "Operador de Prueba", "sigue existiendo una sola cuenta, con sus datos originales");
  ok((await contar("usuario")) === antes, "no quedó ninguna cuenta ni perfil adicional");
  await ui.cookie(A.token);
  await ui.ir("/usuarios");
  await clicBoton("Crear usuario");
  await ui.esperar(500);
  await ui.llenar("dialog[open] #nombre", "Otro Operador");
  await ui.llenar("dialog[open] #nombreUsuario", "operador_prueba");
  await ui.clic("dialog[open] input[name=rol][value=OPERADOR]");
  await ui.llenar("dialog[open] #contrasena", CLAVE.nueva);
  await ui.tecla("Enter");
  await ui.esperar(2200);
  const error = await ver("error en el diálogo", `document.querySelector('dialog[open] [role=alert]')?.innerText`);
  ok(/Ya existe una cuenta/.test(error ?? ""), "la interfaz rechaza la duplicación y explica el motivo bajo el campo Usuario");
  await foto("US-09", "usuario-duplicado");
  ok((await contar("usuario")) === antes, "tampoco se creó nada desde la interfaz");
});

await caso("US-10", "Campos obligatorios al crear usuario (SD03)", async () => {
  log("Contrato implementado: nombre (3 a 80 caracteres), nombreUsuario (3 a 30: letras, números, punto, guion, guion bajo),");
  log("contrasena (8 a 72 caracteres) y rol (ADMINISTRADOR u OPERADOR). Los cuatro son obligatorios.");
  const antes = await contar("usuario");
  const completo = { nombre: "Persona Prueba", nombreUsuario: "campos_prueba", contrasena: CLAVE.nueva, rol: "OPERADOR" };
  for (const campo of ["nombre", "nombreUsuario", "contrasena", "rol"]) {
    const cuerpo = { ...completo };
    delete cuerpo[campo];
    const r = await pedir(A, "POST", "/api/usuarios", cuerpo);
    ok(r.estado === 422 && r.json?.campo === campo, `API sin "${campo}": 422 e indica ese campo`);
  }
  const espacios = await pedir(A, "POST", "/api/usuarios", { ...completo, nombre: "     " });
  ok(espacios.estado === 422 && espacios.json?.campo === "nombre", "API con nombre de solo espacios: 422");
  ok((await contar("usuario")) === antes && !(await bd.query("SELECT 1 FROM usuario WHERE nombre_usuario = 'campos_prueba'")).rowCount, "no se creó la cuenta ni un perfil incompleto");
  await ui.cookie(A.token);
  await ui.ir("/usuarios");
  await clicBoton("Crear usuario");
  await ui.esperar(500);
  const vacio = await ver("envío con el formulario vacío (validación del navegador)", `(() => { const f = document.querySelector('dialog[open] form'); f.requestSubmit(); return { formularioValido: f.checkValidity(), faltan: [...f.querySelectorAll('input:invalid')].map((e) => e.name).filter((n, i, a) => a.indexOf(n) === i) }; })()`);
  ok(vacio.formularioValido === false && vacio.faltan.length === 4, "la interfaz exige los cuatro campos antes de enviar");
  await ui.llenar("dialog[open] #nombre", "     ");
  await ui.llenar("dialog[open] #nombreUsuario", "campos_prueba");
  await ui.clic("dialog[open] input[name=rol][value=OPERADOR]");
  await ui.llenar("dialog[open] #contrasena", CLAVE.nueva);
  await ui.tecla("Enter");
  await ui.esperar(2200);
  const error = await ver("error del servidor con nombre de solo espacios", `document.querySelector('dialog[open] [role=alert]')?.innerText`);
  ok(/nombre completo/.test(error ?? ""), "el servidor rechaza el nombre de solo espacios y la interfaz lo muestra bajo el campo");
  await foto("US-10", "nombre-solo-espacios");
  ok((await contar("usuario")) === antes, "sigue sin crearse ninguna cuenta");
});

await caso("US-11", "Rol inválido enviado por API (SD03)", async () => {
  const antes = await contar("usuario");
  for (const rol of ["SUPERUSUARIO", "administrador", "", 7]) {
    const r = await pedir(A, "POST", "/api/usuarios", { nombre: "Rol Inválido", nombreUsuario: "rol_prueba", contrasena: CLAVE.nueva, rol });
    ok(r.estado === 422 && r.json?.campo === "rol", `rol ${JSON.stringify(rol)}: 422`);
  }
  ok((await contar("usuario")) === antes, "no se creó ninguna cuenta");
  const roles = await consulta("Roles guardados", "SELECT rol, count(*)::int AS cuentas FROM usuario GROUP BY rol ORDER BY rol");
  ok(roles.every((r) => ["ADMINISTRADOR", "OPERADOR"].includes(r.rol)), "en la base solo existen los roles ADMINISTRADOR y OPERADOR");
});

await caso("US-12", "Protección de la contraseña (SD01 y SD03)", async () => {
  const creada = await pedir(A, "POST", "/api/usuarios", { nombre: "Cuenta Ficticia", nombreUsuario: "clave_prueba", contrasena: CLAVE.nueva, rol: "OPERADOR" });
  ok(creada.estado === 201 && sinSecretos(creada.json), `la respuesta de creación no expone contraseña ni hash (campos: ${Object.keys(creada.json ?? {}).join(", ")})`);
  const lista = await pedir(A, "GET", "/api/usuarios");
  ok(lista.estado === 200 && lista.json.every(sinSecretos), "la consulta de usuarios tampoco expone contraseña ni hash");
  const [fila] = (await bd.query(
    "SELECT left(contrasena_hash, 17) AS formato, length(contrasena_hash) AS largo, contrasena_hash = $1 AS es_texto_plano, position($1 in contrasena_hash) > 0 AS contiene_la_clave FROM usuario WHERE nombre_usuario = 'clave_prueba'",
    [CLAVE.nueva]
  )).rows;
  log("BD> Almacenamiento de la contraseña (se compara con la contraseña de prueba, que no se muestra; sal y clave derivada omitidas)");
  log(`    => ${JSON.stringify(fila)}`);
  ok(fila.formato === "scrypt$16384$8$5$" && fila.largo > 100, "en persistencia se guarda un hash scrypt con sal, no la contraseña");
  ok(fila.es_texto_plano === false && fila.contiene_la_clave === false, "el valor guardado no es ni contiene la contraseña en texto plano");
  const dos = await consulta("Dos cuentas con la misma contraseña tienen hashes distintos (sal aleatoria)", "SELECT count(DISTINCT contrasena_hash)::int AS hashes_distintos, count(*)::int AS cuentas FROM usuario WHERE nombre_usuario IN ('clave_prueba', 'operador_nuevo', 'admin_nuevo')");
  ok(dos[0].hashes_distintos === dos[0].cuentas, "cada cuenta tiene su propia sal");
  ok((await iniciar("clave_prueba", CLAVE.nueva)).estado === 200, "el login funciona con la cuenta");
});

// =============================================================
// Permisos
// =============================================================
await caso("PE-01", "Solicitudes sin autenticación (SD02)", async () => {
  const usuarios = await contar("usuario");
  const celdas = await contar("celda");
  ok((await pedir(ANONIMO, "POST", "/api/usuarios", { nombre: "Sin Sesión", nombreUsuario: "pe01_prueba", contrasena: CLAVE.nueva, rol: "OPERADOR" })).estado === 401, "crear usuario sin sesión: 401");
  ok((await pedir(ANONIMO, "POST", "/api/celdas", { codigo: "T-PE01-1", tipo: "CARRO" })).estado === 401, "crear celda sin sesión: 401");
  ok((await contar("usuario")) === usuarios && (await contar("celda")) === celdas, "no se crearon usuarios ni celdas");
});

await caso("PE-02", "Operador intenta crear usuarios (SD02 y SD03)", async () => {
  const antes = await contar("usuario");
  await ui.cookie(O.token);
  await ui.ir("/usuarios", 2200);
  const texto = await ver("página /usuarios con sesión de operador", TEXTO_PRINCIPAL);
  ok(/no tiene permiso/.test(texto) && !/Crear usuario/.test(texto), "la interfaz impide el acceso administrativo");
  await foto("PE-02", "operador-en-usuarios");
  ok((await pedir(O, "POST", "/api/usuarios", { nombre: "No Permitido", nombreUsuario: "pe02_prueba", contrasena: CLAVE.nueva, rol: "OPERADOR" })).estado === 403, "API de creación con sesión de operador: 403");
  ok((await pedir(O, "GET", "/api/usuarios")).estado === 403, "API de consulta de usuarios con sesión de operador: 403");
  ok((await contar("usuario")) === antes, "no se creó cuenta ni perfil");
});

await caso("PE-03", "Operador intenta administrar celdas (SD02 y SD04 a SD07)", async () => {
  const celdas = await contar("celda");
  ok((await pedir(O, "GET", "/api/celdas")).estado === 403, "GET del catálogo: 403");
  ok((await pedir(O, "GET", `/api/celdas/${ids.libre}`)).estado === 403, "GET de una celda: 403");
  ok((await pedir(O, "POST", "/api/celdas", { codigo: "T-PE03-1", tipo: "CARRO" })).estado === 403, "POST (crear): 403");
  ok((await pedir(O, "PATCH", `/api/celdas/${ids.libre}`, { codigo: "T-PE03-2" })).estado === 403, "edición: 403");
  ok((await pedir(O, "DELETE", `/api/celdas/${ids.libre}`)).estado === 403, "DELETE: 403");
  const fila = await consulta("La celda de prueba después de los intentos", "SELECT id, codigo, tipo FROM celda WHERE id = $1", [ids.libre]);
  ok(fila[0]?.codigo === "T-LIBRE-01" && fila[0]?.tipo === "CARRO" && (await contar("celda")) === celdas, "el catálogo y la celda no cambiaron");
  await ui.cookie(O.token);
  await ui.ir("/celdas", 2200);
  const texto = await ver("página /celdas con sesión de operador", TEXTO_PRINCIPAL);
  ok(/no tiene permiso/.test(texto) && !/Nueva celda|Editar|Eliminar/.test(texto), "la interfaz no ofrece la administración de celdas al operador");
  await foto("PE-03", "operador-en-celdas");
});

await caso("PE-04", "Administrador intenta registrar accesos (SD02)", async () => {
  const sql = "SELECT count(*)::int AS total, count(*) FILTER (WHERE fecha_salida IS NULL)::int AS abiertas FROM registro";
  const [antes] = await consulta("Estancias antes", sql);
  ok((await pedir(A, "POST", "/api/entradas", { placa: "TST900", celdaId: ids.libre })).estado === 403, "registrar entrada con sesión de administrador: 403");
  ok((await pedir(A, "POST", "/api/salidas", { placa: "TST002" })).estado === 403, "registrar salida con sesión de administrador: 403");
  const [despues] = await consulta("Estancias después", sql);
  ok(antes.total === despues.total && antes.abiertas === despues.abiertas, "no se crearon ni cerraron estancias");
  await ui.cookie(A.token);
  await ui.ir("/entrada", 2200);
  ok(/no tiene permiso/.test(await ver("página /entrada con sesión de administrador", TEXTO_PRINCIPAL)), "la interfaz tampoco le ofrece registrar entradas");
  await foto("PE-04", "administrador-en-entrada");
});

await caso("PE-05", "Operador consulta disponibilidad (SD08)", async () => {
  const sql = "SELECT count(*)::int AS total, count(*) FILTER (WHERE fecha_salida IS NULL)::int AS abiertas FROM registro";
  const [antes] = await consulta("Estancias antes", sql);
  const libres = await pedir(O, "GET", "/api/celdas/disponibles?tipo=CARRO");
  const codigos = (libres.json ?? []).map((c) => c.codigo);
  ok(libres.estado === 200 && codigos.includes("T-LIBRE-01"), "puede consultar: la celda libre T-LIBRE-01 aparece disponible");
  ok(!codigos.includes("T-OCUP-01"), "la celda ocupada T-OCUP-01 no aparece disponible");
  await ui.cookie(O.token);
  await ui.ir("/entrada", 2200);
  await ui.llenar("#placa", "TST777");
  await ui.esperar(400);
  const plano = await ver("plano del formulario de entrada", `(() => ({ seleccionables: [...document.querySelectorAll('main button[aria-pressed]')].map((b) => b.textContent.replace(/(libre|seleccionada)$/, '')).filter((c) => c.startsWith('T-')), ocupada: document.querySelector('[title*="T-OCUP-01"]')?.title, botonesDeAdministracion: [...document.querySelectorAll('main button')].filter((b) => /Nueva celda|Editar|Eliminar/.test(b.textContent)).length }))()`);
  ok(plano.seleccionables.includes("T-LIBRE-01") && !plano.seleccionables.includes("T-OCUP-01"), "en la interfaz puede seleccionar la celda libre y no la ocupada");
  ok(/ocupada/.test(plano.ocupada ?? ""), "la celda ocupada se muestra como ocupada");
  ok(plano.botonesDeAdministracion === 0, "no recibe botones ni permisos de administración");
  await ui.clic(`main button[aria-pressed]:nth-of-type(1)`).catch(() => {});
  await foto("PE-05", "disponibilidad-operador");
  await pedir(O, "GET", "/api/celdas/disponibles?tipo=CARRO");
  const [despues] = await consulta("Estancias después de consultar y seleccionar", sql);
  ok(antes.total === despues.total && antes.abiertas === despues.abiertas, "la consulta no reserva la celda: no se creó ninguna estancia");
});

// =============================================================
// Celdas
// =============================================================
await caso("CE-01", "Listar y buscar celdas (SD04)", async () => {
  const lista = await pedir(A, "GET", "/api/celdas");
  const libre = lista.json?.find((c) => c.codigo === "T-LIBRE-01");
  const hist = lista.json?.find((c) => c.codigo === "T-HIST-01");
  ok(lista.estado === 200 && libre && hist, "el catálogo incluye T-LIBRE-01 y T-HIST-01");
  ok(libre?.tipo === "CARRO" && libre?.placaOcupante === null && libre?.movimientos === 0, "T-LIBRE-01: tipo CARRO, libre y sin movimientos");
  ok(hist?.placaOcupante === null && hist?.movimientos === 1, "T-HIST-01: libre y con 1 movimiento en el historial");
  ok(lista.json?.length === (await contar("celda")), `sin paginación: la lista trae todas las celdas (${lista.json?.length}), igual que la base`);
  const busqueda = await pedir(A, "GET", "/api/celdas?buscar=T-LIBRE-01");
  ok(busqueda.json?.length === 1 && busqueda.json[0].codigo === "T-LIBRE-01", "la búsqueda identifica solo la celda buscada");
  await ui.cookie(A.token);
  await ui.ir("/celdas", 2200);
  ok(/celdas/.test((await ver("Gestionar celdas", `document.querySelector('[data-slot=card-description]')?.innerText`)) ?? ""), "la interfaz muestra el catálogo con su resumen");
  await foto("CE-01", "catalogo");
  await ui.llenar("#buscar", "t-libre-01");
  await ui.tecla("Enter");
  await ui.esperar(2200);
  const filas = await ver("filas después de buscar T-LIBRE-01", `[...document.querySelectorAll('tbody tr')].map((f) => f.innerText.replace(/\\s+/g, ' '))`);
  ok(filas.length === 1 && filas[0].startsWith("T-LIBRE-01 Carro Libre"), "la interfaz muestra los datos correctos de la celda buscada");
  await foto("CE-01", "busqueda");
});

await caso("CE-02", "Catálogo sin registros (SD04)", async () => {
  log(`Entorno de este caso: ${BASE_VACIA} · base autos_colombia_vacia (misma versión, sin celdas)`);
  const vacia = await abrirNavegador({ base: BASE_VACIA });
  try {
    const s = await iniciar("admin_prueba", CLAVE.admin, BASE_VACIA);
    const lista = await pedir(s.sesion, "GET", "/api/celdas", undefined, BASE_VACIA);
    ok(lista.estado === 200 && Array.isArray(lista.json) && lista.json.length === 0, "API: 200 con una lista vacía");
    await vacia.cookie(s.token);
    await vacia.ir("/celdas", 2600);
    const texto = await ver("página Celdas sin registros", TEXTO_PRINCIPAL, vacia);
    ok(/Aún no hay celdas/.test(texto) && !/No se pudo cargar/.test(texto), "la interfaz informa que no hay registros, sin error del servidor");
    await foto("CE-02", "catalogo-vacio", vacia);
  } finally {
    await vacia.cerrar();
  }
});

await caso("CE-03", "Consultar celda inexistente (SD04)", async () => {
  const r = await pedir(A, "GET", "/api/celdas/999999");
  ok(r.estado === 404, "API: 404");
  ok(typeof r.json?.error === "string" && !("codigo" in (r.json ?? {})), `mensaje comprensible y no se devuelve otra celda: "${r.json?.error}"`);
  ok((await pedir(A, "GET", "/api/celdas/abc")).estado === 404, "un identificador que no es un número también responde 404");
  log("Nota: la interfaz no tiene una página de detalle de celda; el mismo mensaje se muestra en los diálogos de edición y eliminación (ver CE-09).");
});

await caso("CE-04", "Crear celda y comprobar persistencia (SD05)", async () => {
  const [antes] = await consulta("Estancias antes", "SELECT count(*)::int AS total FROM registro");
  const creada = await pedir(A, "POST", "/api/celdas", { codigo: "T-NUEVA-01", tipo: "CARRO" });
  ids.nueva = creada.json?.id;
  ok(creada.estado === 201 && creada.json?.codigo === "T-NUEVA-01", "API confirma la creación con 201");
  await ui.cookie(A.token);
  await ui.ir("/celdas?buscar=T-NUEVA", 2200);
  await ui.ir("/celdas?buscar=T-NUEVA", 2200);
  const filas = await ver("fila después de recargar la pantalla", `[...document.querySelectorAll('tbody tr')].map((f) => f.innerText.replace(/\\s+/g, ' '))`);
  ok(filas.length === 1 && filas[0].startsWith("T-NUEVA-01 Carro Libre 0"), "los datos persisten al recargar; la celda aparece libre y sin movimientos");
  await foto("CE-04", "celda-persistida");
  const otra = await pedir(N, "GET", `/api/celdas/${ids.nueva}`);
  ok(otra.estado === 200 && otra.json?.codigo === "T-NUEVA-01" && otra.json?.placaOcupante === null, "otra sesión la consulta de nuevo y la encuentra");
  const filasBd = await consulta("Celdas con ese código", "SELECT id, codigo, tipo FROM celda WHERE codigo = 'T-NUEVA-01'");
  ok(filasBd.length === 1, "existe una sola celda con ese código");
  const [despues] = await consulta("Estancias después", "SELECT count(*)::int AS total FROM registro");
  ok(antes.total === despues.total, "no se creó ninguna estancia ni se marcó ocupada manualmente");
});

await caso("CE-05", "Código duplicado normalizado (SD05)", async () => {
  const antes = await contar("celda");
  ok((await pedir(A, "POST", "/api/celdas", { codigo: "T-LIBRE-01", tipo: "MOTO" })).estado === 409, "mismo código: 409");
  ok((await pedir(A, "POST", "/api/celdas", { codigo: "   t-libre-01   ", tipo: "MOTO" })).estado === 409, "con espacios exteriores y minúsculas: 409 después de normalizar");
  const original = await pedir(A, "GET", `/api/celdas/${ids.libre}`);
  ok(original.json?.codigo === "T-LIBRE-01" && original.json?.tipo === "CARRO" && (await contar("celda")) === antes, "el registro original conserva sus datos y no se creó otro");
  await ui.cookie(A.token);
  await ui.ir("/celdas", 2200);
  await clicBoton("Nueva celda");
  await ui.esperar(500);
  await ui.llenar("dialog[open] #codigo-celda", "  t-libre-01  ");
  await ui.clic("dialog[open] input[name=tipo][value=CARRO]");
  await ui.tecla("Enter");
  await ui.esperar(2200);
  const dialogo = await ver("diálogo Nueva celda", `(() => ({ codigoEnElCampo: document.querySelector('dialog[open] #codigo-celda')?.value, error: document.querySelector('dialog[open] [role=alert]')?.innerText }))()`);
  ok(dialogo.codigoEnElCampo === "T-LIBRE-01" && /Ya existe una celda/.test(dialogo.error ?? ""), "la interfaz normaliza el código y rechaza la duplicación");
  await foto("CE-05", "codigo-duplicado");
});

await caso("CE-06", "Código y tipo obligatorios (SD05 y SD06)", async () => {
  const antes = await contar("celda");
  const comprobar = async (metodo, ruta, cuerpo, campo, texto) => {
    const r = await pedir(A, metodo, ruta, cuerpo);
    ok(r.estado === 422 && (campo === null || r.json?.campo === campo), texto);
  };
  await comprobar("POST", "/api/celdas", { tipo: "CARRO" }, "codigo", "crear sin código: 422");
  await comprobar("POST", "/api/celdas", { codigo: "T-CE06-1" }, "tipo", "crear sin tipo: 422");
  await comprobar("POST", "/api/celdas", { codigo: "     ", tipo: "CARRO" }, "codigo", "crear con código de solo espacios: 422");
  await comprobar("POST", "/api/celdas", { codigo: "T-CE06-1", tipo: "     " }, "tipo", "crear con tipo de solo espacios: 422");
  await comprobar("PATCH", `/api/celdas/${ids.libre}`, { codigo: "" }, "codigo", "editar con código vacío: 422");
  await comprobar("PATCH", `/api/celdas/${ids.libre}`, { tipo: "   " }, "tipo", "editar con tipo de solo espacios: 422");
  await comprobar("PATCH", `/api/celdas/${ids.libre}`, {}, null, "editar sin enviar ningún dato: 422");
  const fila = await consulta("La celda de prueba", "SELECT codigo, tipo FROM celda WHERE id = $1", [ids.libre]);
  ok((await contar("celda")) === antes && fila[0].codigo === "T-LIBRE-01" && fila[0].tipo === "CARRO", "no se guardó ninguna celda incompleta ni cambió la existente");
  await ui.cookie(A.token);
  await ui.ir("/celdas", 2200);
  await clicBoton("Nueva celda");
  await ui.esperar(500);
  const vacio = await ver("envío del formulario vacío (validación del navegador)", `(() => { const f = document.querySelector('dialog[open] form'); f.requestSubmit(); return { formularioValido: f.checkValidity(), faltan: [...f.querySelectorAll('input:invalid')].map((e) => e.name).filter((n, i, a) => a.indexOf(n) === i), sigueAbierto: Boolean(document.querySelector('dialog[open]')) }; })()`);
  ok(vacio.formularioValido === false && vacio.faltan.includes("codigo") && vacio.faltan.includes("tipo") && vacio.sigueAbierto, "la interfaz exige código y tipo antes de enviar");
  await ui.llenar("dialog[open] #codigo-celda", "     ");
  ok((await ver("código de solo espacios en el campo", `document.querySelector('dialog[open] #codigo-celda').value`)) === "", "el campo descarta los espacios: sigue vacío y obligatorio");
  await foto("CE-06", "campos-obligatorios");
});

await caso("CE-07", "Editar celda existente (SD06)", async () => {
  const sql = "SELECT count(*)::int AS total, count(*) FILTER (WHERE fecha_salida IS NULL)::int AS abiertas FROM registro";
  const [antes] = await consulta("Estancias antes", sql);
  await ui.cookie(A.token);
  await ui.ir("/celdas?buscar=T-LIBRE", 2200);
  await ui.clic(`button[aria-label="Editar la celda T-LIBRE-01"]`);
  await ui.esperar(500);
  await ui.llenar("dialog[open] #codigo-celda", "T-LIBRE-02");
  await ui.clic("dialog[open] input[name=tipo][value=MOTO]");
  log('UI> Editar la celda T-LIBRE-01: código "T-LIBRE-02" y tipo MOTO');
  await foto("CE-07", "formulario-edicion");
  await ui.tecla("Enter");
  await ui.esperar(2400);
  ok(/Celda actualizada/.test(await ver("aviso", `document.querySelector('[role=status]')?.innerText.replace(/\\s+/g, ' ')`) ?? ""), "la interfaz confirma los cambios");
  await ui.ir("/celdas?buscar=T-LIBRE", 2200);
  const filas = await ver("fila después de recargar", `[...document.querySelectorAll('tbody tr')].map((f) => f.innerText.replace(/\\s+/g, ' '))`);
  ok(filas.length === 1 && filas[0].startsWith("T-LIBRE-02 Moto Libre"), "los cambios persisten al recargar");
  await foto("CE-07", "celda-editada");
  const editada = await pedir(A, "GET", `/api/celdas/${ids.libre}`);
  ok(editada.json?.id === ids.libre && editada.json?.codigo === "T-LIBRE-02" && editada.json?.tipo === "MOTO", "se conserva el identificador");
  const relaciones = await pedir(A, "PATCH", `/api/celdas/${ids.hist}`, { codigo: "T-HIST-02" });
  ok(relaciones.estado === 200 && relaciones.json?.id === ids.hist, "API de edición: 200 (se cambia el código de la celda con historial)");
  const historial = await consulta("Historial de la celda con historial después de editarla", "SELECT c.codigo, count(r.id)::int AS movimientos FROM celda c LEFT JOIN registro r ON r.celda_id = c.id WHERE c.id = $1 GROUP BY c.codigo", [ids.hist]);
  ok(historial[0].codigo === "T-HIST-02" && historial[0].movimientos === 1, "se conservan las relaciones existentes (su movimiento sigue asociado)");
  const [despues] = await consulta("Estancias después", sql);
  ok(antes.total === despues.total && antes.abiertas === despues.abiertas, "editar el catálogo no abrió ni cerró estancias ni liberó ocupaciones");
  log("Restauración del conjunto de prueba:");
  ok((await pedir(A, "PATCH", `/api/celdas/${ids.libre}`, { codigo: "T-LIBRE-01", tipo: "CARRO" })).estado === 200 && (await pedir(A, "PATCH", `/api/celdas/${ids.hist}`, { codigo: "T-HIST-01" })).estado === 200, "las celdas de prueba vuelven a sus datos originales");
});

await caso("CE-08", "Editar con código de otra celda (SD06)", async () => {
  const r = await pedir(A, "PATCH", `/api/celdas/${ids.libre}`, { codigo: "T-HIST-01" });
  ok(r.estado === 409 && r.json?.campo === "codigo", "API: 409");
  const filas = await consulta("Las dos celdas después del intento", "SELECT id, codigo, tipo FROM celda WHERE id IN ($1, $2) ORDER BY codigo", [ids.libre, ids.hist]);
  ok(filas.map((f) => f.codigo).join() === "T-HIST-01,T-LIBRE-01" && filas.every((f) => f.tipo === "CARRO"), "se revierte el cambio: ambas celdas conservan sus datos anteriores");
});

await caso("CE-09", "Editar celda inexistente (SD06)", async () => {
  const antes = await contar("celda");
  const r = await pedir(A, "PATCH", "/api/celdas/999999", { codigo: "T-CE09-1", tipo: "CARRO" });
  ok(r.estado === 404, `API: 404 ("${r.json?.error}")`);
  ok((await contar("celda")) === antes && !(await bd.query("SELECT 1 FROM celda WHERE codigo = 'T-CE09-1'")).rowCount, "no se creó una celda nueva ni se modificó otro registro");
});

await caso("CE-10", "Eliminar celda sin referencias (SD07)", async () => {
  await ui.cookie(A.token);
  await ui.ir("/celdas?buscar=T-ELIM", 2200);
  await ui.clic(`button[aria-label="Eliminar la celda T-ELIM-01"]`);
  const dialogo = await ver("diálogo de confirmación", `(() => ({ titulo: document.querySelector('dialog[open] h2')?.innerText, foco: document.activeElement?.innerText }))()`);
  ok(/¿Eliminar la celda T-ELIM-01\?/.test(dialogo.titulo ?? "") && dialogo.foco === "Cancelar", "la interfaz pide confirmación y el foco empieza en Cancelar");
  await foto("CE-10", "confirmacion");
  await ui.clic("dialog[open] button[type=submit]");
  await ui.esperar(2400);
  ok(/Celda eliminada/.test(await ver("aviso", `document.querySelector('[role=status]')?.innerText.replace(/\\s+/g, ' ')`) ?? ""), "eliminación confirmada en la interfaz");
  await ui.ir("/celdas?buscar=T-ELIM", 2200);
  ok(/Ninguna celda coincide/.test(await ver("catálogo después de recargar", TEXTO_PRINCIPAL)), "ya no aparece en el catálogo");
  await foto("CE-10", "celda-eliminada");
  ok((await pedir(A, "GET", `/api/celdas/${ids.elim}`)).estado === 404, "la consulta por identificador responde 404");
  const temporal = await pedir(A, "POST", "/api/celdas", { codigo: "T-ELIM-02", tipo: "MOTO" });
  const borrada = await pedir(A, "DELETE", `/api/celdas/${temporal.json?.id}`);
  ok(borrada.estado === 204 && (await pedir(A, "GET", `/api/celdas/${temporal.json?.id}`)).estado === 404, "por API la eliminación de una celda sin uso se confirma con 204 y después responde 404");
});

await caso("CE-11", "Eliminar celda libre con historial (SD07)", async () => {
  const r = await pedir(A, "DELETE", `/api/celdas/${ids.hist}`);
  ok(r.estado === 409, `API: 409 ("${r.json?.error}")`);
  const celda = await pedir(A, "GET", `/api/celdas/${ids.hist}`);
  ok(celda.estado === 200 && celda.json?.movimientos === 1 && celda.json?.placaOcupante === null, "se conservan la celda (libre) y su historial");
  await ui.cookie(A.token);
  await ui.ir("/celdas?buscar=T-HIST", 2200);
  await ui.clic(`button[aria-label="Eliminar la celda T-HIST-01"]`);
  const dialogo = await ver("diálogo", `(() => ({ titulo: document.querySelector('dialog[open] h2')?.innerText, motivo: document.querySelector('dialog[open] p')?.innerText, botones: [...document.querySelectorAll('dialog[open] button')].map((b) => b.innerText) }))()`);
  ok(/no se puede eliminar/.test(dialogo.titulo ?? "") && dialogo.botones.join() === "Entendido", "la interfaz explica que estar libre no permite eliminar una celda con historial");
  await foto("CE-11", "celda-con-historial");
});

await caso("CE-12", "Eliminar celda ocupada (SD07)", async () => {
  const sql = "SELECT r.id, v.placa, r.fecha_entrada, r.fecha_salida FROM registro r JOIN vehiculo v ON v.id = r.vehiculo_id WHERE r.celda_id = $1 AND r.fecha_salida IS NULL";
  const antes = await consulta("Estancia abierta antes", sql, [ids.ocup]);
  const r = await pedir(A, "DELETE", `/api/celdas/${ids.ocup}`);
  ok(r.estado === 409, `API: 409 ("${r.json?.error}")`);
  const celda = await pedir(A, "GET", `/api/celdas/${ids.ocup}`);
  const despues = await consulta("Estancia abierta después", sql, [ids.ocup]);
  ok(celda.estado === 200 && celda.json?.placaOcupante === "TST002", "se conserva la celda, que sigue ocupada");
  ok(JSON.stringify(antes) === JSON.stringify(despues) && despues.length === 1, "la estancia abierta conserva sus datos originales");
  await ui.cookie(A.token);
  await ui.ir("/celdas?buscar=T-OCUP", 2200);
  await ui.clic(`button[aria-label="Eliminar la celda T-OCUP-01"]`);
  const dialogo = await ver("diálogo", `(() => ({ titulo: document.querySelector('dialog[open] h2')?.innerText, motivo: document.querySelector('dialog[open] p')?.innerText }))()`);
  ok(/no se puede eliminar/.test(dialogo.titulo ?? "") && /ocupada/.test(dialogo.motivo ?? ""), "la interfaz explica que la celda está ocupada");
  await foto("CE-12", "celda-ocupada");
});

await caso("CE-13", "Crear el mismo código simultáneamente (SD05)", async () => {
  log("Dos sesiones de administrador (admin_prueba y admin_nuevo) envían la misma creación a la vez con Promise.all.");
  const [uno, dos] = await Promise.all([
    pedir(A, "POST", "/api/celdas", { codigo: "T-CONC-01", tipo: "CARRO" }),
    pedir(N, "POST", "/api/celdas", { codigo: "T-CONC-01", tipo: "CARRO" }),
  ]);
  const estados = [uno.estado, dos.estado].sort();
  ok(estados.join() === "201,409", `solo una creación se confirma y la otra recibe conflicto: ${estados.join(" y ")}`);
  const filas = await consulta("Celdas con ese código", "SELECT id, codigo, tipo FROM celda WHERE codigo = 'T-CONC-01'");
  ok(filas.length === 1, "persiste exactamente una celda con ese código");
});

await ui.cerrar();
await bd.end();
writeFileSync(join(SALIDA, "..", "resultados.json"), JSON.stringify(resultados, null, 1));
const total = Object.keys(resultados).filter((id) => id !== "00-preparacion");
console.log(`\n${total.filter((id) => resultados[id].estado === "Aprobado").length} aprobados de ${total.length} casos`);
