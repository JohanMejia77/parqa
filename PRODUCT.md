# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js (App Router, full stack) + shadcn/ui (Base UI, Tailwind CSS v4) + PostgreSQL, definido por el enunciado de la actividad académica.

## Users

Operador del parqueadero "Autos Colombia" que trabaja en la caseta de la portería, frente a un computador de escritorio. Su trabajo es registrar rápidamente cada vehículo que entra o sale, mientras el conductor espera en la barrera.

## Product Purpose

Sistema de gestión de un parqueadero que presta servicio por mensualidad. Esta primera iteración cubre solo la gestión de entrada y salida de vehículos: registrar entradas, registrar salidas, ver qué vehículos están dentro y qué celdas están libres. Éxito: registrar una entrada o una salida en segundos y sin errores (sin dobles entradas, sin celdas ocupadas dos veces).

## Positioning

Proyecto académico (Ingeniería de Software). Debe ser sencillo, fácil de clonar y ejecutar por el docente, y coherente con los diagramas UML entregados.

## Operating Context

- Uso continuo durante la jornada, con picos de llegada en horas de entrada y salida laboral.
- El operador escribe la placa con el teclado; el conductor espera, por lo que la velocidad importa.
- Los registros se hacen siempre con la hora del servidor.

## Capabilities and Constraints

- Entrada: placa + tipo (carro o moto) + celda. Si la placa no existe, el vehículo se registra en ese momento.
- La celda la elige el operador entre las celdas libres del tipo del vehículo; se preselecciona la primera libre.
- Salida: por placa o desde la lista de vehículos dentro; muestra el tiempo de permanencia.
- Un vehículo no puede entrar dos veces sin salir; una celda no puede tener dos vehículos.
- Fuera de alcance en esta iteración: usuarios/mensualidades, pagos, novedades, administración de celdas y autenticación.

## Brand Commitments

Nombre: "Autos Colombia". Interfaz en español de Colombia. No hay logo ni identidad visual previa.

## Evidence on Hand

Ninguna. No inventar clientes, cifras ni testimonios.

## Product Principles

1. Velocidad en la portería: la acción principal (registrar entrada/salida) siempre a un paso.
2. Estado visible: el operador ve de un vistazo cuántas celdas hay libres y quién está dentro.
3. Errores imposibles antes que mensajes de error: solo se ofrecen celdas libres y válidas.
4. Sencillez académica: cada pantalla corresponde a una historia de usuario.

## Accessibility & Inclusion

Contraste AA, navegación completa por teclado y etiquetas en todos los campos.
