# Roadmap

## M2-OP02-02 · Generic Runtime Compatibility Closure
- [x] Cerrado (ver docs/architecture/M2_OP02_RUNTIME_COMPATIBILITY_CLOSURE.md)

## M2-OP02-03 · Pre-Publication Integrity Closure
- [x] IP05 Done Criteria: corrección literal source→canonical (raw 6983–6987) + historial TC-OP02-01
- [x] Proyección IP05 en source.json + sello + manifest/reports
- [x] Validador genérico de correcciones de transcripción
- [x] Tests IP05 → actividades → deliverable → Done → implementación → CRV
- [x] Engine: findingsAwaitingResolution con evidencia + requisito de adquisición/aclaración
- [x] Persistencia (tabla finding_resolution_states + RLS + inmutabilidad + repositorios + caso de uso)
- [x] Tests persistencia/recarga, resolución posterior, reproducibilidad histórica
- [x] Regresión completa (673/673, typecheck, validate, seal, pipeline, OP-01 bytes, linter, security)
- [x] docs/architecture/M2_OP02_PREPUBLICATION_INTEGRITY_CLOSURE.md

## Blocked / next
- [ ] Revisión humana de gobierno de OP-02 (governance-review.json) — espera al usuario
- [ ] Decisión: versionar el engine antes de publicar — espera al usuario
- [ ] Publicar OP-02 → OP-03 — tras la revisión
