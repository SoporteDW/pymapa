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

## 10. Corrección focalizada autorizada · instrucciones 1.2.0

Autorización previa: anexo «PYMAPA · SEM-QA-01 · Autorización de corrección semántica focalizada», recibido 2026-10-21; SHA-256 `993cbe61c2d5c2a26994cdd27b0723b3212999b95c93ceb9118323194e68aba4`. Se ejecutó una sola revisión de instrucciones, sin reajustes tras observar fallos. **1.1.0 permanece registrada como desviación técnica histórica pendiente de ratificación**: autorizar 1.2.0 no ratifica retroactivamente 1.1.0.

Cambios exactos:
- `interpretacion-documental.ts`: versión `df-ia-interpretacion-1.2.0`; EXPLICITO admite equivalencia semántica sin deducción adicional; INFERENCIA exige una conclusión no afirmada directamente; NEGACION conserva la polaridad. Cita literal y relación semántica son comprobaciones diferentes. No contiene ejemplos ni reglas de NI, capacidad o documento concretos.
- Representación técnica `AMBIGUO`: conserva el bruto como descartado `CLASIFICACION_AMBIGUA`, no como correspondencia admisible. Tipo ausente/desconocido se descarta `ESTRUCTURA_INVALIDA`; se elimina el antiguo valor implícito EXPLICITO. No se implementa validación semántica automática.
- Registro cerrado extendido a S6–S8; texto informativo de la pantalla deja de mencionar cinco documentos. El servidor conserva todas las guardas originales, sin cambios en sus permisos ni en la ruta general cerrada.
- Único cambio alojado: actualización condicionada de la fila de autorización SEM-QA-01 de la misma organización QA, corpus 1.0.0→1.1.0; sin migración ni nueva organización autorizada. La referencia incluye autorización y huella del anexo.
- No se cambia proveedor, modelo `openai/gpt-6-luna`, endpoint `/v1/responses`, streaming, límites de salida (6000), razonamiento, temporizadores ni reintentos (cero). No se toca Master, packs, Engine, otras capacidades ni demo.

## 11. Corpus y protocolo fijados antes de las llamadas

S1–S5, `make_corpus.py`, `expected.json` y el archivo histórico `SHA256SUMS` permanecen íntegros: todas sus huellas verificadas tras las pruebas. `manifest-original.json` conserva sus identidades y huella compuesta. S6–S8 se generan determinísticamente con `make_holdout.py`, empresa ficticia distinta, marca `SYNTHETIC_QA_ONLY`, y **no se usaron como ejemplos ni para ajustar las instrucciones**.

| Documento | NI canónica verificada antes de ejecutar | Esperado fijado | Justificación |
|---|---|---|---|
| S6 | NI08: Qué necesidades u oportunidades de transformación se derivan de lo anterior | INFERENCIA | Registro manual con anotaciones perdidas y entregas repetidas permite deducir una oportunidad de transformar el registro; esa conclusión no está enunciada. NI02 puede contener hechos explícitos independientes. |
| S7 | NI03: Qué objetivos o resultados empresariales busca | EXPLICITO | «Buscamos vender el doble» y «Queremos que ninguna entrega llegue después» afirman resultados sin usar la palabra objetivo. |
| S8 | NI04: Qué cambios relevantes espera realizar o enfrentar | NEGACION o abstención segura | Niega abrir canales adicionales y cambiar fabricación. No supone exhaustividad de todos los cambios posibles. |

Enunciados y checksum canónico contrastados con `catalogoCanonico`; prueba automática de correspondencia. Se evitó reutilizar el S6 sugerido sobre personalización porque podía confundirse con una equivalencia explícita de creación de valor. `expected-holdout.json` se fijó antes de transmitir.

Corpus extendido `SEM-QA-01-CORPUS-1.1.0`: SHA-256 compuesto `e47c223b5bf762d08e9995456ff19f8aaa7ffa884e6baaf87487a6da89b285aa`. Identidades, páginas, huellas completas de archivo/texto y procedencia en `corpus/manifest-extended.json`.

Protocolo efectivamente ejecutado: tres bloques de S1→S2→S6→S7, cada carga en un contexto nuevo de navegador autenticado OWNER QA, sin conversación previa ni reintentos; bytes del PDF cargados desde la pantalla `/ia-documental`, extracción/verificación del servidor y resultado visible. Después, una corrida de S3/S4/S5/S8. 16 solicitudes efectivas, 16 run IDs distintos, con resultados íntegros de transporte, trazas y resumen legible en `stability-runs.json`. Esto mide consistencia en este piloto, no independencia estadística del proveedor ni reproducibilidad determinista de una IA.

## 12. Resultado por documento y corrida

