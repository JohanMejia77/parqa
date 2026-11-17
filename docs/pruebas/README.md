# Ejecución del plan de pruebas PP-02

Pruebas de la **gestión de usuarios** y la **gestión de celdas** (iteración 2). El plan y sus resultados están en [`Plan_Pruebas_Usuarios_Celdas_Autos_Colombia.xlsx`](../../Plan_Pruebas_Usuarios_Celdas_Autos_Colombia.xlsx); esta carpeta guarda las evidencias y la forma de repetir la ejecución.

## Resultado

| Módulo | Casos | Aprobados | Fallidos | Bloqueados | No aplica |
| --- | --- | --- | --- | --- | --- |
| Usuarios (US-01 a US-12) | 12 | 12 | 0 | 0 | 0 |
| Permisos (PE-01 a PE-05) | 5 | 5 | 0 | 0 | 0 |
| Celdas (CE-01 a CE-13) | 13 | 13 | 0 | 0 | 0 |
| **Total** | **30** | **30** | **0** | **0** | **0** |

- **Fecha:** 11 de noviembre de 2026.
- **Versión probada:** Autos Colombia 0.2.0, compilación de producción (`npm run build` y `npm start`).
- **Entorno:** Windows 11, Node.js 24, Next.js 16.4.2, PostgreSQL 18.6 y Microsoft Edge.
- **Base de datos:** `autos_colombia_pruebas`, creada solo para las pruebas con `npm run db:reset`. El caso CE-02 usó `autos_colombia_vacia`, una base sin celdas.
- **Estado:** listo para la revisión del docente.

## Cómo se ejecutó

Cada caso se probó como pide su fila del plan: por la **API** (petición y código HTTP), en la **interfaz** (con Microsoft Edge) y, cuando el caso lo exige, con una **consulta a la base de datos** para comprobar que los datos quedaron como debían.

Para no depender de la memoria de quien prueba, los pasos se escribieron en un script que los ejecuta en orden y guarda la evidencia de cada uno: [`automatizacion/ejecutar-pruebas.mjs`](automatizacion/ejecutar-pruebas.mjs). El script maneja el navegador con [`automatizacion/navegador.mjs`](automatizacion/navegador.mjs): escribe en los formularios y pulsa los botones igual que una persona. Un caso queda **Aprobado** solo si se cumplen todas sus comprobaciones.

### Datos de prueba

La sección *Preparación* del plan pide estas cuentas y celdas. El script las crea al empezar ([`evidencias/00-preparacion.txt`](evidencias/00-preparacion.txt)):

| Dato | Cómo se preparó |
| --- | --- |
| `admin_prueba` | Cuenta inicial de administrador, creada por `npm run db:reset` con las variables `ADMIN_USUARIO` y `ADMIN_CONTRASENA`. |
| `operador_prueba` | Creada por la API con la sesión de `admin_prueba`. |
| `T-LIBRE-01` | Celda nueva, sin movimientos. |
| `T-HIST-01` | Celda con una entrada y una salida del vehículo TST001: libre y con historial. |
| `T-OCUP-01` | Celda con una entrada del vehículo TST002: ocupada. |
| `T-ELIM-01` | Celda nueva, sin movimientos, para eliminar. |
| `T-NUEVA-01`, `T-CONC-01` | No existen al empezar: las crean los casos CE-04 y CE-13. |

Las **contraseñas** de las cuentas de prueba se generaron al azar y solo existen en variables de entorno. No están en este repositorio ni en las evidencias.

## Evidencias

En [`evidencias/`](evidencias/) hay, por cada caso:

- `ID.txt`: las peticiones a la API con su código HTTP y su respuesta, las consultas a la base de datos, lo observado en la interfaz y la lista de comprobaciones (`[OK]` o `[FALLA]`).
- `ID-descripcion.png`: capturas de pantalla de la interfaz (27 en total).

En todas las evidencias las contraseñas aparecen como `<oculta>` y los tokens de sesión como `<oculto>`. Del hash de las contraseñas solo se muestra el formato (`scrypt$16384$8$5$`) y su longitud.

