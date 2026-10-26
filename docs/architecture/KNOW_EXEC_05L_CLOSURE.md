# KNOW-EXEC-05-L · Informe de cierre (para revisión de Gate 02)

Autorización: KNOW-EXEC-05-L-AUT · Insumo: `PYMAPA_KNOW-EXEC-04-L_Matriz_Consolidada_DG_PC.xlsx` (sha256 `201d9c10d97cddf9f6316af7ff56022650511fb6b55577163d9745a537f214ad`).
Estado: **CANDIDATOS DOCUMENTALES NO EJECUTABLES EN STAGING · SIN PUBLICACIÓN · SIN HALLAZGOS**.

## 1. Cambios
- Reutilizado sin reconstruir `translateCapability` (KNOW-EXEC-03). Único ajuste: el mensaje de `MISSING_SOURCE` distingue "objeto sin cuerpo" de "objeto inexistente" (no altera los candidatos OP-03/04/05; `--check` del lote 1 PASS).
- `scripts/knowledge-staging.ts`: soporta varios lotes (lote 1 OP, lote 2 DG/PC).
- Creados: `scripts/know-exec-04l-convert.py` (xlsx → entrada), `knowledge/staging/_inputs/KNOW-EXEC-04-L.lote2.json`, `knowledge/staging/{DG-01..05,PC-01..05}/candidate.json`, `packages/knowledge-pipeline/src/diagnostic-translation-lote2.test.ts`, este informe.
- Conversión: L2 (153 objetos: 121 reglas + 32 G/STOP) → filas; L1 aporta título, restricciones y preparación; L3 → referencias HF; L5 → excepciones particulares; patrones MAP-VA-CE, MAP-HF, ACQ-RQ y DS-04. Los marcadores "NO VINCULADO INDIVIDUALMENTE" se normalizan a "no identificada" para que nunca se lean como referencia. L3b (83 familias HF) se conserva en la entrada como evidencia documental, sin vínculo.

## 2. Resultados por capacidad
| Cap. | Reglas diagnósticas | Guardrails | Ref. HF | VA/CE | Excepciones | Ejecutables |
|---|---|---|---|---|---|---|
| DG-01 | 9 | 6 (+STOP-DG01-01 sin cuerpo) | 0 | 0 | 14 | 0 |
| DG-02 | 10 | 8 | 0 | 0 | 13 | 0 |
| DG-03 | 10 | 2 | 0 | 0 | 13 | 0 |
| DG-04 | 11 | 8 | 0 | 0 | 14 | 0 |
| DG-05 | 13 | 1 | 0 | 0 | 16 | 0 |
| PC-01 | 12 | 0 | 0 | 0 | 15 | 0 |
| PC-02 | 13 | 6 | 0 | 0 | 16 | 0 |
| PC-03 | 14 | 0 | 0 | 0 | 17 | 0 |
| PC-04 | 14 | 0 | 0 | 0 | 17 | 0 |
| PC-05 | 15 | 0 | 0 | 0 | 18 | 0 |
| **Total** | **121** | **31 (+1 bloqueado)** | **0** | **0** | **153** | **0** |

Categorías: recuperadas 152 (121 R + 31 G) · candidatas no ejecutables 152 · bloqueadas 1 (STOP-DG01-01, sin cuerpo en baseline) · descartadas 0 · aprobadas 0. Divergencias de texto: 0.

## 3. Matriz de excepciones
| Patrón | Alcance | Tipo | Autoridad |
|---|---|---|---|
| MAP-VA-CE | 10 cap. / 121 reglas | Relación R–VA/CE no explícita; no completar por proximidad | Conocimiento |
| MAP-HF | 10 cap. / 121 reglas | Sin referencia HF literal; no inventar binding | Conocimiento |
| ACQ-RQ | 10 cap. | Pregunta–variable en pack; regla–pregunta no aprobada | Conocimiento |
| DS-04 | DG-01 | R-DG01-01 → HF-DG01-01 NO aprobado | Fase 2 / Conocimiento |
| MISSING_SOURCE | DG-01 | STOP-DG01-01 sin cuerpo; no se reconstruye | Conocimiento |
| PARTICULAR | 121 reglas | Preparación + decisión requerida + L5 por regla | Conocimiento |

## 4. Pruebas
- Lote 2: 9/9 PASS (conteos 121, no ejecución/binding/emisión/predicado, cero HF/VA/CE inferidos, DS-04, texto literal, STOP sin cuerpo, determinismo vs staging, independencia, aislamiento del registro).
- Lote 1 (regresión KNOW-EXEC-03): 11/11 PASS; staging OP sin cambios.
- `knowledge:validate`, `knowledge:factory:check`, `knowledge:seal:check`: PASS.
- Suite completa: único fallo preexistente `arquitectura.test.ts` (imports del piloto DG-01, ya reportado en KNOW-EXEC-03).

## 5. Integridad
Sin cambios en `knowledge/packs`, `knowledge/master`, `knowledge/manifest.json`, `packages/knowledge-engine`, `src/` (diagnóstico productivo) ni RLS (verificado con estado del repositorio). `packs-registry.ts` no referencia staging.

## 6. Riesgos y pendientes
- Ningún vínculo R–VA/CE/HF es literal en la matriz: las 121 reglas requieren revisión individual de Conocimiento antes de cualquier especificación ejecutable.
- STOP-DG01-01 requiere recuperar su cuerpo histórico.
- DS-04 sigue bloqueando HF-DG01-01; KNOW-EXEC-05-D (Fase 2) independiente y pendiente.
- Publicación futura requiere: decisiones semánticas, autorización independiente, nueva versión de pack con checksum/procedencia, y reversión al pack v1.0.0 vigente.
- Siguiente lote sugerido: DT-01..06 / EC-02..05 / CM-01..06 con matriz de Fase 2 equivalente.

## 7. Confirmación
No se publicó, activó ni integró ningún candidato; no se generaron hallazgos, recomendaciones, scoring ni se usó IA.
