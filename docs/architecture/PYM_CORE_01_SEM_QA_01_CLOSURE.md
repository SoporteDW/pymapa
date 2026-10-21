# PYM-CORE-01 · SEM-QA-01 · Cierre verificable

Gobierno: DEC-047 · Alcance: PYM-02 interpretación semántica documental (DG-01) · Fecha: 2026-10-21 UTC.
Master v1.0, 31 packs v1.0.0 y Engine 0.2.0 sin cambios (sin diff en `knowledge/` ni `packages/knowledge-engine`).

## 1. Cambios implementados
- `src/lib/ia/sem-qa-corpus.ts`: lista cerrada de 5 documentos (id, SHA-256 de archivo, SHA-256 de texto extraído, páginas) y checksum compuesto `6670bfdf…8f59`.
- `src/lib/ia/sem-qa-guard.server.ts`: guarda fail-closed `autorizarSemQa` (ejecución `SEM-QA-01`, documento en corpus, procedencia del corpus vs build y vs BD, OWNER/ADMIN por RLS, autorización sintética existente + autorización SEM-QA-01, evidencia de la propia organización, descarga del archivo almacenado, checksum de archivo, versión de evidencia enlazada, extracción en servidor, marca `SYNTHETIC_QA_ONLY`, checksum de texto). Emite una autorización no falsificable (WeakSet).
- `interpretar-documento.server.ts`: única puerta al Gateway; sin autorización emitida por la guarda devuelve 403 sin transmitir. El texto procede solo del servidor.
- `interpretacion.functions.ts`: `interpretarDocumentoDG01` (texto del cliente) **cerrada**; nueva `interpretarDocumentoSemQa`. `scripts/ia-vertical-slice.ts` deshabilitado.
- Prompt `df-ia-interpretacion-1.1.0` (mismo proveedor y modelo `openai/gpt-6-luna`): campo `tipo` (EXPLICITO/INFERENCIA/NEGACION) y `contradicciones`. Verificador genérico: una contradicción cuyas citas son todas literales bloquea las propuestas de esa NI (`CONTRADICCION_NO_RESUELTA`). Sin reglas específicas del corpus.
- Migración `0012_sem_qa_01_guard.sql`: `semantic_qa_authorizations` (solo lectura para miembros; escritura solo servicio) y `semantic_qa_attempts` (append-only, lectura OWNER/ADMIN; sin contenido documental). Autorizada solo la org QA sintética limpia `a62e562b…`.
- `persistencia-documental.server.ts`: reutiliza la evidencia/versión verificada; prompt_ref con ejecución y checksums.
- `/ia-documental`: selección de documento del corpus y visualización de tipo/contradicciones.

## 2. Seguridad y aislamiento (alojado, antes de cualquier invocación)
| Prueba | Resultado |
|---|---|
| N1 documento fuera del corpus con id de corpus | REJECTED `FILE_CHECKSUM_MISMATCH` |
| N2 documentId desconocido | REJECTED `DOCUMENT_NOT_IN_CORPUS` |
| N3 archivo modificado, mismo nombre y marca | REJECTED `FILE_CHECKSUM_MISMATCH` |
| N4 MEMBER (evidencia del OWNER) | REJECTED `ROLE_NOT_ALLOWED` |
| N4b MEMBER cargando su propio archivo | bloqueado antes (`OUT_OF_ASSIGNMENT_SCOPE`) |
| N5 OWNER de org no autorizada SEM-QA | REJECTED `ORGANIZATION_NOT_SEMQA_AUTHORIZED` |
| N6 referencia cruzada a evidencia de otra org | REJECTED `EVIDENCE_NOT_IN_ORGANIZATION` |
| N7 versión de evidencia con checksum distinto | REJECTED `EVIDENCE_VERSION_CHECKSUM_MISMATCH` |
| N8 ruta general (texto del cliente) | cerrada, `GENERAL_ROUTE_CLOSED` |
| N9 ejecución distinta (`SEM-QA-02`) | REJECTED `EXECUTION_NOT_AUTHORIZED` |
| Unit: autorización falsificada | 403, `completeJson` no llamado |

