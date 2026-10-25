# Autos Colombia

Sistema web para el parqueadero **Autos Colombia**, que presta servicio por mensualidad.
Esta es la **Iteración 1: gestión de la entrada y salida de vehículos**.

![Panel de Autos Colombia](docs/img/pantalla-panel.png)

## Funcionalidades de esta iteración

- **Registrar entrada:** se escribe la placa, el sistema detecta si es carro o moto, propone la primera celda libre de ese tipo y guarda la hora. Si la placa es nueva, el vehículo se registra en ese momento.
- **Registrar salida:** se busca el vehículo por placa, se confirma la salida, se libera la celda y se muestra el tiempo de permanencia.
- **Panel:** plano de celdas libres y ocupadas, y lista de vehículos que están dentro.
- **Historial:** entradas y salidas registradas, con filtro por placa.

## Tecnologías

| Tecnología | Uso |
| --- | --- |
| [Next.js 16](https://nextjs.org) | Framework *full stack*: páginas (React Server Components) y lógica de servidor (Server Actions). |
| [shadcn/ui](https://ui.shadcn.com) | Componentes de interfaz (Base UI + Tailwind CSS 4). |
| [PostgreSQL](https://www.postgresql.org) | Base de datos, conectada con el driver [`pg`](https://node-postgres.com). |
| TypeScript | Lenguaje de todo el proyecto. |

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

### 3. Configurar la conexión a PostgreSQL

Crea el archivo `.env` a partir de la plantilla.

En Windows (PowerShell o CMD):

```bash
copy .env.example .env
```

En macOS o Linux:

```bash
cp .env.example .env
```

Abre `.env` y, si la contraseña de tu usuario `postgres` no es `postgres`, cámbiala:

```
DATABASE_URL=postgresql://postgres:TU_CONTRASEÑA@localhost:5432/autos_colombia
```

No necesitas crear la base de datos a mano: el siguiente paso la crea.

### 4. Crear la base de datos, las tablas y los datos de ejemplo

```bash
npm run db:setup
```

Debe terminar con:

```
Base de datos "autos_colombia" lista. Ejecuta: npm run dev
```

Se crean 30 celdas (A-01 a A-20 para carros, M-01 a M-10 para motos) y algunos movimientos de ejemplo.

### 5. Ejecutar la aplicación

```bash
npm run dev
```

Abre <http://localhost:3000> en el navegador. Para detener el servidor, pulsa `Ctrl + C` en la terminal.

## Opción: PostgreSQL con Docker

Si tienes Docker, este comando levanta PostgreSQL con el usuario y la contraseña que ya trae `.env.example`:

```bash
docker run --name autos-colombia-db -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:17
```

Después sigue los pasos 3 a 5 sin modificar `.env`.

## Recorrido de prueba

1. **Panel:** hay 4 vehículos de ejemplo dentro y el plano muestra sus celdas ocupadas.
2. **Entrada:** escribe la placa `XYZ789`. El sistema detecta *Carro* y propone la celda A-02. Pulsa **Registrar entrada**: aparece la confirmación y la celda queda ocupada.
3. Escribe otra vez `XYZ789`: el sistema avisa que el vehículo ya está dentro.
4. Escribe `ABC12D`: se detecta *Moto* y solo se ofrecen celdas M-.
5. **Salida:** busca `XYZ789` y pulsa **Confirmar salida**: la celda se libera y se muestra el tiempo de permanencia.
6. **Historial:** filtra por `XYZ` para ver la entrada y la salida registradas.

Para volver a los datos de ejemplo en cualquier momento: `npm run db:reset`.

## Scripts disponibles

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Inicia la aplicación en modo desarrollo en <http://localhost:3000>. |
| `npm run build` y `npm start` | Compila y ejecuta la versión de producción. |
| `npm run lint` | Revisa el código con ESLint. |
| `npm run db:setup` | Crea la base (si no existe), las tablas y los datos iniciales. No borra datos existentes. |
| `npm run db:reset` | Borra las tablas y las vuelve a crear con los datos de ejemplo. |

## Estructura del proyecto

```
AutosColombia/
├── db/
│   ├── schema.sql        # Modelo físico: tablas, restricciones e índices
│   └── seed.sql          # Celdas y movimientos de ejemplo
├── docs/                 # Documentación de la entrega
│   ├── README.md         # Requerimientos, historias de usuario y diagramas
│   ├── uml/              # Código UML (PlantUML)
│   └── img/              # Diagramas, mockups y capturas en PNG
├── scripts/
│   └── db.mjs            # Prepara la base de datos (db:setup y db:reset)
└── src/
    ├── app/              # Presentación: páginas Panel, Entrada, Salida e Historial
    ├── components/       # Presentación: componentes de pantalla (ui/ = shadcn/ui)
    ├── acciones/         # Server Actions: reciben los formularios (controladores)
    ├── servicios/        # Lógica de negocio del parqueadero
    ├── repositorios/     # Acceso a datos: consultas SQL a PostgreSQL
    ├── modelos/          # Entidades del dominio y validación de placas
    └── lib/              # Utilidades (formato de fechas)
```

## Documentación de la entrega

Todo está en [`docs/README.md`](docs/README.md):

1. [Requerimientos funcionales y no funcionales](docs/README.md#1-requerimientos)
2. [Historias de usuario](docs/README.md#2-historias-de-usuario)
3. [Arquitectura del sistema](docs/README.md#3-arquitectura-del-sistema)
4. [Mockups](docs/README.md#4-mockups)
5. [MER, MR y modelo físico](docs/README.md#5-modelo-de-datos)
6. [Diagrama de casos de uso](docs/README.md#6-diagrama-de-casos-de-uso)
7. [Diagrama de clases](docs/README.md#7-diagrama-de-clases)
8. [Diagrama de paquetes](docs/README.md#8-diagrama-de-paquetes)

## Solución de problemas

| Problema | Solución |
| --- | --- |
| `PostgreSQL no responde en localhost:5432` | El servicio de PostgreSQL está apagado. En Windows: menú Inicio → *Servicios* → `postgresql-x64-…` → *Iniciar*. |
| `usuario o contraseña incorrectos` | Corrige usuario y contraseña en `DATABASE_URL` del archivo `.env`. Si la contraseña tiene símbolos como `@` o `#`, escríbelos codificados (`@` = `%40`, `#` = `%23`). |
| `Falta DATABASE_URL` | No se creó el archivo `.env` (paso 3). |
| La página dice "No se pudo cargar la información" | PostgreSQL está apagado o `.env` es incorrecto. Corrígelo y pulsa **Reintentar**. |
| `npm.ps1 no se puede cargar porque la ejecución de scripts está deshabilitada` | En PowerShell usa `npm.cmd` en lugar de `npm` (por ejemplo, `npm.cmd install`), o usa la terminal CMD. |
| `'npm' no se reconoce como un comando` | Instala Node.js y abre una terminal nueva. |
| `Port 3000 is in use` | Next.js usará otro puerto (mira la dirección que muestra la terminal) o cierra la otra aplicación. |

## Herramientas usadas en el desarrollo

El proyecto se creó con `npx create-next-app@latest` y `npx shadcn@latest init`. Para el diseño y las buenas prácticas se usaron las skills de agentes [shadcn/ui](https://github.com/shadcn-ui/ui), [impeccable](https://github.com/pbakaus/impeccable) y [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) (listadas en `skills-lock.json`). Como referencia se tomó el repositorio del docente [ReinaldoRojas/AutosColombia](https://github.com/ReinaldoRojas/AutosColombia).
