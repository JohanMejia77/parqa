-- =============================================================
--  Autos Colombia - Datos iniciales
--  Celdas del parqueadero y algunos movimientos de ejemplo.
--  Es seguro ejecutarlo varias veces: no duplica información.
-- =============================================================

-- 20 celdas para carros (A-01 ... A-20)
INSERT INTO celda (codigo, tipo)
SELECT 'A-' || lpad(n::text, 2, '0'), 'CARRO'
FROM generate_series(1, 20) AS n
ON CONFLICT (codigo) DO NOTHING;

-- 10 celdas para motos (M-01 ... M-10)
INSERT INTO celda (codigo, tipo)
SELECT 'M-' || lpad(n::text, 2, '0'), 'MOTO'
FROM generate_series(1, 10) AS n
ON CONFLICT (codigo) DO NOTHING;

-- Vehículos de ejemplo
INSERT INTO vehiculo (placa, tipo) VALUES
  ('KJT482', 'CARRO'),
  ('HQX915', 'CARRO'),
  ('FNC208', 'CARRO'),
  ('RTP37F', 'MOTO'),
  ('BOG771', 'CARRO'),
  ('MDE19K', 'MOTO')
ON CONFLICT (placa) DO NOTHING;

-- Movimientos de ejemplo (solo si todavía no hay ningún registro)
INSERT INTO registro (vehiculo_id, celda_id, fecha_entrada, fecha_salida)
SELECT v.id, c.id, now() - m.entrada, now() - m.salida
FROM (VALUES
  -- Vehículos que siguen dentro (sin salida)
  ('KJT482', 'A-01', interval '3 hours 20 minutes', NULL::interval),
  ('HQX915', 'A-04', interval '1 hour 5 minutes',   NULL),
  ('FNC208', 'A-07', interval '25 minutes',         NULL),
  ('RTP37F', 'M-02', interval '45 minutes',         NULL),
  -- Estancias ya terminadas (historial)
  ('BOG771', 'A-02', interval '1 day 2 hours',      interval '1 day'),
  ('MDE19K', 'M-01', interval '6 hours',            interval '4 hours 30 minutes'),
  ('BOG771', 'A-05', interval '5 hours',            interval '2 hours 10 minutes')
) AS m (placa, celda, entrada, salida)
JOIN vehiculo v ON v.placa = m.placa
JOIN celda c ON c.codigo = m.celda
WHERE NOT EXISTS (SELECT 1 FROM registro);
