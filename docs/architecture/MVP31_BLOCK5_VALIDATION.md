# MVP31 · Bloque 5 · Validación integral de los escenarios A y B (2026-10-28)

## Estado
MVP31 **no completo**: el Escenario B aún no se ejecutó en la empresa de josefo@digiway.co (espera confirmación del propietario).

## 1. Escenario B (josefo@digiway.co, org 7fb3141d…)
- Verificado solo lectura: 1 caso, 1 evaluación, 0 respuestas, 0 evidencias, 0 análisis, 0 decisiones. Sin cambios.
- Aislamiento como objetivo cruzado: Qhapaq e INT-01 no ven ninguna fila de esta empresa (incluido en 74/74).
- Preparado: corpus v2 (5 PDF sintéticos con marca literal), medición automática del recorrido, flujo confirmado en QA.
- Pendiente de confirmación: carga, autorización sintética acotada (solo esa empresa, solo corpus sintético), análisis y plan.

## 2. Corpus sintético v2 (`src/lib/production/fixtures/expediente-qhapaq-v2`, generador `generar_v2.py`)
Anexos A–L: líneas base y metas con plazo y responsable, presupuesto, dotación, conocimiento crítico, participación,
indicadores históricos, articulación entre áreas, trabajo repetido, definición de iniciativa, calidad de datos,
traspasos entre sistemas, evaluación tecnológica, deterioro de clientes y uso de solución de terceros.
Vacíos deliberados: tiempos de sincronización entre sistemas, presupuesto de ciberseguridad, resultados del piloto.
Contradicciones deliberadas: retrasos 40 % vs 25 %; merma 7 % vs 4 %; trabajadores 68 vs 74.

| Medición (448 adquisiciones, sin confirmación) | v1 | v2 |
|---|---|---|
| Fragmentos | 280 | 390 |
| Adquisiciones con cita candidata | 249 (55,6 %) | 286 (63,8 %) |
| SUFICIENTE | 0 | 0 |
| PARCIAL | 249 | 285 |
| AUSENTE | 199 | 162 |
| CONTRADICTORIA | 0 | 1 |

SUFICIENTE = 0 es correcto: solo una persona puede declararlo. Detalle por capacidad: `docs/evidence/mvp31-block5/sufficiency-v2-by-capability.csv`.
Más débiles: DT-03 (16/17 ausentes), DT-02 (12/17), OP-05 (34/64), OP-04 (27/60), DT-06 (10/23).

## 3. Fallos detectados
1. **Corregido:** una confirmación sin cita documental producía SUFICIENTE. Ahora queda AUSENTE (prueba añadida).
2. **Corregido (instrumento):** con una sola propuesta por adquisición era imposible comparar documentos.
   `evidenciaPorDocumento()` calcula el mejor fragmento por documento solo para detectar contradicciones.
3. **Abierto:** detección de contradicciones 0/3 deliberadas y 1 falsa (DG-04 ACQ·NI05, cifras de temas distintos).
   La comparación por cifras literales no distingue tema ni magnitud. Corregirlo requiere un criterio aprobado; no se inventó umbral.
   La pantalla del expediente no usa aún este instrumento para no mostrar contradicciones falsas.
4. **Observado:** el tablero 6D/31C tarda ~10 s en cargar con Qhapaq (31 capacidades en ~2 s en servidor más carga de cliente).

## 4. Escenario A (Textiles Qhapaq, QA)
- Análisis asistido DEC-053 en 27/29 capacidades sin motor: 138 elementos (82 hechos con cita, 20 inferencias,
  2 incertidumbres, 34 vacíos), 1 descartado por el validador. PC-04 y DT-03 sin análisis: no tienen respuestas de entrada.
- Plan de Transformación: muestra todas las propuestas con autoridad «Análisis asistido · provisional»; 2 decisiones empresariales conservadas.
- **Hallazgos institucionales: 0 visibles.** OP-01/OP-02 tienen 6 hallazgos en NEEDS_REVIEW y 13 SUPERSEDED; ninguno CONFIRMED.
  Requieren revisión empresarial en la pantalla de la capacidad; no se confirmaron automáticamente.

## 5. Seguridad y pruebas
- Aislamiento bilateral con datos (Qhapaq 99 respuestas/5 evidencias/27 análisis ↔ INT-01 32 respuestas/60 evidencias/22 mapeos;
  Digiway y josefo como objetivos): 17 tablas × lectura propia + filtro cruzado, inserción, modificación y borrado cruzados:
  **74 PASS / 0 FAIL** (`docs/evidence/mvp31-block5/isolation-bilateral.json`). Digiway Corp intacta (60 respuestas, 3 evidencias).
- Regresión: 78 archivos, **1362/1362 PASS** (antes de añadir la prueba de confirmación sin cita; focales 9/9 PASS después).
- No probado: rechazo MEMBER en revisión DEC-053/decisiones en vivo (Qhapaq no tiene MEMBER); cubierto por política RLS OWNER/ADMIN.

## 6. Sin cambios
Master v1.0, 31 packs, Engine 0.2.0, RLS, bootstrap, membresías, Digiway Corp, REC-01, SEM-QA-01, B03. Nada publicado.
