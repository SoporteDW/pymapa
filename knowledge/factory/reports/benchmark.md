# Knowledge Factory · benchmark de lote

Factory pymapa-knowledge-factory/0.1.0 · engine pymapa-knowledge-engine/0.2.0 · Master PYMAPA-KNOWLEDGE-MASTER 1.0

Registradas 2/31 · slots sin fuente 29 · señal AUTHORITATIVE_SOURCE_REQUIRED

Por resultado: PASS=1 REVIEW_REQUIRED=1 FAIL=0

| Capacidad | Estado | Resultado | Bytes original | Líneas raw | Candidatos | Canónicos | Checks auto PASS | Revisión humana | NOT_EXPLICIT | SCNR | Transcripción | Ext. runtime abiertas/cerradas | Fallos test | Bloqueos publicación |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| OP-01 | PUBLISHED | PASS | — | — | — | — | 11 | 0 | 0 | 0 | 0 | 0/0 | 0 | 0 |
| OP-02 | VALIDATED | REVIEW_REQUIRED | 283468 | 12503 | — | 329 | 10 | 2 | 6 | 0 | 1 | 0/4 | 0 | 1 |

Coste en tokens/créditos: no expuesto programáticamente por la plataforma; no se estima.

## Motivos accionables

### OP-01 · PASS
- sin motivos pendientes

### OP-02 · REVIEW_REQUIRED
- **REVIEW** `PUBLICATION_GATE/HUMAN_PUBLICATION_AUTHORIZATION_REQUIRED`: falta autorización humana de publicación → la autoridad de gobierno registra governance-review.json (decision, reviewer, reviewedAt) tras revisar el dossier de evidencia
- **REVIEW** `GOVERNANCE_EVIDENCE/GOVERNANCE_EVIDENCE_OUTDATED`: el dossier en disco no corresponde al estado técnico actual → bun run knowledge:factory -- --write

