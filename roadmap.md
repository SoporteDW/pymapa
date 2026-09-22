# Roadmap

## M2-OP02-02 · Generic Runtime Compatibility Closure
- [x] Cerrado (ver docs/architecture/M2_OP02_RUNTIME_COMPATIBILITY_CLOSURE.md)

## M2-OP02-03 · Pre-Publication Integrity Closure
- [x] Cerrado (ver docs/architecture/M2_OP02_PREPUBLICATION_INTEGRITY_CLOSURE.md)

## M2-FACTORY-01 · Knowledge Factory Transition + OP-02 Closure
- [ ] A1 Engine 0.1.0 → 0.2.0 + changelog genérico
- [ ] A2 Runs históricos intactos (0.1.0), nuevos 0.2.0, verificación automática (tests + trigger DB)
- [ ] A3 Evidencia de gobierno OP-02 (sin aprobación humana) → READY_FOR_HUMAN_PUBLICATION_AUTHORIZATION
- [ ] B1 Batch manifest (31 slots, estado independiente por capacidad)
- [ ] B2 Registro de fuente raw DOCX/PDF/TXT (inmutable, SHA-256, texto determinista, outline)
- [ ] B3 Frontera de candidato (clasificaciones, AI = candidato)
- [ ] B4 Validación reutilizable PASS / REVIEW_REQUIRED / FAIL con motivos accionables
- [ ] B5 Registro de extensiones genéricas de runtime
- [ ] B6 Métricas de coste/throughput
- [ ] B7 Dry-run OP-01 + OP-02
- [ ] D Suite completa, typecheck, seguridad
- [ ] E docs/architecture/M2_KNOWLEDGE_FACTORY_TRANSITION.md

## Blocked / next
- [ ] Autorización humana de publicación de OP-02 (governance-review.json) — espera al usuario
- [ ] Batch 01 (OP-03 + OP-04 + OP-05) — espera fuentes históricas y orden explícita