Registro del Gateway tras la Fase 2: **0 solicitudes**. Los 9 intentos rechazados quedaron auditados sin contenido (`attempts.json`). Evidencias: `docs/evidence/sem-qa-01/neg-owner.jsonl`, `neg-member.jsonl`.

## 3. Corpus sintético (empresa ficticia, `make_corpus.py`, determinista)
| Id | Escenario | SHA-256 archivo | SHA-256 texto |
|---|---|---|---|
| SEMQA01-S1 | Hecho explícito | 67aff2ad…dca4 | 8f371c22…cb2d |
| SEMQA01-S2 | Inferencia | f1295caa…4c4f | fadcf5ca…69cf |
| SEMQA01-S3 | Negación | 1b9f5cd4…049d | 83d12bea…833a |
| SEMQA01-S4 | Contradicción (2 pág.) | 4db40f5d…d2bd | a7173c66…bbe3 |
| SEMQA01-S5 | Ausencia | ed634339…85c3 | a5413d6c…1b28 |
Valores completos en `src/lib/ia/sem-qa-corpus.ts`; resultados esperados fijados antes de ejecutar en `corpus/expected.json`.

## 4. Esperado vs observado
| Id | Esperado | Observado | Dictamen |
|---|---|---|---|
| S1 | NI01 EXPLICITO, 0 contradicciones | NI01 EXPLICITO p.1 | PASS |
| S2 | NI01/NI06 con tipo INFERENCIA | NI01 correcto, pero tipo **EXPLICITO** | FAIL (clasificación) |
| S3 | Sin afirmación para NI04 | NI04 NEGACION, NI06 NEGACION | PASS |
| S4 | Contradicción NI03 p.1–2; 0 verificadas NI03 | Contradicción NI03 [1,2]; 2 propuestas descartadas `CONTRADICCION_NO_RESUELTA` | PASS |
| S5 | 0 verificadas, 0 contradicciones | 0 / 0, 9 NI sin correspondencia | PASS |

## 5. Ejecución efectiva del modelo
Proveedor `lovable-ai-gateway`, `/v1/responses`, `openai/gpt-6-luna`, prompt 1.1.0. Run IDs: S1 `01a15bde-4e25-7294…`, S2 `01a15bde-9124-7309…`, S3 `01a15bde-d502-70f9…`, S4 `01a15bdf-146a-721d…`, S5 `01a15bdf-4c3f-7632…`. Registro del Gateway: HTTP 200, ~1.140–1.200 tokens de entrada, 188–422 de salida, una llamada por documento, sin reintentos.

## 6. Gobierno de resultados
4 correspondencias creadas, todas `CANDIDATE`; 0 observaciones, 0 decisiones de cobertura, 0 hallazgos ni planes. Revisión OWNER/ADMIN sin cambios (`validate_fragment_mapping`).

## 7. Fallos, rechazos y limitaciones
- S2: el modelo encontró la NI correcta con cita literal pero etiquetó la inferencia como explícita. No se cambió el modelo ni el prompt para forzar el resultado. La etiqueta `tipo` no es fiable para distinguir inferencia; la revisión humana sigue siendo obligatoria.
- Muestra de 5 documentos, una ejecución: sin medida de variabilidad.
- La versión de evidencia queda creada si el texto falla después del checksum del archivo (enlace al archivo, sin transmisión).
- Documentos reales siguen prohibidos: faltan consentimiento, PII, retención/purga y política de proveedor.

## 8. Regresión
Suite completa 1079/1079 PASS (incluye 7 pruebas nuevas en `sem-qa-01.test.ts`); typecheck limpio.

## 9. Dictamen
**PASS WITH CONDITIONS.** Guarda fail-closed y aislamiento demostrados de forma alojada y sin transmisiones no autorizadas; interpretación semántica real ejecutada con IA; 4/5 escenarios conformes; S2 falla en la clasificación inferencia/explícito. Condición: decidir si se acepta esa limitación o se autoriza una iteración documentada del prompt.
