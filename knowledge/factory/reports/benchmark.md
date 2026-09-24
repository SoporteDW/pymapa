# Knowledge Factory · benchmark de lote

Factory pymapa-knowledge-factory/0.1.0 · engine pymapa-knowledge-engine/0.2.0 · Master PYMAPA-KNOWLEDGE-MASTER 1.0

Registradas 15/31 · slots sin fuente 16 · señal AUTHORITATIVE_SOURCE_REQUIRED

Por resultado: PASS=2 REVIEW_REQUIRED=13 FAIL=0

| Capacidad | Estado | Resultado | Bytes original | Líneas raw | Candidatos | Canónicos | Checks auto PASS | Revisión humana | NOT_EXPLICIT | SCNR | Transcripción | Ext. runtime abiertas/cerradas | Fallos test | Bloqueos publicación |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| DG-01 | CANONICAL_REVIEW_REQUIRED | REVIEW_REQUIRED | 205770 | 855 | 55 | — | 2 | 2 | 0 | 0 | 0 | 0/0 | 0 | 0 |
| DG-02 | CANONICAL_REVIEW_REQUIRED | REVIEW_REQUIRED | 205770 | 632 | 60 | — | 2 | 2 | 0 | 0 | 0 | 0/0 | 0 | 0 |
| DG-03 | CANONICAL_REVIEW_REQUIRED | REVIEW_REQUIRED | 205770 | 593 | 55 | — | 1 | 3 | 0 | 0 | 0 | 0/0 | 0 | 0 |
| DG-04 | CANONICAL_REVIEW_REQUIRED | REVIEW_REQUIRED | 205770 | 675 | 62 | — | 2 | 2 | 0 | 0 | 0 | 0/0 | 0 | 0 |
| DG-05 | CANONICAL_REVIEW_REQUIRED | REVIEW_REQUIRED | 205770 | 657 | 68 | — | 2 | 2 | 0 | 0 | 0 | 0/0 | 0 | 0 |
| OP-01 | PUBLISHED | PASS | — | — | — | — | 11 | 0 | 0 | 0 | 0 | 0/0 | 0 | 0 |
| OP-02 | PUBLISHED | PASS | 283468 | 12503 | — | 329 | 12 | 0 | 6 | 0 | 1 | 0/4 | 0 | 0 |
| OP-03 | CANONICAL_REVIEW_REQUIRED | REVIEW_REQUIRED | 288189 | 6185 | — | 182 | 2 | 1 | 0 | 0 | 0 | 0/0 | 0 | 0 |
| OP-04 | CANONICAL_REVIEW_REQUIRED | REVIEW_REQUIRED | 335872 | 6015 | — | 188 | 2 | 1 | 0 | 0 | 0 | 0/0 | 0 | 0 |
| OP-05 | CANONICAL_REVIEW_REQUIRED | REVIEW_REQUIRED | 92912 | 1786 | — | 117 | 2 | 1 | 0 | 0 | 0 | 0/0 | 0 | 0 |
| PC-01 | CANONICAL_REVIEW_REQUIRED | REVIEW_REQUIRED | 207139 | 684 | 58 | — | 1 | 3 | 0 | 0 | 0 | 0/0 | 0 | 0 |
| PC-02 | CANONICAL_REVIEW_REQUIRED | REVIEW_REQUIRED | 207139 | 731 | 76 | — | 1 | 3 | 0 | 0 | 0 | 0/0 | 0 | 0 |
| PC-03 | CANONICAL_REVIEW_REQUIRED | REVIEW_REQUIRED | 207139 | 813 | 77 | — | 2 | 2 | 0 | 0 | 0 | 0/0 | 0 | 0 |
| PC-04 | CANONICAL_REVIEW_REQUIRED | REVIEW_REQUIRED | 207139 | 826 | 77 | — | 2 | 2 | 0 | 0 | 0 | 0/0 | 0 | 0 |
| PC-05 | CANONICAL_REVIEW_REQUIRED | REVIEW_REQUIRED | 207139 | 857 | 84 | — | 2 | 2 | 0 | 0 | 0 | 0/0 | 0 | 0 |

Coste en tokens/créditos: no expuesto programáticamente por la plataforma; no se estima.

## Motivos accionables

### DG-01 · REVIEW_REQUIRED
- **REVIEW** `SOURCE_TO_CANONICAL/PROVENANCE_VOCABULARY_REQUIRED`: la baseline canónica exige un vocabulario de provenance declarado por la fuente y el candidato no lo contiene (el extractor estructural no lo produce) → en la revisión canónica, transcribir literalmente el vocabulario de provenance de la fuente o registrar explícitamente su ausencia
- **REVIEW** `SOURCE_TO_CANONICAL/CANONICAL_ACCEPTANCE_REQUIRED`: el candidato no tiene aceptación canónica humana → revisar los motivos REVIEW del candidato y registrar intake/<id>/canonical-acceptance.json con candidateChecksum vigente

