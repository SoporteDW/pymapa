# DEC-049 · DG01-VERTICAL-01 · Cierre del piloto aislado

Fecha: 2026-10-24. Resultado: **PASS técnico / BLOQUEADA POR SEMÁNTICA la discriminación diagnóstica**.

## Acceso

Ruta: `/piloto-dg01`.

Vista previa: https://id-preview--f76abe8b-a90c-4799-a042-89ac9f7073bb.lovable.app/piloto-dg01

No se publicó ni desplegó esta entrega al dominio productivo.

## Archivos creados

- `src/lib/piloto-dg01/candidato-pack.ts`
- `src/lib/piloto-dg01/evaluador-piloto.ts`
- `src/lib/piloto-dg01/escenarios.ts`
- `src/lib/piloto-dg01/piloto-dg01.test.ts`
- `src/lib/piloto-dg01/piloto.server.ts`
- `src/lib/piloto-dg01/piloto.functions.ts`
- `src/routes/piloto-dg01.tsx`
- Este informe.

Se actualizaron únicamente las reglas de arquitectura y el roadmap para registrar el aislamiento y el cierre. No se modificaron contratos existentes.

## Evidencia del Engine real

`evaluador-piloto.ts` importa `createKnowledgeEngine` de `@pymapa/knowledge-engine`; crea una instancia sobre un clon candidato y llama a `validateObservation` para cada observación, seguido de `engine.evaluate`.

La interfaz invoca la función de servidor `ejecutarPiloto`, cuyo handler importa `piloto.server.ts`. El Engine permanece fuera del circuito de evaluación del navegador. El servidor no importa clientes de base de datos, servicios documentales ni proveedores IA.

Versión leída de la instancia y comprobada en cada escenario: `pymapa-knowledge-engine/0.2.0`.

El candidato tiene identidad separada `piloto-dg01@0.1.0`, estado `draft`. Parte de un clon del pack DG-01; no muta ni publica el original. R-DG01-01 transcribe `knowledge/intake/DG-01/text/DG-01.txt:487–488`, permanece `GOVERNED_JUDGMENT` e `implemented:false`. `PILOT-DG01-F01` es exclusivamente una identidad de demostración; no se presenta como ID canónico de hallazgo aprobado. La etiqueta histórica es `BUSINESS_LOGIC_UNCLEAR`.

VA01 conserva `minimumEvidence: NOT_EXPLICIT_IN_KNOWLEDGE_MASTER`, `minimumEvidenceResolution: NOT_EXPLICIT` y `semanticStates: null`. No se introdujo evidencia mínima E0 ni vocabulario semántico aprobado ficticio. Las declaraciones libres sintéticas se transportan como valores capturados, no como clasificación semántica.

## Pruebas ejecutadas

Comando: `bunx vitest run src/lib/piloto-dg01/piloto-dg01.test.ts`.

Resultado: **1 archivo, 9 pruebas, 9 PASS**.

| Escenario | VA01 | Resultado íntegro relevante del Engine | Confirmados |
|---|---|---|---|
| S1 · Relato adverso | KNOWN | PILOT-DG01-F01 · NEEDS_REVIEW | 0 |
| S2 · Relato positivo | KNOWN | PILOT-DG01-F01 · NEEDS_REVIEW | 0 |
| S3 · Información desconocida | UNKNOWN | AWAITING_INFORMATION / INFORMATION_REQUIRED | 0 |
| S4 · Información contradictoria | CONTRADICTORY | BLOCKED_BY_CONTRADICTION / CLARIFICATION_REQUIRED | 0 |
| S5 · No aplicabilidad justificada | NOT_APPLICABLE | EXCLUDED_NOT_APPLICABLE / NONE_EXCLUDED_BY_APPLICABILITY | 0 |

Las pruebas comprueban versión real, estados, linaje de observaciones, regla pendiente, ausencia de confirmación, igualdad de candidatos S1/S2, silencio de evidencia mínima y requisitos de captura para contradicción/no aplicabilidad.

En S4 se conservan dos observaciones de fuente y la observación explícita de conflicto con sus referencias nativas. La declaración de conflicto proviene de la entrada sintética; no de un evaluador semántico inventado.

Verificación de navegador realizada en `http://localhost:8080/piloto-dg01`: captura S1 → evaluación → candidato visible; captura S2 → evaluación → mismo candidato visible; ejecución de los cinco escenarios → tabla con cinco resultados esperados. Cero errores JavaScript de página. Vista de 659×716 sin desbordamiento global; escritorio de 1280×1800 inspeccionado. Las capturas confirmaron separación visual entre resultado técnico, interpretación pendiente y cero hallazgos confirmados.

La interfaz ofrece la salida íntegra del Engine y observaciones en un panel desplegable; no filtra candidatos.

Último registro automático observado: `build OK`.

## Integridad protegida

Comparación SHA-256 antes/después: **208 archivos examinados, 0 cambios**, incluyendo todos los archivos bajo `knowledge/master/`, `knowledge/packs/`, `packages/knowledge-engine/` y el registro estático `src/lib/production/packs-registry.ts`.

Sin migraciones, escrituras de datos productivos, documentos reales ni llamadas IA. El piloto no persiste sus observaciones: son objetos sintéticos de cada ejecución. No alteró políticas RLS ni contratos de producción. DEC-046 y SEM-QA-01 no se reabrieron; REC-01 continúa bloqueada.

## Limitaciones pendientes

- S1 y S2 generan **exactamente el mismo candidato técnico** porque KNOWN aporta soporte informacional; no prueba la condición adversa ni la descarta. No se superó una prueba de inteligencia diagnóstica.
- El predicado de BUSINESS_LOGIC_UNCLEAR, su suficiencia y evidencia mínima siguen pendientes de formalización gobernada. No hay filtros ni evaluador semántico adicional.
- No se habilitó confirmación humana productiva desde el piloto; el conteo cero representa ausencia de decisión, separado de la salida nativa del Engine.
- La adquisición ACQ·NI01 no tiene pregunta literal aprobada; el campo de captura se identifica como declaración sintética, no como pregunta canónica nueva.
- Para contradicción, las rutas de aclaración permanecen las que declara el pack; el piloto no inventa nuevas adquisiciones.
- La suite ejecutada es la del piloto, no una nueva auditoría ni regresión integral de la aplicación.

**Alcance autorizado terminado. No se inicia ningún paquete adicional.**