| Documento | Corrida 1 | Corrida 2 | Corrida 3 | Aceptación |
|---|---|---|---|---|
| S1 / NI01 | EXPLICITO | EXPLICITO | EXPLICITO | **3/3 PASS** |
| S2 / NI01 | EXPLICITO | EXPLICITO | EXPLICITO | **0/3 FAIL** contra INFERENCIA esperada |
| S6 / NI08 | Sin propuesta NI08 | Sin propuesta NI08 | Sin propuesta NI08 | **0/3 FAIL**; solo NI02 EXPLICITO |
| S7 / NI03 | EXPLICITO | 2 EXPLICITO | EXPLICITO | **3/3 PASS**; variación en cantidad de propuestas |
| S3 / NI04 | NEGACION | No requerida | No requerida | PASS |
| S4 / NI03 | Contradicción p.1–2; 2 descartadas | No requerida | No requerida | PASS; 0 verificadas NI03 |
| S5 | 0 propuestas/contradicciones | No requerida | No requerida | PASS |
| S8 / NI04 | 2 NEGACION | No requerida | No requerida | PASS; ninguna afirmación positiva |

S2 sigue justificando la personalización como una descripción directa de creación de valor. La definición autorizada permite equivalencia semántica, por lo que también existe tensión entre la expectativa histórica de S2 y ese criterio. **No se cambió su expectativa ni se reinterpretó como PASS.** S6 evidencia abstención sobre NI08, no una inferencia mal etiquetada: la limitación es también de recuperación de inferencias. No se ampliaron las instrucciones ni se forzó una conclusión para lograr 3/3.

## 13. Seguridad, persistencia y regresión de la corrección

Antes de llamadas semánticas se demostró que build/corpus nuevo con autorización alojada antigua devuelve `CORPUS_PROVENANCE_MISMATCH`. También: S9 desconocido, otra ejecución y ruta general rechazados. Tras actualizar únicamente la autorización: nuevo ID con archivo ajeno→`FILE_CHECKSUM_MISMATCH`; S7 con evidencia cross-org→`EVIDENCE_NOT_IN_ORGANIZATION`; S1 alterado→`FILE_CHECKSUM_MISMATCH`. Evidencias: `security-stale-auth.json`, `security-extended-owner.json`.

La antigua muestra N7 ya se rechaza por checksum de archivo, antes de llegar a versión: no se cuenta como nueva prueba aislada de `EVIDENCE_VERSION_CHECKSUM_MISMATCH`. Su prueba histórica permanece, sin alterar ni recrear la muestra.

MEMBER alojado: S6→`ROLE_NOT_ALLOWED`; lectura de auditoría devuelve 0 filas; intento de modificar autorización devuelve 0 filas, sin efecto. `security-extended-member.json`. No se recrearon todas las variantes históricas de empresa no autorizada, versión o checksum de texto: guardas sin cambios y evidencia histórica conservada; no se afirma un nuevo 10/10 completo.

Lectura posterior autenticada OWNER: `stability-hosted-readback.json` registra 16 intentos `TRANSMITTED_OK` con prompt 1.2.0 y los 16 mappings creados por estas corridas, **todos CANDIDATE**. No se pulsó aceptar/rechazar ni se invocó admisión. Conteos de organización antes/después: observaciones 3→3, respuestas 0→0, decisiones de cobertura 1→1 (filas históricas, no creadas por SEM-QA). No hubo correspondencias aceptadas no canónicas, citas inventadas aceptadas ni transmisiones exitosas fuera del corpus; las 16 propuestas tienen citas verificadas. No se observa error de modelo ni persistencia en las 16 corridas.

Regresión completa ejecutada: **55 archivos, 1086/1086 PASS** (7 pruebas adicionales a 1079). Reejecución focal después de consolidar: **19/19 PASS**. Último estado de compilación automática: `build OK`. No se ejecutó typecheck manual ni se atribuye al turno uno nuevo. Huellas históricas del corpus/evidencias conservadas; no se modificaron archivos de Master, packs ni Engine. La verificación temporal de huellas protegidas se perdió por reemplazo del entorno; no se presenta como nueva comparación integral persistida.

Limitación operativa: un reemplazo del entorno eliminó scripts y capturas temporales entre ejecuciones; no se repitieron llamadas IA. Permanecieron resultados de transporte y se reconstruyó su lectura; la captura `ui-stability-readback.png` muestra la pantalla autenticada vacía tras recarga, no una propuesta visible. La evidencia de las propuestas de cada corrida es el texto UI registrado y su lectura persistida, no esa captura vacía.

## 14. Dictamen actualizado y detención

**Corrección semántica: FAIL respecto al criterio de aceptación 3/3. SEM-QA-01 global: PASS WITH CONDITIONS**, sin cerrar la brecha. Seguridad, aislamiento, citas y persistencia candidata se conservan; S1/S7 pasan y S3/S4/S5/S8 no regresan. S2 y S6 no satisfacen el piloto, con fallos diferentes documentados.

No se habilitan documentos reales, admisión automática ni uso diagnóstico de la clasificación. Pendientes sujetos a decisión/autorización humana: ratificación histórica 1.1.0; revisión del oráculo S2 frente a equivalencia semántica y límite de abstención S6; cualquier intervención ulterior. **La intervención única autorizada termina aquí**, sin nueva versión, llamadas adicionales ni otro paquete.
