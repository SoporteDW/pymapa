# DIAGNOSTIC-INTEGRITY-FIX-01

Estado: DIAGNOSTIC_INTEGRITY_FIX_01_CODE_COMPLETE_PENDING_HUMAN_ACCEPTANCE

## Archivos modificados
- `src/lib/production/caso-uso.ts` — `esAdquisicionDeCapacidad`, `observacionesParaEngine` (filtro en lectura antes del Engine).
- `src/components/capacidad/evidencia-panel.tsx` — documentos cargados en la capacidad se muestran como de esa capacidad; asociar a una respuesta es opcional.
- `src/lib/production/diagnostic-integrity-fix01.test.ts` — matriz B1–B8.
- `AGENTS.md` — regla de alcance.

## Defecto corregido
Respuestas a preguntas progresivas distintas se guardaban sobre `variableRefs[0]` (VA01) y el Engine 0.2.0 las comparaba como el mismo dato → contradicción artificial (CM-05). Ahora esas respuestas tienen alcance de capacidad: se conservan íntegras (Response + Observation, procedencia, historial, conteo de respondidas) y solo llegan al Engine si hay conflicto legítimo (CONTRADICTORY explícita o valores distintos en la misma pregunta).

## Limitación declarada (contrato)
El contrato actual no tiene correspondencia gobernada pregunta→VA para estas adquisiciones. Por tanto sus respuestas NO declaran conocida ninguna VA (siguen UNKNOWN). Es la representación sin pérdida semántica posible hoy; usarlas para variables requiere decisión de gobierno (futuro Documento→Fragmento→NI→Capacidad).

## Histórico
Sin migraciones ni borrados: las filas antiguas en VA01 se reinterpretan al leer.

## Pruebas reales
- B1–B8: 39/39 (incluye las 31 capacidades).
- Suite production+packages: 639 ejecutadas, sin fallos tras corregir el nuevo test.
- Navegador, solo lectura sobre Digiway Corp: CM-05, OP-02, DG-03 sin «aclaración» ni textos técnicos.
- NO ejecutado: recorrido con escrituras en navegador sobre la org QA (requiere sesión QA aprobada).

## Congelados
Knowledge Master, packs publicados y Engine 0.2.0 sin cambios.

## CM05-HISTORICAL-JOURNEY-FIX
Estado: CM05_HISTORICAL_JOURNEY_FIX_CODE_COMPLETE_PENDING_HUMAN_ACCEPTANCE
- `__CAPABILITY_SCOPE__` NO se usa: `validateObservation` del Engine 0.2.0 lo rechaza (no es variable del pack). Bloqueo reportado.
- Mecanismo compatible: `evaluarAssessment()` (único camino de evaluación) amplía `answeredAcquisitionRefs` —campo público del EvaluationResult— con las adquisiciones con respuesta vigente. No toca variables, NI ni findings.
- UI: progresivas con varias VA ya no muestran «Variable vinculada».
- Pruebas: `cm05-historical-journey.test.ts` (historial con correcciones encadenadas + 31 capacidades). Suite: 934/934, 0 fallos, 0 omitidas.
- Navegador QA (lectura tras historial previo): siguiente = ACQ·P1·02, sin aclaración ni VA expuestas. Recorrido de 10 pasos con escrituras en navegador: NOT_TESTED.
- Riesgo: si dos preguntas progresivas distintas tienen cada una valores sin corregir en conflicto, el Engine las agrupa bajo VA01 en una misma aclaración.
- Dependencia PR-DOC-01/PKG-03: respuestas progresivas sin correspondencia gobernada no satisfacen NI.
