-- =============================================================
--  Autos Colombia - Modelo físico (PostgreSQL)
--  Iteración 1: entrada y salida de vehículos
--  Iteración 2: usuarios (cuentas y sesiones) y gestión de celdas
--
--  Es seguro ejecutarlo varias veces. También actualiza una base
--  creada con la iteración 1 sin borrar sus datos.
-- =============================================================

-- Vehículos que han ingresado al parqueadero.
-- La placa se guarda normalizada: mayúsculas y sin espacios ni guiones.
CREATE TABLE IF NOT EXISTS vehiculo (
  id         SERIAL       PRIMARY KEY,
  placa      VARCHAR(6)   NOT NULL,
  tipo       VARCHAR(5)   NOT NULL,
  creado_en  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT uq_vehiculo_placa UNIQUE (placa),
  CONSTRAINT ck_vehiculo_tipo  CHECK (tipo IN ('CARRO', 'MOTO'))
);

-- Celdas (espacios) del parqueadero. Cada celda admite un solo tipo de vehículo.
-- El código se guarda normalizado: mayúsculas, con letras, números y guiones (A-01, M-10).
CREATE TABLE IF NOT EXISTS celda (
  id      SERIAL       PRIMARY KEY,
  codigo  VARCHAR(10)  NOT NULL,
  tipo    VARCHAR(5)   NOT NULL,
  CONSTRAINT uq_celda_codigo UNIQUE (codigo),
  CONSTRAINT ck_celda_tipo   CHECK (tipo IN ('CARRO', 'MOTO'))
);

-- Iteración 2: el código pasa de 5 a 10 caracteres y la base valida su formato.
-- (Estas tres sentencias actualizan las bases creadas con la iteración 1.)
ALTER TABLE celda ALTER COLUMN codigo TYPE VARCHAR(10);
ALTER TABLE celda DROP CONSTRAINT IF EXISTS ck_celda_codigo;
ALTER TABLE celda ADD CONSTRAINT ck_celda_codigo CHECK (codigo ~ '^[A-Z0-9]+(-[A-Z0-9]+)*$');

-- Registro de cada estancia: una entrada y, cuando ocurre, su salida.
-- fecha_salida NULL significa que el vehículo sigue dentro.
CREATE TABLE IF NOT EXISTS registro (
  id             SERIAL       PRIMARY KEY,
  vehiculo_id    INTEGER      NOT NULL,
  celda_id       INTEGER      NOT NULL,
  fecha_entrada  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  fecha_salida   TIMESTAMPTZ,
  CONSTRAINT fk_registro_vehiculo FOREIGN KEY (vehiculo_id) REFERENCES vehiculo (id) ON DELETE RESTRICT,
  CONSTRAINT fk_registro_celda    FOREIGN KEY (celda_id)    REFERENCES celda (id)    ON DELETE RESTRICT,
  CONSTRAINT ck_registro_fechas   CHECK (fecha_salida IS NULL OR fecha_salida >= fecha_entrada)
);

-- Un vehículo no puede tener dos entradas abiertas al mismo tiempo.
CREATE UNIQUE INDEX IF NOT EXISTS uq_registro_vehiculo_dentro
  ON registro (vehiculo_id) WHERE fecha_salida IS NULL;

-- Una celda no puede estar ocupada por dos vehículos al mismo tiempo.
CREATE UNIQUE INDEX IF NOT EXISTS uq_registro_celda_ocupada
  ON registro (celda_id) WHERE fecha_salida IS NULL;

-- Acelera la consulta del historial (más recientes primero).
CREATE INDEX IF NOT EXISTS ix_registro_fecha_entrada
  ON registro (fecha_entrada DESC);

-- Acelera contar los movimientos de cada celda (catálogo de celdas).
CREATE INDEX IF NOT EXISTS ix_registro_celda
  ON registro (celda_id);

-- Usuarios: cuentas de acceso al sistema, cada una con un rol.
-- nombre_usuario se guarda en minúsculas. La contraseña nunca se guarda:
-- solo su hash (scrypt con sal aleatoria).
CREATE TABLE IF NOT EXISTS usuario (
  id               SERIAL        PRIMARY KEY,
  nombre_usuario   VARCHAR(30)   NOT NULL,
  nombre           VARCHAR(80)   NOT NULL,
  rol              VARCHAR(13)   NOT NULL,
  contrasena_hash  VARCHAR(255)  NOT NULL,
  creado_en        TIMESTAMPTZ   NOT NULL DEFAULT now(),
  CONSTRAINT uq_usuario_nombre_usuario UNIQUE (nombre_usuario),
  CONSTRAINT ck_usuario_rol            CHECK (rol IN ('ADMINISTRADOR', 'OPERADOR')),
  CONSTRAINT ck_usuario_nombre         CHECK (btrim(nombre) <> '')
);

-- Sesiones abiertas. La cookie del navegador guarda un token aleatorio;
-- aquí solo se guarda su hash SHA-256, para que una copia de la base no sirva para entrar.
-- Cerrar sesión borra la fila; pasada la fecha expira_en la sesión deja de ser válida.
CREATE TABLE IF NOT EXISTS sesion (
  token_hash  CHAR(64)     PRIMARY KEY,
  usuario_id  INTEGER      NOT NULL,
  creada_en   TIMESTAMPTZ  NOT NULL DEFAULT now(),
  expira_en   TIMESTAMPTZ  NOT NULL,
  CONSTRAINT fk_sesion_usuario FOREIGN KEY (usuario_id) REFERENCES usuario (id) ON DELETE CASCADE
);
