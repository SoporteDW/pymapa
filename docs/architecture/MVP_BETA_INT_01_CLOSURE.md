# MVP-BETA-INT-01 · Informe de cierre

Fecha: 2026 · Alcance: paquete único autorizado (frentes A–D). Solo documentos sintéticos, sin IA externa, sin datos reales.
Baseline intacta: Master v1.0, 31 Knowledge Packs v1.0.0 y Engine 0.2.0 sin modificar. Ningún criterio de cobertura promovido.

## 1. Verificación de hipótesis OP-01 (precisión obligatoria)
- VA07 «Dependencia de conocimiento individual» existe en OP-01 v1.0.0; la alimenta la adquisición OP01-P11 (solo VA07, elegible para admisión factual).
- H04 «Dependencia individual crítica» referencia R-OP01-02 y R-OP01-05 (ambas GOVERNED_JUDGMENT, `implemented:false`) y VA07. H06 «Necesidad de preservación/transferencia» referencia R-OP01-05, VA07 y VA08.
- Engine 0.2.0 (`evaluate()`) produce H04 y H06 como candidatos `NEEDS_REVIEW` ante VA07 KNOWN. Ninguna regla se ejecuta de forma automática: la confirmación es juicio humano.
- Resultado: las hipótesis coinciden con el pack. No se forzó ningún hallazgo. Limitación: cualquier VA07 KNOWN genera los candidatos; el motor no valida la semántica del texto.

## 2. Cambios realizados
- Migraciones aditivas `0010` (tabla `synthetic_qa_ingestion_authorizations`, que solo puede leer un miembro; columnas `activities.responsible_label`, `due_date`) y `0011` (eventos de auditoría `FINDING_SUPPORT_WITHDRAWN`, `SYNTHETIC_DOCUMENT_PROCESSED`).
- `ingesta-sintetica.ts`: reglas léxicas versionadas `SYNTHETIC-QA-RULES-1.0.0`. Exigen el marcador `SYNTHETIC_QA_ONLY`, generan propuestas CANDIDATE con cita literal y página, y no hacen ninguna interpretación semántica.
- Servidor: `processSyntheticDocument` se ejecuta solo para OWNER/ADMIN de una organización autorizada; repetirlo no duplica nada. Tras cada admisión o revocación se reevalúa. Un finding sin soporte pasa a SUPERSEDED con auditoría y no se borra. La revisión de hallazgos ahora exige rol OWNER/ADMIN en el servidor.
- UI: `DocumentosGobernadosPanel` (lectura, propuestas, aceptar/rechazar/revocar, cobertura) y `DiagnosticoTrazablePanel`, con tres capas separadas: hallazgos del motor, recomendaciones gobernadas y acciones del equipo, estas con responsable y plazo.

## 3. Prueba integral alojada (organización QA limpia)
Organización sintética `a62e562b…` («QA SINTETICA MVP-BETA-INT-01 · …ficticia»), creada por la identidad QA nueva `61f0d167…`, OWNER. Es la única organización autorizada en este recorrido. Las organizaciones QA anteriores tenían historial en conflicto y no se modificaron.

| Paso | Resultado | Evidencia |
|---|---|---|
| DG-01: carga del PDF sintético desde la UI → lectura → CANDIDATE | 9 pendientes y sin descuento | `r-dg01.json`, `dg01-1-candidate.png` |
| DG-01: aceptación OWNER (VALIDATED, PARTIAL) | Siguen 9 pendientes | `r-dg01.json` |
| DG-01: FULL con criterio APPROVED DG01-NI04-COV-1.0.0, 5 componentes citados | ACQ·NI04 cubierta, 9→8 pendientes | `dg01-2-full.png` |
| OP-01: carga → lectura → CANDIDATE VA07/OP01-P11 | El motor no produce hallazgos | `op01-1-candidate.png` |
| OP-01: aceptación → admisión factual → Engine real | H04 y H06 NEEDS_REVIEW, con reglas, dato y cita | `op01-2-hallazgos.png` |
| Confirmación H04 por OWNER y acción humana (responsable ficticio, plazo 2026-03-31) | Etiquetada «Formulada por el equipo»; 0 recomendaciones gobernadas | `op01-3-accion.png` |
| Revocación de la correspondencia | Control UNKNOWN añadido sin borrar nada; H04/H06 pasan a SUPERSEDED; la acción y el historial se conservan | `op01-4-revocado.png`, `r-op01.json` |

Base de datos tras el recorrido: 2 observaciones OP-01 (admitida e invalidación), 1 DG-01; findings H04/H06 SUPERSEDED. Auditoría: PROCESSED×2, PROPOSED×2, VALIDATED×2, ADMITTED×2, INVALIDATED×1, FINDING_CREATED×2, CONFIRMED×1, SUPPORT_WITHDRAWN×2, INTERVENTION_CREATED×1. Huellas SHA-256 de todas las evidencias en `docs/evidence/mvp-beta-int01/SHA256SUMS.txt`.

## 4. Regresión
Vitest: 1072/1072 pruebas superadas. `tsgo`: sin errores.

## 5. Condiciones abiertas
- MEMBER contra la nueva revisión de hallazgos y contra `processSyntheticDocument` no se probó en entorno alojado (NOT_TESTED). Ambos usan la misma guarda de servidor que SEC-COV03-01 (PASS).
- El aislamiento multiempresa de las tablas nuevas no se repitió en entorno alojado en este paquete: NOT_TESTED. La tabla de autorización no tiene políticas de escritura para clientes.
- Una revocación también retira los hallazgos CONFIRMED (SUPERSEDED, auditado). Decidir si esa es la política deseada.
- La pantalla OP-01 conserva la interfaz antigua de intervenciones junto al panel nuevo, lo que duplica funciones visibles.
- La lectura documental es léxica y sintética. No sirve para documentos reales: faltan privacidad, consentimiento y purga.

## 6. Dictamen
MVP-BETA-INT-01: **PASS WITH CONDITIONS**. El recorrido documento → hallazgo del motor → acción humana → revocación queda demostrado de extremo a extremo con datos sintéticos. El MVP Beta no queda declarado como terminado.