| Caso | Prueba | Evidencias |
| --- | --- | --- |
| US-01 | Login del administrador | [texto](evidencias/US-01.txt) · [menú](evidencias/US-01-menu-administrador.png) |
| US-02 | Login del operador | [texto](evidencias/US-02.txt) · [menú](evidencias/US-02-menu-operador.png) |
| US-03 | Credenciales incorrectas | [texto](evidencias/US-03.txt) · [mensaje](evidencias/US-03-credenciales-incorrectas.png) |
| US-04 | Campos obligatorios del login | [texto](evidencias/US-04.txt) · [formulario](evidencias/US-04-campos-obligatorios.png) |
| US-05 | Sesión vencida o revocada | [texto](evidencias/US-05.txt) · [login](evidencias/US-05-sesion-vencida.png) |
| US-06 | Cierre de sesión efectivo | [texto](evidencias/US-06.txt) · [login](evidencias/US-06-despues-de-cerrar.png) |
| US-07 | Crear una cuenta de operador | [texto](evidencias/US-07.txt) · [formulario](evidencias/US-07-formulario.png) · [cuenta creada](evidencias/US-07-cuenta-creada.png) |
| US-08 | Crear una cuenta de administrador | [texto](evidencias/US-08.txt) · [sesión nueva](evidencias/US-08-administrador-nuevo.png) |
| US-09 | Usuario de acceso duplicado | [texto](evidencias/US-09.txt) · [error](evidencias/US-09-usuario-duplicado.png) |
| US-10 | Campos obligatorios al crear usuario | [texto](evidencias/US-10.txt) · [error](evidencias/US-10-nombre-solo-espacios.png) |
| US-11 | Rol inválido enviado por API | [texto](evidencias/US-11.txt) |
| US-12 | Protección de la contraseña | [texto](evidencias/US-12.txt) |
| PE-01 | Solicitudes sin autenticación | [texto](evidencias/PE-01.txt) |
| PE-02 | Operador intenta crear usuarios | [texto](evidencias/PE-02.txt) · [sin permiso](evidencias/PE-02-operador-en-usuarios.png) |
| PE-03 | Operador intenta administrar celdas | [texto](evidencias/PE-03.txt) · [sin permiso](evidencias/PE-03-operador-en-celdas.png) |
| PE-04 | Administrador intenta registrar accesos | [texto](evidencias/PE-04.txt) · [sin permiso](evidencias/PE-04-administrador-en-entrada.png) |
| PE-05 | Operador consulta disponibilidad | [texto](evidencias/PE-05.txt) · [plano](evidencias/PE-05-disponibilidad-operador.png) |
| CE-01 | Listar y buscar celdas | [texto](evidencias/CE-01.txt) · [catálogo](evidencias/CE-01-catalogo.png) · [búsqueda](evidencias/CE-01-busqueda.png) |
| CE-02 | Catálogo sin registros | [texto](evidencias/CE-02.txt) · [catálogo vacío](evidencias/CE-02-catalogo-vacio.png) |
| CE-03 | Consultar celda inexistente | [texto](evidencias/CE-03.txt) |
| CE-04 | Crear celda y comprobar persistencia | [texto](evidencias/CE-04.txt) · [celda](evidencias/CE-04-celda-persistida.png) |
| CE-05 | Código duplicado normalizado | [texto](evidencias/CE-05.txt) · [error](evidencias/CE-05-codigo-duplicado.png) |
| CE-06 | Código y tipo obligatorios | [texto](evidencias/CE-06.txt) · [formulario](evidencias/CE-06-campos-obligatorios.png) |
| CE-07 | Editar celda existente | [texto](evidencias/CE-07.txt) · [formulario](evidencias/CE-07-formulario-edicion.png) · [celda editada](evidencias/CE-07-celda-editada.png) |
| CE-08 | Editar con código de otra celda | [texto](evidencias/CE-08.txt) |
| CE-09 | Editar celda inexistente | [texto](evidencias/CE-09.txt) |
| CE-10 | Eliminar celda sin referencias | [texto](evidencias/CE-10.txt) · [confirmación](evidencias/CE-10-confirmacion.png) · [eliminada](evidencias/CE-10-celda-eliminada.png) |
| CE-11 | Eliminar celda libre con historial | [texto](evidencias/CE-11.txt) · [explicación](evidencias/CE-11-celda-con-historial.png) |
| CE-12 | Eliminar celda ocupada | [texto](evidencias/CE-12.txt) · [explicación](evidencias/CE-12-celda-ocupada.png) |
| CE-13 | Crear el mismo código simultáneamente | [texto](evidencias/CE-13.txt) |