### DG-02 · REVIEW_REQUIRED
- **REVIEW** `SOURCE_TO_CANONICAL/PROVENANCE_VOCABULARY_REQUIRED`: la baseline canónica exige un vocabulario de provenance declarado por la fuente y el candidato no lo contiene (el extractor estructural no lo produce) → en la revisión canónica, transcribir literalmente el vocabulario de provenance de la fuente o registrar explícitamente su ausencia
- **REVIEW** `SOURCE_TO_CANONICAL/CANONICAL_ACCEPTANCE_REQUIRED`: el candidato no tiene aceptación canónica humana → revisar los motivos REVIEW del candidato y registrar intake/<id>/canonical-acceptance.json con candidateChecksum vigente

### DG-03 · REVIEW_REQUIRED
- **REVIEW** `CANDIDATE_BOUNDARY/SUPERSESSION_AMBIGUOUS` [CAND-MOTOR-AI-GOV-01] (líneas 309–310): CAND-MOTOR-AI-GOV-01: 2 definiciones (L309, L489) sin selección canónica; la posición cronológica no decide. Marcar una como FINAL_APPROVED con evidencia literal y las demás SUPERSEDED/HISTORICAL_DRAFT → corregir el candidato
- **REVIEW** `SOURCE_TO_CANONICAL/PROVENANCE_VOCABULARY_REQUIRED`: la baseline canónica exige un vocabulario de provenance declarado por la fuente y el candidato no lo contiene (el extractor estructural no lo produce) → en la revisión canónica, transcribir literalmente el vocabulario de provenance de la fuente o registrar explícitamente su ausencia
- **REVIEW** `SOURCE_TO_CANONICAL/CANONICAL_ACCEPTANCE_REQUIRED`: el candidato no tiene aceptación canónica humana → revisar los motivos REVIEW del candidato y registrar intake/<id>/canonical-acceptance.json con candidateChecksum vigente

### DG-04 · REVIEW_REQUIRED
- **REVIEW** `SOURCE_TO_CANONICAL/PROVENANCE_VOCABULARY_REQUIRED`: la baseline canónica exige un vocabulario de provenance declarado por la fuente y el candidato no lo contiene (el extractor estructural no lo produce) → en la revisión canónica, transcribir literalmente el vocabulario de provenance de la fuente o registrar explícitamente su ausencia
- **REVIEW** `SOURCE_TO_CANONICAL/CANONICAL_ACCEPTANCE_REQUIRED`: el candidato no tiene aceptación canónica humana → revisar los motivos REVIEW del candidato y registrar intake/<id>/canonical-acceptance.json con candidateChecksum vigente

### DG-05 · REVIEW_REQUIRED
- **REVIEW** `SOURCE_TO_CANONICAL/PROVENANCE_VOCABULARY_REQUIRED`: la baseline canónica exige un vocabulario de provenance declarado por la fuente y el candidato no lo contiene (el extractor estructural no lo produce) → en la revisión canónica, transcribir literalmente el vocabulario de provenance de la fuente o registrar explícitamente su ausencia
- **REVIEW** `SOURCE_TO_CANONICAL/CANONICAL_ACCEPTANCE_REQUIRED`: el candidato no tiene aceptación canónica humana → revisar los motivos REVIEW del candidato y registrar intake/<id>/canonical-acceptance.json con candidateChecksum vigente

### OP-01 · PASS
- sin motivos pendientes

### OP-02 · PASS
- sin motivos pendientes

### OP-03 · REVIEW_REQUIRED
- **REVIEW** `CANONICAL_TO_PACK/EXECUTABLE_PROJECTION_MISSING`: baseline canónica aceptada sin proyección ejecutable (source.json) → proyectar literalmente la baseline a source.json (claves verbatim) y añadir fixtures

### OP-04 · REVIEW_REQUIRED
- **REVIEW** `CANONICAL_TO_PACK/EXECUTABLE_PROJECTION_MISSING`: baseline canónica aceptada sin proyección ejecutable (source.json) → proyectar literalmente la baseline a source.json (claves verbatim) y añadir fixtures

### OP-05 · REVIEW_REQUIRED
- **REVIEW** `CANONICAL_TO_PACK/EXECUTABLE_PROJECTION_MISSING`: baseline canónica aceptada sin proyección ejecutable (source.json) → proyectar literalmente la baseline a source.json (claves verbatim) y añadir fixtures

