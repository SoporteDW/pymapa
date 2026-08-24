# Macroentrega 5.2 · Estabilización del Journey — análisis previo

## Causa raíz transversal (una sola, no una por pantalla)

Cada hook de estado (`use-evidencias`, `use-estado-diagnostico`, `use-workspace`,
`use-seguimiento`, cierre del diagnóstico) mantiene **su propia copia local en
`useState`** de un registro que vive en almacenamiento del navegador, y solo la
lee **una vez al montar**. No existe suscripción compartida.

Consecuencia directa del contador contradictorio de profundización:
`/diagnostico/cierre` monta **dos instancias independientes** del mismo estado
— una vía `useEvidencias()` (la que escribe la evidencia/aclaración) y otra
dentro de `useEstadoDiagnostico()` (la que calcula "faltan 3 aspectos"). La
tarjeta dice "información suficiente" porque usa la instancia que escribió; el
pie de página sigue diciendo "faltan 3" porque su instancia nunca volvió a leer.

La misma causa explica el resto de síntomas reportados: estados históricos que
proponen pasos ya completados, CTA desincronizado, cierre del diagnóstico que no
se refleja en otra pantalla, seguimiento que no refleja el checkpoint recién
registrado. **No es un problema de textos ni de botones: es una fuente de verdad
que no notifica sus cambios.**

Segundo hallazgo, independiente y puntual: el botón de descarga del PDF
(`tarjeta-entregable.tsx`) combina `download` con `target="_blank"`. En el
preview embebido eso abre una pestaña nueva que queda en gris en vez de
descargar. El recurso responde 200; la experiencia falla por el `target`.

## Lógica existente que se reutiliza (no se reconstruye)

- `src/lib/diagnostico/estado-journey.ts` — máquina de estados del diagnóstico (ya correcta como función pura).
- `src/lib/siguiente-paso/orquestador.ts` — orquestador de CTA (se corrige y amplía, no se reescribe).
- `src/lib/journey/etapas.ts` — bloqueos por etapa.
- `src/lib/seguimiento/servicio.ts` — hitos d30/d60/d90 y evaluación.
- Todos los repositorios y servicios de `src/lib/**` quedan intactos.

## Qué es reproceso (corrección, no funcionalidad nueva)

Contador y cierre de la profundización; no regresión de pasos completados; CTA
lineal centralizado; persistencia del cierre del diagnóstico; descarga real del
PDF; navegación sin loops; bloqueo secuencial del journey. Todo esto se resuelve
en la capa de estado compartido + orquestador, no pantalla por pantalla.

## Qué es realmente nuevo

1. **Bus de estado reactivo compartido** (~60 líneas): un `useSyncExternalStore`
   sobre una versión que se incrementa en cada escritura de repositorio. Es la
   pieza que faltaba para que "una acción completada permanezca completada en
   todo Pymapa". Es infraestructura mínima, no una reescritura.
2. **Dashboard de Evolución + Informe de Avance demostrativo** (punto 10-11 de la
   solicitud): esta es la única extensión visible de alcance. Gráfica línea base
   → d30 → d60 → d90 con puntos futuros marcados como pendientes.
3. **Bloqueo secuencial 30/60/90 con resultado intermedio**: hoy los tres hitos
   se ofrecen a la vez; la regla de habilitación por checkpoint es nueva (regla,
   no módulo).

Todo lo demás son correcciones sobre código existente.

## Archivos que preveo modificar

Bloque A · Estado y navegación (P0)
- nuevo `src/lib/estado/bus.ts` (+ suscripción en los repositorios que ya escriben)
- `src/hooks/use-evidencias.ts`, `use-estado-diagnostico.ts`, `use-workspace.ts`, `use-seguimiento.ts` (leer del bus en vez de copia local)
- `src/lib/diagnostico/estado-journey.ts` (estado `profundizacion_completada` explícito + CTA "Procesar y cerrar mi diagnóstico")
- `src/lib/siguiente-paso/orquestador.ts` (tabla de CTA del punto 5, sin duplicar por ruta)
- `src/routes/diagnostico.cierre.tsx`, `diagnostico.index.tsx`, `diagnostico.listo.tsx` (consumir el estado central; bloque "Profundización completada ✓")

Bloque B · Descarga y escudo de error (P0)
- `src/components/entregables/tarjeta-entregable.tsx` (quitar `target="_blank"`)
- `src/routes/__root.tsx` / componentes de error y 404 (mensaje "No pudimos abrir esta página" + "Volver a Pymapa")

Bloque C · Simplificación UX (P1)
- Un CTA principal por pantalla en las rutas de diagnóstico, plan y seguimiento; el resto pasa a jerarquía secundaria. Sin rediseño visual.

Bloque D · Seguimiento y evolución (P1)
- `src/lib/seguimiento/servicio.ts` (habilitación secuencial), `src/routes/seguimiento.*`
- nuevo componente de evolución + entrada "Informe de Avance · Demostrativo" en `src/lib/entregables/catalogo.ts`

## Cómo evito correcciones duplicadas

Ninguna pantalla decidirá su propio CTA: todas leen `journey.siguiente` /
`useSiguientePaso()`. Si un CTA sale mal, se corrige en un solo archivo. Las
pantallas históricas recibirán su CTA del mismo estado, por lo que no pueden
ofrecer un paso ya completado.

## Orden

A → QA · B → QA · C → QA · D → QA, con recorrido manual end-to-end de Moda
Origen y la segunda pasada regresiva (entrar a preliminar/profundización/plan/
roadmap desde un estado avanzado) antes de cerrar.
