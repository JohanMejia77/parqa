# Autos Colombia — Documentación de la Iteración 2

**Alcance de la iteración:** gestión de usuarios (cuentas con rol, inicio y cierre de sesión, permisos) y gestión de celdas (consultar, buscar, crear, editar y eliminar).

**Fuera del alcance:** pagos, mensualidades, novedades, y edición o eliminación de usuarios. Las entradas y salidas de la [iteración 1](iteracion-1.md) no cambian: ahora exigen una sesión de operador.

## Contenido

1. [Requerimientos funcionales y no funcionales](#1-requerimientos)
2. [Historias de usuario](#2-historias-de-usuario)
3. [Diagramas de casos de uso](#3-diagramas-de-casos-de-uso)
4. [Mockups](#4-mockups)
5. [Diagramas de secuencia de las iteraciones 1 y 2](#5-diagramas-de-secuencia)
6. [Diagrama de componentes de las iteraciones 1 y 2](#6-diagrama-de-componentes)
7. [Plan de pruebas resumido](#7-plan-de-pruebas-resumido)
8. [Cambios al modelo de datos](#8-cambios-al-modelo-de-datos)
9. [API REST](#9-api-rest)
10. [Pantallas implementadas](#10-pantallas-implementadas)

Los diagramas están escritos en PlantUML (código UML) en [`docs/uml/`](uml/) y exportados como imagen en [`docs/img/`](img/).

---

## 1. Requerimientos

La numeración continúa la de la iteración 1 (RF-01 a RF-10 y RNF-01 a RNF-08).

### Requerimientos funcionales — Gestión de usuarios

| ID | Requerimiento | Descripción |
| --- | --- | --- |
| RF-11 | Iniciar sesión | Entrar con usuario y contraseña. Si no coinciden, el sistema responde con un mismo mensaje, sin decir cuál de los dos falló. La sesión dura 8 horas. |
| RF-12 | Cerrar sesión | Terminar la sesión desde cualquier página. La sesión se borra en el servidor y deja de servir, aunque alguien haya copiado su cookie. |
| RF-13 | Asignar roles | Cada cuenta tiene un rol: **Administrador** (usuarios y celdas) u **Operador** (entradas, salidas y consultas). Ningún rol hereda las operaciones del otro. |
| RF-14 | Proteger páginas y operaciones | Toda página y toda operación exige una sesión válida y el rol que le corresponde. Sin sesión se muestra el inicio de sesión; con otro rol se informa que la cuenta no tiene permiso. Cada rol ve en el menú solo sus páginas. |
| RF-15 | Crear usuario | El administrador crea cuentas con nombre completo, usuario, rol y contraseña. El usuario es único y no distingue mayúsculas. |
| RF-16 | Consultar usuarios | El administrador ve las cuentas con nombre, usuario, rol y fecha de creación. Nunca se muestran contraseñas. |
| RF-17 | Crear la cuenta inicial | `npm run db:setup` crea la primera cuenta de administrador con los datos del archivo `.env`, para poder entrar la primera vez. |

### Requerimientos funcionales — Gestión de celdas

| ID | Requerimiento | Descripción |
| --- | --- | --- |
| RF-18 | Consultar y buscar celdas | El administrador ve el catálogo con código, tipo, estado (libre u ocupada, con la placa) y número de movimientos. Puede buscar por código y filtrar por tipo. |
| RF-19 | Crear celda | Crear una celda con código y tipo (carro o moto). El código admite hasta 10 caracteres (letras, números y guiones), se guarda en mayúsculas y no se puede repetir. La celda nueva queda libre. |
| RF-20 | Editar celda | Cambiar el código, el tipo o ambos. La celda conserva su identificador y su historial. No se puede cambiar el tipo de una celda ocupada. |
| RF-21 | Eliminar celda | Eliminar, previa confirmación, una celda que nunca se ha usado. Una celda ocupada o con movimientos en el historial se conserva y el sistema explica por qué. |
| RF-22 | Ofrecer las operaciones por API | Las operaciones de sesión, usuarios, celdas, entradas y salidas también se ofrecen como API REST en JSON, con códigos HTTP: 200, 201, 204, 401, 403, 404, 409 y 422. |

### Requerimientos no funcionales

| ID | Tipo | Descripción |
| --- | --- | --- |
| RNF-09 | Seguridad de contraseñas | Solo se guarda el hash de la contraseña (scrypt con sal aleatoria). La contraseña y su hash no aparecen en respuestas, pantallas ni registros. |
| RNF-10 | Seguridad de sesiones | La sesión es un token aleatorio de 256 bits en una cookie `HttpOnly` y `SameSite=Lax` (y `Secure` con HTTPS). En la base de datos solo se guarda su hash SHA-256. Expira a las 8 horas. |
| RNF-11 | Autorización en el servidor | Los permisos se comprueban en el servidor, dentro de cada servicio. Ocultar una opción del menú no cuenta como protección. |
| RNF-12 | Validación en el servidor | Todos los datos se validan en el servidor aunque el navegador también los valide. Las consultas SQL son parametrizadas. |
| RNF-13 | Integridad y concurrencia | La base de datos garantiza que no haya dos celdas con el mismo código ni dos cuentas con el mismo usuario, aunque dos personas guarden a la vez. Editar o eliminar una celda mientras se registra una entrada en ella no deja datos inconsistentes. |
| RNF-14 | Usabilidad | Crear, editar o eliminar toma máximo tres pasos desde la lista. Cada error aparece junto al campo y dice cómo corregirlo. Eliminar pide confirmación. El resultado de cada operación queda visible. |
| RNF-15 | Accesibilidad | Diálogos con foco controlado y cierre con `Esc`, etiquetas en todos los campos, uso completo con teclado, contraste AA, botones de al menos 44 px en pantallas táctiles y menos movimiento para quien lo pide en su sistema. |
| RNF-16 | Compatibilidad | Funciona en Chrome, Edge, Firefox y Safari actuales. En teléfono, las tablas se muestran como fichas. |
| RNF-17 | Rendimiento | Cada operación responde en menos de 2 segundos en la red local, incluido el inicio de sesión. |
| RNF-18 | Instalación y mantenibilidad | Se mantienen las capas de la iteración 1. `npm run db:setup` actualiza una base de la iteración 1 sin borrar sus datos. |

---

## 2. Historias de usuario

La numeración continúa la de la iteración 1 (HU-01 a HU-05).

### Gestión de usuarios

**HU-06 · Iniciar sesión**
Como usuario del sistema, quiero iniciar sesión con mi usuario y mi contraseña, para que solo las personas autorizadas usen el sistema.
- Dado que escribo un usuario y una contraseña correctos, entro a la página de inicio de mi rol: Celdas si soy administrador, Panel si soy operador.
- Dado que el usuario no existe o la contraseña no coincide, veo el mismo mensaje en los dos casos y no entro.
- Dado que dejo un campo vacío, el sistema lo señala y no inicia sesión.
- Prioridad: alta · Estimación: 5 puntos · Requerimientos: RF-11, RNF-09, RNF-10.

**HU-07 · Cerrar sesión**
Como usuario del sistema, quiero cerrar mi sesión, para que nadie más use mi cuenta en ese equipo.
- Al pulsar **Cerrar sesión** vuelvo al inicio de sesión.
- Después de cerrar, las páginas protegidas piden iniciar sesión otra vez.
- La sesión anterior deja de servir en el servidor, aunque alguien conserve su cookie.
- Prioridad: alta · Estimación: 2 puntos · Requerimientos: RF-12.

**HU-08 · Acceder según el rol**
Como administrador del parqueadero, quiero que cada cuenta haga solo lo que corresponde a su rol, para separar la administración de la operación diaria.
- El administrador ve en el menú Celdas y Usuarios; el operador ve Panel, Entrada, Salida e Historial.
- Si abro la dirección de una página de otro rol, el sistema me informa que mi cuenta no tiene permiso.
- Si intento una operación de otro rol sin pasar por la pantalla, el servidor la rechaza y no cambia ningún dato.
- Sin sesión, cualquier página lleva al inicio de sesión.
- Prioridad: alta · Estimación: 5 puntos · Requerimientos: RF-13, RF-14, RNF-11.

**HU-09 · Crear usuario**
Como administrador, quiero crear cuentas para las personas que trabajan en el parqueadero, para que cada una entre con su propio usuario.
- Dado que completo nombre, usuario, rol y contraseña válidos, la cuenta se crea y la persona puede iniciar sesión.
- Dado que el usuario ya existe, el sistema no crea la cuenta y lo indica junto al campo.
- Dado que falta un dato o no es válido, el sistema no crea la cuenta e indica qué corregir.
- La contraseña se guarda protegida y no se vuelve a mostrar.
- Prioridad: alta · Estimación: 5 puntos · Requerimientos: RF-15, RNF-09, RNF-12.

**HU-10 · Consultar usuarios**
Como administrador, quiero ver las cuentas que existen y su rol, para saber quién tiene acceso al sistema.
- La lista muestra nombre, usuario, rol y fecha de creación, y señala cuál es mi cuenta.
- La lista indica cuántos administradores y cuántos operadores hay.
- Prioridad: media · Estimación: 2 puntos · Requerimientos: RF-16.

### Gestión de celdas

**HU-11 · Consultar y buscar celdas**
Como administrador, quiero ver el catálogo de celdas y buscar una por su código, para saber qué espacios existen y cómo se están usando.
- El catálogo muestra código, tipo, estado (libre u ocupada, con la placa) y número de movimientos de cada celda.
- Puedo buscar por código completo o parcial y filtrar por tipo.
- Si no hay celdas o ninguna coincide, el sistema lo dice y me ofrece el siguiente paso.
- Prioridad: media · Estimación: 3 puntos · Requerimientos: RF-18.

**HU-12 · Crear celda**
Como administrador, quiero crear una celda con su código y su tipo, para ampliar los espacios del parqueadero.
- Dado un código nuevo y un tipo, la celda se crea, queda libre y aparece en el catálogo y en el plano del operador.
- Dado un código que ya existe, aunque lo escriba con minúsculas o espacios, el sistema no la crea y lo indica.
- Dado que falta el código o el tipo, el sistema no la crea.
- Prioridad: alta · Estimación: 3 puntos · Requerimientos: RF-19, RNF-13.

**HU-13 · Editar celda**
Como administrador, quiero corregir el código o el tipo de una celda, para mantener el catálogo al día sin perder su historial.
- Al guardar, la celda conserva su historial de movimientos.
- No puedo usar el código de otra celda.
- Si la celda está ocupada, puedo cambiar su código pero no su tipo.
- Prioridad: media · Estimación: 3 puntos · Requerimientos: RF-20, RNF-13.

**HU-14 · Eliminar celda**
Como administrador, quiero eliminar una celda que se creó por error, para que no se ofrezca a los vehículos.
- El sistema pide confirmación antes de eliminar.
- Solo se elimina una celda que nunca se ha usado.
- Si la celda está ocupada o tiene movimientos, el sistema la conserva y explica el motivo.
- Prioridad: media · Estimación: 3 puntos · Requerimientos: RF-21, RNF-13.

---

## 3. Diagramas de casos de uso

En esta iteración aparece un segundo actor, el **administrador**. Administrador y operador son usuarios del sistema: los dos inician y cierran sesión.

### Gestión de usuarios

![Casos de uso de gestión de usuarios](img/casos-de-uso-usuarios.png)

### Gestión de celdas

![Casos de uso de gestión de celdas](img/casos-de-uso-celdas.png)

| Caso de uso | Historia | Actor | Pantalla |
| --- | --- | --- | --- |
| CU-06 Iniciar sesión | HU-06 | Administrador y operador | Iniciar sesión |
| CU-07 Cerrar sesión | HU-07 | Administrador y operador | Encabezado de todas las páginas |
| CU-08 Acceder según el rol | HU-08 | Administrador y operador | Menú y todas las páginas |
| CU-09 Crear usuario | HU-09 | Administrador | Usuarios → Crear usuario |
| CU-10 Consultar usuarios | HU-10 | Administrador | Usuarios |
| CU-11 Consultar y buscar celdas | HU-11 | Administrador | Celdas |
| CU-12 Crear celda | HU-12 | Administrador | Celdas → Nueva celda |
| CU-13 Editar celda | HU-13 | Administrador | Celdas → Editar |
| CU-14 Eliminar celda | HU-14 | Administrador | Celdas → Eliminar |

Código UML: [`uml/casos-de-uso-usuarios.puml`](uml/casos-de-uso-usuarios.puml) y [`uml/casos-de-uso-celdas.puml`](uml/casos-de-uso-celdas.puml)

---

## 4. Mockups

Bocetos de baja fidelidad de cada historia de usuario. Las pantallas reales están en la [sección 10](#10-pantallas-implementadas).

**HU-06 · Iniciar sesión**

![Mockup iniciar sesión](img/mockup-login.png)

**HU-07 y HU-08 · Menú según el rol, cerrar sesión y página sin permiso**

![Mockup menú por rol y página sin permiso](img/mockup-sin-permiso.png)

**HU-09 · Crear usuario**

![Mockup crear usuario](img/mockup-crear-usuario.png)

**HU-10 · Consultar usuarios**

![Mockup consultar usuarios](img/mockup-usuarios.png)

**HU-11 · Consultar y buscar celdas**

![Mockup consultar y buscar celdas](img/mockup-celdas.png)

**HU-12 y HU-13 · Crear y editar celda**

![Mockup crear y editar celda](img/mockup-celda-formulario.png)

**HU-14 · Eliminar celda**

![Mockup eliminar celda](img/mockup-eliminar-celda.png)

Código: [`uml/mockup-*.puml`](uml/) (PlantUML Salt)

---

## 5. Diagramas de secuencia

Doce diagramas cubren las dos iteraciones. Los de fondo amarillo son de la iteración 2; los de fondo blanco, de la iteración 1 (ya con la comprobación de sesión). El plan de pruebas cita estos mismos identificadores (SD01 a SD12).

| Diagrama | Qué muestra | Historia | Iteración |
| --- | --- | --- | --- |
| [SD01](#sd01--iniciar-sesión) | Iniciar sesión | HU-06 | 2 |
| [SD02](#sd02--verificar-la-sesión-y-el-rol) | Verificar la sesión y el rol en una operación protegida | HU-08 | 2 |
| [SD03](#sd03--crear-usuario) | Crear usuario | HU-09 | 2 |
| [SD04](#sd04--consultar-y-buscar-celdas) | Consultar y buscar celdas | HU-11 | 2 |
| [SD05](#sd05--crear-celda) | Crear celda | HU-12 | 2 |
| [SD06](#sd06--editar-celda) | Editar celda | HU-13 | 2 |
| [SD07](#sd07--eliminar-celda) | Eliminar celda | HU-14 | 2 |
| [SD08](#sd08--consultar-disponibilidad-de-celdas) | Consultar disponibilidad de celdas | HU-04 | 1 |
| [SD09](#sd09--registrar-entrada) | Registrar entrada de vehículo | HU-01 | 1 |
| [SD10](#sd10--registrar-salida) | Registrar salida de vehículo | HU-02 | 1 |
| [SD11](#sd11--consultar-vehículos-dentro-e-historial) | Consultar vehículos dentro e historial | HU-03 y HU-05 | 1 |
| [SD12](#sd12--cerrar-sesión) | Cerrar sesión | HU-07 | 2 |

En todos, el **controlador** (una Server Action o una ruta de la API) recibe la petición, el **servicio** aplica las reglas y el **repositorio** ejecuta el SQL.

### SD01 · Iniciar sesión

![SD01 Iniciar sesión](img/sd01-iniciar-sesion.png)

### SD02 · Verificar la sesión y el rol

Los demás diagramas lo citan con un recuadro `ref`: todas las operaciones protegidas pasan por estos pasos.

![SD02 Verificar la sesión y el rol](img/sd02-verificar-sesion-y-rol.png)

### SD03 · Crear usuario

![SD03 Crear usuario](img/sd03-crear-usuario.png)

### SD04 · Consultar y buscar celdas

![SD04 Consultar y buscar celdas](img/sd04-consultar-celdas.png)

### SD05 · Crear celda

![SD05 Crear celda](img/sd05-crear-celda.png)

### SD06 · Editar celda

![SD06 Editar celda](img/sd06-editar-celda.png)

### SD07 · Eliminar celda

![SD07 Eliminar celda](img/sd07-eliminar-celda.png)

### SD08 · Consultar disponibilidad de celdas

![SD08 Consultar disponibilidad de celdas](img/sd08-consultar-disponibilidad.png)

### SD09 · Registrar entrada

![SD09 Registrar entrada](img/sd09-registrar-entrada.png)

### SD10 · Registrar salida

![SD10 Registrar salida](img/sd10-registrar-salida.png)

### SD11 · Consultar vehículos dentro e historial

![SD11 Consultar vehículos dentro e historial](img/sd11-consultar-vehiculos-e-historial.png)

### SD12 · Cerrar sesión

![SD12 Cerrar sesión](img/sd12-cerrar-sesion.png)

Código UML: [`uml/sd01-*.puml` a `uml/sd12-*.puml`](uml/)

---

## 6. Diagrama de componentes

Componentes del sistema después de las dos iteraciones. Los componentes amarillos son nuevos en la iteración 2.

![Diagrama de componentes](img/componentes.png)

| Componente | Carpeta | Responsabilidad |
| --- | --- | --- |
| Proxy | `src/proxy.ts` | Antes de mostrar una página, lleva al inicio de sesión a quien llega sin la cookie de sesión. |
| Páginas | `src/app` | Inicio de sesión, páginas del operador (Panel, Entrada, Salida, Historial) y del administrador (Celdas, Usuarios). |
| Componentes de interfaz | `src/components` | Formularios, diálogos, tablas y plano de celdas (shadcn/ui y componentes propios). |
| Server Actions | `src/acciones` | Controladores de los formularios: reciben los datos, llaman al servicio y devuelven el resultado a la pantalla. |
| API REST | `src/app/api` | Controladores JSON de las mismas operaciones, con códigos HTTP. |
| AutenticacionServicio | `src/servicios/autenticacion.ts` | Iniciar y cerrar sesión, saber quién hace la petición y autorizar por rol. |
| UsuarioServicio | `src/servicios/usuarios.ts` | Crear y consultar cuentas. |
| CeldaServicio | `src/servicios/celdas.ts` | Consultar, crear, editar y eliminar celdas. |
| ParqueaderoServicio | `src/servicios/parqueadero.ts` | Registrar entradas y salidas (iteración 1). |
| Repositorios | `src/repositorios` | Consultas SQL de usuarios, sesiones, celdas, vehículos y registros, sobre un pool de conexiones. |
| Modelos del dominio | `src/modelos` | Entidades (Usuario, Celda, Vehículo, Registro), reglas de formato y errores del negocio. |
| PostgreSQL | `db/schema.sql` | Tablas `usuario`, `sesion`, `celda`, `vehiculo` y `registro`. |

Las dependencias van siempre hacia abajo: presentación → controladores → servicios → repositorios → base de datos.

Código UML: [`uml/componentes.puml`](uml/componentes.puml)

---

## 7. Plan de pruebas resumido

El plan está en el formato [`Plan_Pruebas_Usuarios_Celdas_Autos_Colombia.xlsx`](../Plan_Pruebas_Usuarios_Celdas_Autos_Colombia.xlsx) (hojas **Plan** y **Casos**). Se diligenció con los resultados de la ejecución del 11 de noviembre de 2026 sobre la versión 0.2.0.

| Módulo | Casos | Aprobados | Fallidos | Bloqueados |
| --- | --- | --- | --- | --- |
| Usuarios (US-01 a US-12) | 12 | 12 | 0 | 0 |
| Permisos (PE-01 a PE-05) | 5 | 5 | 0 | 0 |
| Celdas (CE-01 a CE-13) | 13 | 13 | 0 | 0 |
| **Total** | **30** | **30** | **0** | **0** |

- **Entorno:** compilación de producción (`next build` y `next start`) contra una base de datos aislada, `autos_colombia_pruebas`. El caso CE-02 usó una segunda base sin celdas.
- **Cómo se probó:** cada caso se ejecutó por la API y, cuando aplica, en la interfaz con Microsoft Edge y con consultas a la base de datos, tal como pide su fila del plan.
- **Evidencias:** un archivo de texto por caso (peticiones, respuestas, consultas y comprobaciones) y 27 capturas de pantalla, en [`docs/pruebas/evidencias/`](pruebas/evidencias/). Las contraseñas y los tokens de sesión están ocultos.
- **Detalle de la ejecución**, hallazgos y forma de repetirla: [`docs/pruebas/README.md`](pruebas/README.md).

Queda pendiente la revisión del docente (campo *Dictamen del revisor* del formato).

---

## 8. Cambios al modelo de datos

La iteración 2 añade dos tablas y ajusta una. El script [`db/schema.sql`](../db/schema.sql) se puede ejecutar sobre una base de la iteración 1: conserva sus datos.

![Modelo físico después de la iteración 2](img/modelo-fisico-iteracion-2.png)

| Tabla | Cambio |
| --- | --- |
| `usuario` | **Nueva.** Cuentas de acceso: nombre de usuario único (en minúsculas), nombre completo, rol y hash de la contraseña. |
| `sesion` | **Nueva.** Sesiones abiertas: hash del token de la cookie, usuario y fecha de expiración. Cerrar sesión borra la fila. |
| `celda` | **Modificada.** El código pasa de 5 a 10 caracteres y la base valida su formato (letras, números y guiones, en mayúsculas). |
| `vehiculo`, `registro` | Sin cambios. Se añade un índice por celda para contar sus movimientos. |

Código UML: [`uml/modelo-fisico-iteracion-2.puml`](uml/modelo-fisico-iteracion-2.puml)

---

## 9. API REST

Todas las rutas reciben y responden JSON. La sesión viaja en la cookie `ac_sesion`, que entrega `POST /api/sesion`.

| Método y ruta | Rol | Qué hace | Respuestas |
| --- | --- | --- | --- |
| `POST /api/sesion` | — | Inicia sesión con `{ nombreUsuario, contrasena }`. | 200, 401, 422 |
| `GET /api/sesion` | Cualquiera | Devuelve la cuenta de la sesión actual. | 200, 401 |
| `DELETE /api/sesion` | Cualquiera | Cierra la sesión. | 204 |
| `GET /api/usuarios` | Administrador | Lista las cuentas. | 200, 401, 403 |
| `POST /api/usuarios` | Administrador | Crea una cuenta con `{ nombre, nombreUsuario, contrasena, rol }`. | 201, 401, 403, 409, 422 |
| `GET /api/celdas?buscar=&tipo=` | Administrador | Lista el catálogo, con búsqueda por código y filtro por tipo. | 200, 401, 403, 422 |
| `POST /api/celdas` | Administrador | Crea una celda con `{ codigo, tipo }`. | 201, 401, 403, 409, 422 |
| `GET /api/celdas/{id}` | Administrador | Consulta una celda. | 200, 401, 403, 404 |
| `PATCH /api/celdas/{id}` | Administrador | Cambia `codigo`, `tipo` o ambos. | 200, 401, 403, 404, 409, 422 |
| `DELETE /api/celdas/{id}` | Administrador | Elimina una celda sin uso. | 204, 401, 403, 404, 409 |
| `GET /api/celdas/disponibles?tipo=` | Operador | Lista las celdas libres. No reserva ninguna. | 200, 401, 403, 422 |
| `POST /api/entradas` | Operador | Registra una entrada con `{ placa, celdaId }`. | 201, 401, 403, 404, 409, 422 |
| `POST /api/salidas` | Operador | Registra una salida con `{ placa }`. | 200, 401, 403, 404, 422 |

Los errores responden `{ "error": "mensaje", "campo": "nombre del campo" }`. El campo solo aparece cuando el error corresponde a un dato concreto.

| Código | Significado |
| --- | --- |
| 401 | No hay sesión, se cerró o ya expiró. |
| 403 | La sesión es válida, pero su rol no puede hacer esa operación. |
| 404 | La celda o el registro no existe. |
| 409 | La operación choca con los datos actuales: código o usuario repetido, celda ocupada o con historial. |
| 422 | Falta un dato o no es válido. |

---

## 10. Pantallas implementadas

**Iniciar sesión (HU-06)**

![Iniciar sesión](img/pantalla-login.png)

**Menú del operador y página sin permiso (HU-08)**

![Panel con el menú del operador](img/pantalla-panel-operador.png)

![Página sin permiso](img/pantalla-sin-permiso.png)

**Consultar usuarios (HU-10) y cerrar sesión (HU-07)**

![Usuarios](img/pantalla-usuarios.png)

**Crear usuario (HU-09)**

![Crear usuario](img/pantalla-usuario-crear.png)

**Consultar y buscar celdas (HU-11)**

![Catálogo de celdas](img/pantalla-celdas.png)

![Búsqueda de celdas](img/pantalla-celdas-busqueda.png)

**Crear celda (HU-12)**

![Nueva celda](img/pantalla-celda-nueva.png)

**Editar celda (HU-13)**

![Editar celda](img/pantalla-celda-editar.png)

**Eliminar celda (HU-14)**

![Confirmar eliminación](img/pantalla-celda-eliminar.png)

![Celda que no se puede eliminar](img/pantalla-celda-no-eliminable.png)

**Catálogo de celdas en un teléfono**

<img src="img/pantalla-celdas-movil.png" alt="Catálogo de celdas en un teléfono" width="320">

---

### Cómo editar los diagramas

Los archivos `.puml` se abren con cualquier editor de PlantUML, por ejemplo la extensión *PlantUML* de VS Code o el editor en línea <https://www.plantuml.com/plantuml>. Para regenerar las imágenes con Java instalado:

```bash
java -jar plantuml.jar -charset UTF-8 -tpng -o ../img docs/uml/*.puml
```
