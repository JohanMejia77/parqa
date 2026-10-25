-- =============================================================
--  Autos Colombia - Modelo físico (PostgreSQL)
--  Iteración 1: gestión de entrada y salida de vehículos
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
CREATE TABLE IF NOT EXISTS celda (
  id      SERIAL      PRIMARY KEY,
  codigo  VARCHAR(5)  NOT NULL,
  tipo    VARCHAR(5)  NOT NULL,
  CONSTRAINT uq_celda_codigo UNIQUE (codigo),
  CONSTRAINT ck_celda_tipo   CHECK (tipo IN ('CARRO', 'MOTO'))
);

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