## Cómo se interpretó el plan en esta implementación

El plan describe el comportamiento esperado sin atarse a una implementación. Estas son las decisiones de Autos Colombia que conviene conocer al revisarlo:

- **Perfil del operador (US-07, US-09, US-10).** La cuenta y el perfil de la persona son una sola fila de la tabla `usuario` (nombre de usuario, nombre completo y rol). Por eso no puede quedar una cuenta sin perfil ni un perfil sin cuenta.
- **Contrato de creación de usuario (US-10).** Son obligatorios `nombre` (3 a 80 caracteres), `nombreUsuario` (3 a 30: letras, números, punto, guion o guion bajo), `contrasena` (8 a 72) y `rol` (`ADMINISTRADOR` u `OPERADOR`).
- **Campos vacíos en la interfaz (US-04, US-10, CE-06).** El navegador marca los campos obligatorios antes de enviar. El servidor repite la validación: las mismas peticiones por API responden 422.
- **Detalle de una celda (CE-03).** La interfaz no tiene una página de detalle. La consulta por identificador existe en la API (`GET /api/celdas/{id}`) y su mensaje de «no existe» se muestra en los diálogos de edición y eliminación.
- **Eliminar por API (CE-10).** `T-ELIM-01` se eliminó desde la interfaz. Para comprobar el código 204 de la API se creó y eliminó una celda más, `T-ELIM-02`.
- **Paginación (CE-01).** El catálogo no pagina: la lista trae todas las celdas y el total coincide con el de la base de datos.

## Hallazgos durante las pruebas

Las pruebas se ejecutaron dos veces. La primera ejecución dejó dos hallazgos, que se corrigieron antes de la ejecución final que está registrada en el formato:

| Hallazgo | Corrección |
| --- | --- |
| En Microsoft Edge, el campo de contraseña mostraba dos botones para ver la contraseña: el de la aplicación y uno propio de Edge. | Se ocultó el botón de Edge con CSS (`src/app/globals.css`). |
| US-10 se marcó como fallido aunque el sistema se comportaba bien: el script contaba como campo inválido el grupo que contiene las opciones de rol, además de los cuatro campos. | Se corrigió la comprobación del script para contar solo los campos. |

Antes de las pruebas formales, una exploración de la API mostró que un texto con caracteres que la base de datos no admite respondía 500. Ahora responde 422 con un mensaje que explica qué revisar.

## Cómo repetir la ejecución

Se necesita PostgreSQL encendido y Microsoft Edge. Desde la carpeta del proyecto:

1. Define en la terminal las variables de las pruebas. Las tres contraseñas las eliges tú (mínimo 8 caracteres):

   | Variable | Para qué |
   | --- | --- |
   | `PRUEBAS_DATABASE_URL` | Conexión a la base de pruebas, por ejemplo `postgresql://USUARIO:CONTRASEÑA@localhost:5432/autos_colombia_pruebas`. |
   | `ADMIN_PRUEBA_CLAVE` | Contraseña de `admin_prueba`. |
   | `OPERADOR_PRUEBA_CLAVE` | Contraseña de `operador_prueba`. |
   | `NUEVA_CUENTA_CLAVE` | Contraseña de las cuentas que crean los casos. |

2. Crea las dos bases de pruebas con `npm run db:reset`, usando en cada una `DATABASE_URL` con el nombre de la base, `ADMIN_USUARIO=admin_prueba` y `ADMIN_CONTRASENA` con el valor de `ADMIN_PRUEBA_CLAVE`: primero `autos_colombia_pruebas` y después `autos_colombia_vacia`. En la segunda borra las celdas de ejemplo con `TRUNCATE registro, vehiculo, celda CASCADE;`.
3. Compila con `npm run build`.
4. Inicia dos servidores, cada uno con su `DATABASE_URL`: `npm start -- --port 3100` para `autos_colombia_pruebas` y `npm start -- --port 3101` para `autos_colombia_vacia`.
5. Ejecuta las pruebas:

   ```bash
   node docs/pruebas/automatizacion/ejecutar-pruebas.mjs
   ```

El script escribe las evidencias en `docs/pruebas/evidencias/` y el resumen en `docs/pruebas/resultados.json`. Como crea y elimina datos, cada ejecución necesita la base recién creada (paso 2).
