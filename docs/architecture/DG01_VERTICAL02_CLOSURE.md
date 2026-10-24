# DEC-049 · DG01-VERTICAL-02 · Cierre

Ruta: `/piloto-dg01` (panel **03 · Interpretación semántica experimental**).

## Componentes
- Nuevo `src/lib/piloto-dg01/interprete-semantico.ts` — contrato `InterpretacionExperimental` + intérprete.
- Nuevo `src/lib/piloto-dg01/interprete-semantico.test.ts` — 12 pruebas.
- Modificados: `escenarios.ts` (S6, S7), `evaluador-piloto.ts` (campo separado `interpretacionExperimental`), `piloto-dg01.test.ts`, `src/routes/piloto-dg01.tsx`.

## Mecanismo real
Análisis léxico determinista, **sin IA**. La IA documental del proyecto está detenida (SEM-QA-01) y no se reabrió. Criterios `CRIT-PILOTO-01..05` creados para esta prueba, sin aprobación metodológica. Sin scoring, severidades ni umbrales. Las frases se segmentan con desplazamientos verificables (`texto.slice(inicio, fin) === fragmento`).

## Resultados
| Esc. | Engine | Interpretación experimental |
|---|---|---|
| S1 adverso | NEEDS_REVIEW | EVIDENCIA_COMPATIBLE |
| S2 positivo | NEEDS_REVIEW | EVIDENCIA_CONTRARIA |
| S3 UNKNOWN | AWAITING_INFORMATION | ABSTENCION_SIN_CONTENIDO |
| S4 CONTRADICTORY | BLOCKED_BY_CONTRADICTION | CONFLICTO_PRESERVADO (ambas fuentes) |
| S5 NOT_APPLICABLE | EXCLUDED_NOT_APPLICABLE | EXCLUSION_TECNICA_CONSERVADA |
| S6 ambiguo | NEEDS_REVIEW | INFORMACION_INSUFICIENTE |
| S7 mixto | NEEDS_REVIEW | EVIDENCIA_MIXTA (claros + insuficientes) |

Hallazgos confirmados: 0 en los siete casos. La salida del Engine es idéntica antes y después de interpretar, y coincide con una evaluación directa.

## Pruebas
`bunx vitest run src/lib/piloto-dg01` → 23/23 PASS. El navegador muestra los siete resultados sin errores. No hay cambios en `knowledge/`, `packages/`, `src/lib/production/` ni `supabase/`.

## Limitaciones
- Los indicios léxicos son frágiles: dependen del idioma, se pueden eludir con paráfrasis y la negación es simple. No son comprensión semántica.
- «Contradice» no demuestra un estado positivo suficiente (guardrail de la fuente, líneas 530–531).
- R-DG01-01 es una propuesta de la fuente y no está publicada en dg-01@1.0.0. HF-DG01-01 («Dirección empresarial insuficientemente explícita») está más cerca de R-DG01-03; su vínculo con BUSINESS_LOGIC_UNCLEAR es solo candidato.
- La evidencia mínima de VA01 no se explicita; E0 no está aprobado.
- Para pasar a uso real hace falta que Gobierno apruebe los criterios o autorice un mecanismo de IA.
