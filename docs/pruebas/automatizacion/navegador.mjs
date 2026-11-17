// Navegador Edge sin ventana, controlado con el protocolo DevTools (sin dependencias).
import { spawn } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

export async function abrirNavegador({ base, ancho = 1280, alto = 820, escala = 1.5 }) {
  const puerto = 9300 + Math.floor(Math.random() * 500);
  const perfil = join(tmpdir(), `ac-navegador-${process.pid}-${puerto}`);
  const proceso = spawn(EDGE, [
    "--headless=new", `--remote-debugging-port=${puerto}`, `--user-data-dir=${perfil}`,
    "--no-first-run", "--no-default-browser-check", "--disable-extensions", "--hide-scrollbars",
    "--lang=es-CO", `--window-size=${ancho},${alto}`, "about:blank",
  ], { stdio: "ignore" });

  let url;
  for (let i = 0; i < 80 && !url; i++) {
    try {
      const lista = await (await fetch(`http://127.0.0.1:${puerto}/json/list`)).json();
      url = lista.find((t) => t.type === "page")?.webSocketDebuggerUrl;
    } catch {}
    if (!url) await pausa(250);
  }
  if (!url) throw new Error("Edge no respondió");

  const ws = new WebSocket(url);
  await new Promise((r) => (ws.onopen = r));
  let sig = 0;
  const pendientes = new Map();
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.id && pendientes.has(d.id)) {
      const { ok, mal } = pendientes.get(d.id);
      pendientes.delete(d.id);
      if (d.error) mal(new Error(d.error.message));
      else ok(d.result);
    }
  };
  const cdp = (method, params = {}) =>
    new Promise((ok, mal) => {
      const id = ++sig;
      pendientes.set(id, { ok, mal });
      ws.send(JSON.stringify({ id, method, params }));
    });

  await cdp("Page.enable");
  await cdp("Network.enable");
  const medidas = (a, h, e, movil = false) =>
    cdp("Emulation.setDeviceMetricsOverride", { width: a, height: h, deviceScaleFactor: e, mobile: movil });
  await medidas(ancho, alto, escala);

  const nav = {
    esperar: pausa,
    medidas,
    /** Deja el navegador sin sesión, o con la sesión del token indicado. */
    async cookie(token) {
      await cdp("Network.clearBrowserCookies");
      if (token) {
        await cdp("Network.setCookie", { name: "ac_sesion", value: token, url: base, httpOnly: true, sameSite: "Lax" });
      }
    },
    async tokenActual() {
      const { cookies } = await cdp("Network.getCookies", { urls: [base] });
      return cookies.find((c) => c.name === "ac_sesion")?.value ?? null;
    },
    async ir(ruta, espera = 1500) {
      await cdp("Page.navigate", { url: new URL(ruta, base).href });
      await pausa(espera);
    },
    async js(expresion) {
      const r = await cdp("Runtime.evaluate", { expression: expresion, awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? "error en la página");
      return r.result.value;
    },
    /** Enfoca el elemento, reemplaza su contenido y escribe el texto como lo haría el teclado. */
    async llenar(selector, texto) {
      await nav.js(`(() => { const e = document.querySelector(${JSON.stringify(selector)}); e.focus(); e.select?.(); })()`);
      if (texto === "") await cdp("Input.dispatchKeyEvent", { type: "keyDown", key: "Delete", code: "Delete", windowsVirtualKeyCode: 46 });
      else await cdp("Input.insertText", { text: texto });
      await pausa(120);
    },
    async clic(selector) {
      await nav.js(`document.querySelector(${JSON.stringify(selector)}).click()`);
      await pausa(350);
    },
    async tecla(nombre) {
      const teclas = { Enter: ["Enter", 13, "\r"], Escape: ["Escape", 27], Tab: ["Tab", 9] };
      const [key, code, text] = teclas[nombre];
      await cdp("Input.dispatchKeyEvent", { type: "keyDown", key, code: key, windowsVirtualKeyCode: code, text });
      await cdp("Input.dispatchKeyEvent", { type: "keyUp", key, code: key, windowsVirtualKeyCode: code });
      await pausa(300);
    },
    async captura(archivo, completa = false) {
      const { data } = await cdp("Page.captureScreenshot", { format: "png", captureBeyondViewport: completa });
      mkdirSync(dirname(archivo), { recursive: true });
      writeFileSync(archivo, Buffer.from(data, "base64"));
    },
    async cerrar() {
      ws.close();
      proceso.kill();
      await pausa(500);
      try { rmSync(perfil, { recursive: true, force: true }); } catch {}
    },
  };
  return nav;
}
