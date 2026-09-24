# M2-BATCH-02 · OP Domain Closure + DG/PC Mass Industrialization

Engine 0.2.0. Sin branching por capacidad. OP-01/OP-02 publicados e intactos
(OP-02 pack `sha256:7f8072…c6cc`). DT/CM/EC no iniciados.

## A. OP-03 / OP-04 / OP-05

| Capacidad | Ambigüedades 01 → 01R → 02 | Conteos aprobados | Aceptación canónica | Estado |
|---|---|---|---|---|
| OP-03 | 25 → 12 → 0 | 4 CE · 8 VA · 8 CRV | ACCEPTED (2026-09-24) | CANONICAL_REVIEW_REQUIRED |
| OP-04 | 33 → 21 → 0 | 3 CE · 9 VA · 8 CRV (+CRV-OP04-09 guardrail) | ACCEPTED | CANONICAL_REVIEW_REQUIRED |
| OP-05 | 14 → 4 → 0 | 4 CE · 10 VA · 11 reglas · 8/8/8/8/8 | ACCEPTED | CANONICAL_REVIEW_REQUIRED |

Las colisiones restantes se cerraron por decisiones gobernadas literales
(`SELECT_OCCURRENCE`, `GENUINE_COLLISION`, `NOT_A_KNOWLEDGE_OBJECT`), tipado
semántico (CRV principal/guardrail, alias) y vocabularios de provenance nativos.
Baselines canónicas materializadas (182 / 188 / 117 objetos).

Cross-capability: A-OP02-02 → RESOLVED (evento con checksum de aceptación de
OP-03); BOUND-OP05-02 → ACCEPTED · CONDITION_MET. Pack OP-02 no modificado.

**No publicadas.** Bloqueos reales para la publicación condicional:
1. `EXECUTABLE_PROJECTION_MISSING`: no existe `source.json` proyectado
   literalmente desde la baseline, por lo que no hay canonical→pack, fixtures
   ni runtime acceptance.
2. Identidad no verificada en el candidato sellado (extraído sin nombre
   declarado): `identity.verified = false`. El candidato aceptado no se
   regenera; requiere re-extracción con nombre y nueva aceptación humana.

## B. DG-01..05 y PC-01..05

Registro multi-capacidad genérico (`register-multi`): un DOCX original
inmutable por dominio, segmentos deterministas. Regla de frontera corregida en
este lote: el tramo k+1 empieza en el primer heading `<ID> · …` posterior al
cierre K4 literal de k (el resumen posterior al cierre queda en k).

| Cap. | Tramo | Candidatos | Revisión pendiente |
|---|---|---|---|
| DG-01 | 1–855 | 55 | provenance |
| DG-02 | 856–1487 | 60 | provenance |
| DG-03 | 1488–2080 | 55 | provenance · CAND-MOTOR-AI-GOV-01 (L309 vs L489) |
| DG-04 | 2081–2755 | 62 | provenance |
| DG-05 | 2756–3412 | 68 | provenance |
| PC-01 | 1–684 | 58 | provenance · SOURCE-REVIEW-TRIGGER-PC01-01 (L163 vs L607) |
| PC-02 | 685–1415 | 76 | provenance · CRV declara 8, extraídos 1 (CRV en líneas planas/listas) |
| PC-03 | 1416–2228 | 77 | provenance |
| PC-04 | 2229–3054 | 77 | provenance |
| PC-05 | 3055–3911 | 84 | provenance |

Todas `CANONICAL_REVIEW_REQUIRED / REVIEW_REQUIRED`, 0 FAIL. Falta en las diez:
decisiones de gobierno (vocabulario de provenance nativo — la fuente lo
declara: DG L730+, PC L585+ — y conteos aprobados), aceptación canónica y
proyección ejecutable. Captura de líneas planas (`--line-ids`) es opt-in y
puede incluir referencias de tablas resumen; requiere revisión humana.

## Verificación

760/760 tests · typecheck · `knowledge:seal:check` · Factory sin FAIL ·
slots sin fuente 16/31.

## Resultado

Mecanismo industrial probado en 13 capacidades sin FAIL ni branching, pero
ninguna nueva capacidad alcanza publicación: falta la etapa genérica
baseline→`source.json` (proyección ejecutable) y la revisión humana de
provenance/colisiones DG/PC.

FACTORY_NOT_READY_FOR_FINAL_MASS_BATCH
