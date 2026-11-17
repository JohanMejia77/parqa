# Autos Colombia

Sistema web para el parqueadero **Autos Colombia**, que presta servicio por mensualidad.
Esta es la **Iteración 2: gestión de usuarios y gestión de celdas**. Incluye la iteración 1 (entrada y salida de vehículos).

![Catálogo de celdas de Autos Colombia](docs/img/pantalla-celdas.png)

## Funcionalidades

### Iteración 2: usuarios y celdas

- **Iniciar y cerrar sesión:** cada persona entra con su usuario y su contraseña. La sesión dura 8 horas y al cerrarla deja de servir.
- **Roles:** el **administrador** gestiona usuarios y celdas; el **operador** registra entradas y salidas. Cada rol ve solo sus páginas y el servidor rechaza lo que no le corresponde.
- **Usuarios:** el administrador crea cuentas (nombre, usuario, rol y contraseña) y consulta las que existen.
- **Celdas:** el administrador consulta el catálogo, busca por código, filtra por tipo, y crea, edita o elimina celdas. Una celda ocupada o con historial no se elimina.
- **API REST:** las mismas operaciones en JSON, con códigos HTTP ([ver rutas](docs/iteracion-2.md#9-api-rest)).

### Iteración 1: entrada y salida de vehículos

- **Registrar entrada:** se escribe la placa, el sistema detecta si es carro o moto, propone la primera celda libre de ese tipo y guarda la hora.
- **Registrar salida:** se busca el vehículo por placa, se confirma la salida, se libera la celda y se muestra el tiempo de permanencia.
- **Panel:** plano de celdas libres y ocupadas, y lista de vehículos que están dentro.
- **Historial:** entradas y salidas registradas, con filtro por placa.

### Qué ve cada rol

| Rol | Páginas | Puede |
| --- | --- | --- |
| Administrador | Celdas, Usuarios | Crear usuarios, y consultar, crear, editar y eliminar celdas. |
| Operador | Panel, Entrada, Salida, Historial | Registrar entradas y salidas, y consultar vehículos, celdas e historial. |

## Tecnologías

| Tecnología | Uso |
| --- | --- |
| [Next.js 16](https://nextjs.org) | Framework *full stack*: páginas (React Server Components), Server Actions y API REST (Route Handlers). |
| [shadcn/ui](https://ui.shadcn.com) | Componentes de interfaz (Base UI + Tailwind CSS 4). |
| [PostgreSQL](https://www.postgresql.org) | Base de datos, conectada con el driver [`pg`](https://node-postgres.com). |
| TypeScript | Lenguaje de todo el proyecto. |

No se añadieron dependencias en la iteración 2: las contraseñas se protegen con `scrypt`, incluido en Node.js.

## Requisitos previos

| Programa | Versión | Comprobar con |
| --- | --- | --- |
| [Node.js](https://nodejs.org) | 22 o superior (recomendado 24 LTS) | `node --version` |
| [PostgreSQL](https://www.postgresql.org/download/) | 14 o superior | pgAdmin o `psql --version` |
| [Git](https://git-scm.com) | cualquiera reciente | `git --version` |

Al instalar PostgreSQL en Windows, recuerda la contraseña que asignas al usuario `postgres`. Si prefieres no instalarlo, puedes usar [Docker](#opción-postgresql-con-docker).

## Instalación y ejecución paso a paso

### 1. Clonar el repositorio

Reemplaza la URL por la del repositorio en GitHub:

```bash
git clone https://github.com/USUARIO/AutosColombia.git
```

```bash
cd AutosColombia
```

### 2. Instalar las dependencias

```bash
npm install
```

### 3. Configurar la conexión y la cuenta inicial

Crea el archivo `.env` a partir de la plantilla.

En Windows (PowerShell o CMD):

```bash
copy .env.example .env
```

En macOS o Linux:

```bash
cp .env.example .env
```

Abre `.env` y revisa sus tres variables:

```
DATABASE_URL=postgresql://postgres:TU_CONTRASEÑA@localhost:5432/autos_colombia
ADMIN_USUARIO=admin
ADMIN_CONTRASENA=autos-colombia-2026
```

- `DATABASE_URL`: si la contraseña de tu usuario `postgres` no es `postgres`, cámbiala aquí.
- `ADMIN_USUARIO` y `ADMIN_CONTRASENA`: la cuenta de administrador con la que entrarás la primera vez. Puedes dejar los valores de la plantilla para probar o poner los tuyos (la contraseña necesita mínimo 8 caracteres).

No necesitas crear la base de datos a mano: el siguiente paso la crea.

### 4. Crear la base de datos, las tablas y los datos de ejemplo

```bash
npm run db:setup
```

Debe terminar con:

```
Cuenta de administrador "admin" creada. Su contraseña es la de ADMIN_CONTRASENA en .env.

Base de datos "autos_colombia" lista. Ejecuta: npm run dev
```

Se crean 30 celdas (A-01 a A-20 para carros, M-01 a M-10 para motos), algunos movimientos de ejemplo y la cuenta inicial de administrador.

> **Si ya tenías la iteración 1 instalada:** añade a tu `.env` las variables `ADMIN_USUARIO` y `ADMIN_CONTRASENA` de `.env.example` y ejecuta otra vez `npm run db:setup`. La base se actualiza sin borrar tus datos.

### 5. Ejecutar la aplicación

```bash
npm run dev
```

Abre <http://localhost:3000> en el navegador: aparece el inicio de sesión. Para detener el servidor, pulsa `Ctrl + C` en la terminal.

## Opción: PostgreSQL con Docker

Si tienes Docker, este comando levanta PostgreSQL con el usuario y la contraseña que ya trae `.env.example`:

```bash
docker run --name autos-colombia-db -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:17
```

Después sigue los pasos 3 a 5 sin modificar `.env`.

## Recorrido de prueba

### Como administrador

1. **Iniciar sesión:** entra con el usuario y la contraseña de `ADMIN_USUARIO` y `ADMIN_CONTRASENA` (por defecto `admin` y `autos-colombia-2026`). Llegas a **Celdas** y el menú muestra solo Celdas y Usuarios.
2. **Buscar celdas:** escribe `A-0`, elige *Carros* y pulsa **Buscar**: quedan las celdas A-01 a A-09. Pulsa **Quitar filtros**.
3. **Crear celda:** pulsa **Nueva celda**, escribe `a-21`, elige *Carro* y pulsa **Crear celda**. El código queda como A-21, aparece el aviso y la fila nueva se resalta.
4. Crea otra vez `A-21`: el sistema avisa que ya existe una celda con ese código.
5. **Editar celda:** en A-21 pulsa **Editar**, cambia el tipo a *Moto* y guarda. En A-01, que está ocupada, el tipo aparece bloqueado.
6. **Eliminar celda:** en A-21 pulsa **Eliminar** y confirma. En A-01 el sistema explica que no se puede eliminar porque está ocupada.
7. **Crear usuario:** abre **Usuarios**, pulsa **Crear usuario** y crea un operador, por ejemplo *Laura Gómez*, usuario `laura.gomez`, rol *Operador* y una contraseña de 8 caracteres o más.
8. **Cerrar sesión:** pulsa **Cerrar sesión** arriba a la derecha.

### Como operador

9. Entra con la cuenta que acabas de crear. Llegas al **Panel** y el menú muestra Panel, Entrada, Salida e Historial.
10. **Entrada:** escribe la placa `XYZ789`. El sistema detecta *Carro* y propone la celda A-02. Pulsa **Registrar entrada**.
11. **Salida:** busca `XYZ789` y pulsa **Confirmar salida**: la celda se libera y se muestra el tiempo de permanencia.
12. **Permisos:** escribe en el navegador la dirección `http://localhost:3000/usuarios`. El sistema informa que tu cuenta no tiene permiso para esa página.

Para volver a los datos de ejemplo en cualquier momento: `npm run db:reset`. Borra también las cuentas y vuelve a crear la de administrador.

## Scripts disponibles

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Inicia la aplicación en modo desarrollo en <http://localhost:3000>. |
| `npm run build` y `npm start` | Compila y ejecuta la versión de producción. |
| `npm run lint` | Revisa el código con ESLint. |
| `npm run db:setup` | Crea la base (si no existe), las tablas, los datos iniciales y la cuenta de administrador. No borra datos existentes. |
| `npm run db:reset` | Borra las tablas y las vuelve a crear con los datos de ejemplo y la cuenta de administrador. |

## Estructura del proyecto

```
AutosColombia/
├── db/
│   ├── schema.sql        # Modelo físico: tablas, restricciones e índices
│   └── seed.sql          # Celdas y movimientos de ejemplo
├── docs/                 # Documentación de las entregas
│   ├── iteracion-1.md    # Entrada y salida de vehículos
│   ├── iteracion-2.md    # Usuarios y celdas: requerimientos, historias y diagramas
│   ├── uml/              # Código UML (PlantUML)
│   ├── img/              # Diagramas, mockups y capturas en PNG
│   └── pruebas/          # Evidencias del plan de pruebas y scripts para repetirlo
├── scripts/
│   └── db.mjs            # Prepara la base de datos (db:setup y db:reset)
├── Plan_Pruebas_Usuarios_Celdas_Autos_Colombia.xlsx   # Plan de pruebas diligenciado
└── src/
    ├── proxy.ts          # Lleva al inicio de sesión a quien llega sin sesión
    ├── app/              # Presentación: páginas del operador, del administrador y /login
    │   └── api/          # API REST: sesión, usuarios, celdas, entradas y salidas
    ├── components/       # Presentación: componentes de pantalla (ui/ = shadcn/ui)
    ├── acciones/         # Server Actions: reciben los formularios (controladores)
    ├── servicios/        # Lógica de negocio: autenticación, usuarios, celdas y parqueadero
    ├── repositorios/     # Acceso a datos: consultas SQL a PostgreSQL
    ├── modelos/          # Entidades del dominio y reglas de formato
    └── lib/              # Utilidades: fechas, contraseñas y lectura de parámetros
```

## Documentación de la entrega

Índice: [`docs/README.md`](docs/README.md)

**Iteración 2** — [`docs/iteracion-2.md`](docs/iteracion-2.md):

1. [Requerimientos funcionales y no funcionales](docs/iteracion-2.md#1-requerimientos)
2. [Historias de usuario](docs/iteracion-2.md#2-historias-de-usuario)
3. [Diagramas de casos de uso](docs/iteracion-2.md#3-diagramas-de-casos-de-uso)
4. [Mockups](docs/iteracion-2.md#4-mockups)
5. [Diagramas de secuencia de las iteraciones 1 y 2](docs/iteracion-2.md#5-diagramas-de-secuencia)
6. [Diagrama de componentes de las iteraciones 1 y 2](docs/iteracion-2.md#6-diagrama-de-componentes)
7. [Plan de pruebas resumido](docs/iteracion-2.md#7-plan-de-pruebas-resumido): [formato diligenciado](Plan_Pruebas_Usuarios_Celdas_Autos_Colombia.xlsx) y [evidencias](docs/pruebas/README.md)

**Iteración 1** — [`docs/iteracion-1.md`](docs/iteracion-1.md): requerimientos, historias de usuario, arquitectura, mockups, modelo de datos, casos de uso, clases y paquetes.

## Solución de problemas

| Problema | Solución |
| --- | --- |
| `PostgreSQL no responde en localhost:5432` | El servicio de PostgreSQL está apagado. En Windows: menú Inicio → *Servicios* → `postgresql-x64-…` → *Iniciar*. |
| `usuario o contraseña incorrectos` al ejecutar `db:setup` | Corrige usuario y contraseña en `DATABASE_URL` del archivo `.env`. Si la contraseña tiene símbolos como `@` o `#`, escríbelos codificados (`@` = `%40`, `#` = `%23`). |
| `Falta DATABASE_URL` | No se creó el archivo `.env` (paso 3). |
| `define en el archivo .env ADMIN_USUARIO…` | Faltan `ADMIN_USUARIO` o `ADMIN_CONTRASENA` en `.env`, o la contraseña tiene menos de 8 caracteres. Cópialas de `.env.example` y ejecuta otra vez `npm run db:setup`. |
| La cuenta inicial no entra: «Usuario o contraseña incorrectos» | La cuenta se crea solo si no hay ningún administrador. Si cambiaste `ADMIN_CONTRASENA` después de crearla, vale la primera. Para empezar de nuevo: `npm run db:reset` (borra los datos). |
| La página dice "No se pudo cargar la información" | PostgreSQL está apagado o `.env` es incorrecto. Corrígelo y pulsa **Reintentar**. |
| `npm.ps1 no se puede cargar porque la ejecución de scripts está deshabilitada` | En PowerShell usa `npm.cmd` en lugar de `npm` (por ejemplo, `npm.cmd install`), o usa la terminal CMD. |
| `'npm' no se reconoce como un comando` | Instala Node.js y abre una terminal nueva. |
| `Port 3000 is in use` | Next.js usará otro puerto (mira la dirección que muestra la terminal) o cierra la otra aplicación. |

## Herramientas usadas en el desarrollo

El proyecto se creó con `npx create-next-app@latest` y `npx shadcn@latest init`. Para el diseño y las buenas prácticas se usaron skills de agentes, listadas en `skills-lock.json`:

| Skill | Para qué se usó |
| --- | --- |
| [shadcn/ui](https://github.com/shadcn-ui/ui), [impeccable](https://github.com/pbakaus/impeccable) y [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) | Componentes, diseño y buenas prácticas de React y Next.js (desde la iteración 1). |
| [modern-web-guidance](https://github.com/GoogleChrome/modern-web-guidance) | Buenas prácticas web actuales: diálogo nativo `<dialog>`, formularios de inicio de sesión y de registro, tablas adaptables y movimiento accesible. |
| [taste-skill](https://github.com/Leonxlnx/taste-skill) | Criterios de diseño: un solo sistema visual, textos directos y controles que responden al usarlos. |
| [emilkowalski/skills](https://github.com/emilkowalski/skills) | Animaciones con propósito: respuesta al pulsar, entrada y salida de diálogos, y resaltado de la fila recién guardada. |

Como referencia se tomó el repositorio del docente [ReinaldoRojas/AutosColombia](https://github.com/ReinaldoRojas/AutosColombia).