### PC-01 · REVIEW_REQUIRED
- **REVIEW** `CANDIDATE_BOUNDARY/SUPERSESSION_AMBIGUOUS` [SOURCE-REVIEW-TRIGGER-PC01-01] (líneas 163–166): SOURCE-REVIEW-TRIGGER-PC01-01: 2 definiciones (L163, L607) sin selección canónica; la posición cronológica no decide. Marcar una como FINAL_APPROVED con evidencia literal y las demás SUPERSEDED/HISTORICAL_DRAFT → corregir el candidato
- **REVIEW** `SOURCE_TO_CANONICAL/PROVENANCE_VOCABULARY_REQUIRED`: la baseline canónica exige un vocabulario de provenance declarado por la fuente y el candidato no lo contiene (el extractor estructural no lo produce) → en la revisión canónica, transcribir literalmente el vocabulario de provenance de la fuente o registrar explícitamente su ausencia
- **REVIEW** `SOURCE_TO_CANONICAL/CANONICAL_ACCEPTANCE_REQUIRED`: el candidato no tiene aceptación canónica humana → revisar los motivos REVIEW del candidato y registrar intake/<id>/canonical-acceptance.json con candidateChecksum vigente

### PC-02 · REVIEW_REQUIRED
- **REVIEW** `CANDIDATE_BOUNDARY/CONTROL_COUNT_MISMATCH` (líneas 715–715): CRV: la fuente declara 8 y el candidato materializa 1 SOURCE_ID_CRV FINAL_APPROVED; posible omisión o duplicado de transcripción (líneas 715–715) → contrastar el conteo de control con los ítems materializados
- **REVIEW** `SOURCE_TO_CANONICAL/PROVENANCE_VOCABULARY_REQUIRED`: la baseline canónica exige un vocabulario de provenance declarado por la fuente y el candidato no lo contiene (el extractor estructural no lo produce) → en la revisión canónica, transcribir literalmente el vocabulario de provenance de la fuente o registrar explícitamente su ausencia
- **REVIEW** `SOURCE_TO_CANONICAL/CANONICAL_ACCEPTANCE_REQUIRED`: el candidato no tiene aceptación canónica humana → revisar los motivos REVIEW del candidato y registrar intake/<id>/canonical-acceptance.json con candidateChecksum vigente

### PC-03 · REVIEW_REQUIRED
- **REVIEW** `SOURCE_TO_CANONICAL/PROVENANCE_VOCABULARY_REQUIRED`: la baseline canónica exige un vocabulario de provenance declarado por la fuente y el candidato no lo contiene (el extractor estructural no lo produce) → en la revisión canónica, transcribir literalmente el vocabulario de provenance de la fuente o registrar explícitamente su ausencia
- **REVIEW** `SOURCE_TO_CANONICAL/CANONICAL_ACCEPTANCE_REQUIRED`: el candidato no tiene aceptación canónica humana → revisar los motivos REVIEW del candidato y registrar intake/<id>/canonical-acceptance.json con candidateChecksum vigente

### PC-04 · REVIEW_REQUIRED
- **REVIEW** `SOURCE_TO_CANONICAL/PROVENANCE_VOCABULARY_REQUIRED`: la baseline canónica exige un vocabulario de provenance declarado por la fuente y el candidato no lo contiene (el extractor estructural no lo produce) → en la revisión canónica, transcribir literalmente el vocabulario de provenance de la fuente o registrar explícitamente su ausencia
- **REVIEW** `SOURCE_TO_CANONICAL/CANONICAL_ACCEPTANCE_REQUIRED`: el candidato no tiene aceptación canónica humana → revisar los motivos REVIEW del candidato y registrar intake/<id>/canonical-acceptance.json con candidateChecksum vigente

### PC-05 · REVIEW_REQUIRED
- **REVIEW** `SOURCE_TO_CANONICAL/PROVENANCE_VOCABULARY_REQUIRED`: la baseline canónica exige un vocabulario de provenance declarado por la fuente y el candidato no lo contiene (el extractor estructural no lo produce) → en la revisión canónica, transcribir literalmente el vocabulario de provenance de la fuente o registrar explícitamente su ausencia
- **REVIEW** `SOURCE_TO_CANONICAL/CANONICAL_ACCEPTANCE_REQUIRED`: el candidato no tiene aceptación canónica humana → revisar los motivos REVIEW del candidato y registrar intake/<id>/canonical-acceptance.json con candidateChecksum vigente

