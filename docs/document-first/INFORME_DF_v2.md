# Document-First v2 · Informe de construcción (15/10/2026)

## Implementado
- `src/lib/document-first/pdf-texto.ts` — lectura real de bytes PDF (unpdf), validación de tipo/tamaño/páginas, líneas, fragmentos con página, SHA-256.
- `src/lib/document-first/reglas-g1.ts` — reglas explícitas versionadas `g1-reglas-1.0.0` para C01–C04/Q01–Q24 (no es IA). Excluye puntuaciones históricas (Qxx=n).
- `src/lib/document-first/plan-import.ts` — importación de prioridades P1..Pn con campos citados; nunca marca ejecución.
- `src/lib/document-first/sandbox-demo.ts` — sandbox local con historial append-only y reversión.
- `src/routes/demo-documental.tsx` — demo Moda Origen (manual + documentos + diagnóstico legacy + plan). Enlace desde la Home.
- `scripts/df-g2-matriz.ts` — genera la matriz G2 leyendo los packs publicados.

## G1 (MO-DOC-01 v2) — `MO_28_PREGUNTAS_MATRIZ.csv`
20 SUPPORTED_FOR_PROPOSAL · 5 PARTIAL_NEEDS_REVIEW (C01, C04, Q08, Q12, Q13) · 3 NOT_SUPPORTED (Q17, Q22, Q23).
Para Q17/Q22/Q23 haría falta: registro de competencias o evaluación de uso de herramientas (Q17); bitácora de respaldos y prueba de restauración (Q22); capacitación o política de prevención de fraude (Q23).

## G2 — `PROD_CANONICAL_VERTICAL_SLICE.csv`
DG-01 (9 adquisiciones NI→VA declaradas por el pack) y CM-05 (7 adquisiciones progresivas, 23 VA sin correspondencia individual → solo destino ACQUISITION). CE vacíos: los packs no vinculan CE a adquisiciones. Suficiencia NOT_EXPLICIT → pendiente de gobierno.

## Pruebas
- `document-first.test.ts` 9/9 (MO-LIVE-01..08 a nivel de bytes, MO-05, aislamiento).
- Navegador (/demo-documental): original 25 con propuesta/3 sin info; sin secciones 06+08 18/10; otra empresa 3/25; plan editado y persistido tras recarga; plan modificado cambia plazo y elimina actividad 3.
- Suite completa: 951/951.

## Pendiente (producto)
Extracción en servidor hacia `document_extractions`/`evidence_fragments`, UI de admisión, inclusión de adquisiciones admitidas en la selección de preguntas y pruebas con usuarios reales (PR-01..PR-12): NO implementado.
