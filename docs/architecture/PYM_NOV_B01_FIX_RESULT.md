# PYM-NOV-B01-FIX · Resultado de corrección y verificación

**Referencia:** ARCH-NOV-01 · DEC-051 · Gate 02.  
**Fecha:** 27 octubre 2026.  
**Propuesta de estado:** **BLOCKED por verificaciones alojadas pendientes**, no por regresión arquitectónica.  
**VAR-05:** cerrada técnicamente, PASS. **B01 no se declara ACCEPTED.**

## 1. Archivos modificados y motivo

| Archivo anterior → definitivo | Motivo |
|---|---|
| `src/lib/piloto-dg01/candidato-pack.ts` → `packages/dg01-pilot/src/candidato-pack.server.ts` | Pack experimental en memoria dentro del núcleo exclusivo de servidor. El import relativo del baseline sigue apuntando al mismo JSON; no se modifica el pack publicado. |
| `src/lib/piloto-dg01/evaluador-piloto.ts` → `packages/dg01-pilot/src/evaluador-piloto.server.ts` | Instanciación del Engine fuera de presentación, protegida por sufijo de servidor; actualización de imports. |
| `src/lib/piloto-dg01/interprete-semantico.ts` → `packages/dg01-pilot/src/interprete-semantico.server.ts` | Interpretación experimental exclusiva de servidor; extracción de procedencia estática. Catálogo léxico y decisiones conservados. Acceso al resumen sin aserción no nula. |
| Las dos suites DG-01 → `packages/dg01-pilot/src/{piloto-dg01,interprete-semantico}.test.ts` | Pruebas junto al núcleo que ejecutan; imports actualizados, assertions preservadas, guard explícito al localizar escenarios. |
| `src/lib/piloto-dg01/piloto.server.ts` | Adaptador de servidor existente apunta al núcleo experimental aislado. |
| `src/lib/piloto-dg01/procedencia.ts` (nuevo) | Solo datos estáticos descriptivos; cero imports. Se conserva copy de procedencia, actualizando únicamente la ubicación del intérprete. |
| `src/routes/piloto-dg01.tsx` | Procedencia desde módulo neutral; tipo de respuesta derivado del RPC, no del evaluador. Pantalla y controles preservados. |
| `packages/dg01-pilot/src/frontera.test.ts` (nuevo) | Dos controles adicionales de sufijos, grafo de imports y adaptador único. No sustituyen el control original. |
| `AGENTS.md`, `packages/dg01-pilot/AGENTS.md`, `roadmap.md` | Registro de frontera, alcance y verificaciones pendientes. |
| `docs/evidence/pym-nov-b01-fix/` y este informe | Evidencia de antes/después, regresiones, integridad y resultados visibles. |

No se modifican `arquitectura.test.ts`, AUTORIZADOS, `piloto.functions.ts`, contratos productivos, migraciones, permisos ni RLS.

## 2. Frontera arquitectónica restaurada

```text
Ruta /piloto-dg01
 ├─ escenarios.ts: schema y banco sintético
 ├─ procedencia.ts: datos descriptivos sin imports
 └─ ejecutarPiloto: RPC existente
      └─ handler → import dinámico de piloto.server.ts
           └─ packages/dg01-pilot/src/evaluador-piloto.server.ts
                ├─ candidato-pack.server.ts → baseline clonado
                ├─ Engine 0.2.0
                └─ interprete-semantico.server.ts
```

El paquete se ubica por su dependencia real del Engine y su ejecución experimental separada. **No se trata solo de mover archivos fuera del escaneo:** todos los módulos ejecutables del núcleo tienen `.server.ts`, que el sistema de empaquetado impide importar desde cliente; se elimina la importación de valor desde el intérprete y el tipo directo desde el evaluador; se añade una comprobación de grafo independiente. El adaptador autorizado y el RPC mantienen su frontera original.

El tipo `Awaited<ReturnType<typeof ejecutarPiloto>>` es inferido, se elimina al compilar y no importa runtime de Engine desde presentación. No se añade contrato productivo ni segundo motor. El piloto sigue sin persistencia y sin IA.

## 3. Test de arquitectura

**Comando exigido:** `bunx vitest run src/lib/production/arquitectura.test.ts`.

| Momento | Resultado |
|---|---|
| Antes | 1 FAIL / 6 PASS; los cuatro infractores del mandato reproducidos. |
| Después, ejecución focal | 7/7 PASS. |
| Después, repetición independiente | 7/7 PASS. |
| Nuevas pruebas de frontera | 2/2 PASS. |

El archivo de arquitectura tiene el mismo SHA-256 antes/después. Sin exclusiones, nuevas autorizaciones ni assertions desactivadas. Registro vigente del preview: `build OK` (16:33:44 UTC). La advertencia de API obsoleta `inputValidator` pertenece al RPC existente y no afecta el resultado; no se amplió el alcance para reemplazarla.

## 4. Regresiones DG-01, OP-01 y OP-02

- **Suite completa:** 68 archivos, **1.266/1.266 PASS**, sin FAIL; duración 111,44 s. El resultado final fue recuperado del registro de ejecución tras vencer el tiempo de espera de la llamada envolvente: la suite sí terminó con código 0.
- **DG-01:** 11/11 pruebas técnicas y 12/12 semánticas, más 2/2 de frontera. S1–S7 conservados, observaciones y output técnico no mutados.
- **Preview, localhost:** botón «Ejecutar los siete escenarios», siete filas verificadas; ejecución individual S1 también verificada, paneles técnico y experimental visibles, `pageErrors: []`, sin alertas. Capturas inspeccionadas: `seven-scenarios.png`, `engine-result.png`.

| Escenario | Resultado experimental preservado | Confirmados |
|---|---|---|
| S1 | EVIDENCIA_COMPATIBLE | 0 |
| S2 | EVIDENCIA_CONTRARIA | 0 |
| S3 | ABSTENCION_SIN_CONTENIDO | 0 |
| S4 | CONFLICTO_PRESERVADO | 0 |
| S5 | EXCLUSION_TECNICA_CONSERVADA | 0 |
| S6 | INFORMACION_INSUFICIENTE | 0 |
| S7 | EVIDENCIA_MIXTA | 0 |

S1 y S2 siguen produciendo el mismo candidato técnico NEEDS_REVIEW; distinguir lexicalmente no confirma ni descarta semánticamente el hallazgo.

- **OP-01:** normalización de disponibilidad 4/4 PASS; vertical y demás regresiones incluidas en suite completa PASS. UNKNOWN sin descripción conserva `null`, no `""`.
- **OP-02:** runtime 24/24 PASS; reglas, hallazgos y límites existentes intactos. No se cambia el contrato CRV ni se habilita validación antes bloqueada.
- **Integración de captura/roles/evidencia:** `sprint04-integracion.test.ts`, 12/12 PASS. Es evidencia automatizada de controles de servicio, no de aislamiento alojado bilateral.

## 5. Captura y persistencia de 31 capacidades

`nov-b01-capture.test.ts`: **36/36 PASS**, incluyendo las **31/31** iteraciones de carga, respuesta UNKNOWN, observación, registro/contexto de evidencia y recuperación con un nuevo scope sobre repositorio **en memoria**. Las cuatro disponibilidades sobre las otras 29 capacidades preservan cero hallazgos persistidos.

Capacidades: DG-01…05, PC-01…05, OP-01…05, DT-01…06, CM-01…06, EC-02…05.

**Distinción obligatoria:**

| Nivel de evidencia | Estado |
|---|---|
| Captura/recuperación en integración actual | 31/31 PASS, en memoria. |
| Captura y recuperación alojada documentada en B01 | 31/31 PASS histórico, según `PYM_NOV_B01_CLOSURE.md`; recarga y nuevo contexto restaurado. |
| Nueva lectura alojada en B01-FIX | **NOT_TESTED**: sesión QA no disponible. |
| UNKNOWN OP-01 alojado histórico | PASS documentado previamente; no renovado en esta ejecución. |
| Metadatos de evidencia | PASS en integración y evidencia histórica; no equivale a bytes ni admisión. |

No se atribuye el PASS histórico a una nueva ejecución alojada. En este FIX no se escriben filas, no se crean cuentas ni se alteran membresías.

## 6. Matriz multiempresa

| Prueba obligatoria alojada | QA A → B | QA B → A | Evidencia / límite |
|---|---|---|---|
| Acceso a datos propios | NOT_TESTED actual | NOT_TESTED actual | Acceso propio QA A documentado históricamente; no sesión actual. |
| Lectura cruzada responses | NOT_TESTED | NOT_TESTED actual | B→A histórico: 0 filas, `pym-nov-b01/isolation.json`. |
| Lectura cruzada observations | NOT_TESTED | NOT_TESTED actual | B→A histórico: 0 filas. |
| Lectura cruzada evidence | NOT_TESTED | NOT_TESTED actual | B→A histórico: 0 filas. |
| Escritura cruzada de respuestas/observaciones | NOT_TESTED | NOT_TESTED | No se intentaron mutaciones HTTP sin identidades QA disponibles. |
| Escritura/vinculación cruzada de evidencias | NOT_TESTED | NOT_TESTED | Negativas de servicio PASS en integración; no bilateral alojada. |
| Lectura IDOR con assessment/response/evidence ajenos | NOT_TESTED | NOT_TESTED | No endpoints autenticados ejercitados con las dos identidades. |
| Escritura IDOR con identificadores ajenos | NOT_TESTED | NOT_TESTED | No se presenta como PASS por pruebas en memoria. |
| RLS efectiva mediante lectura/escritura directa | NOT_TESTED | NOT_TESTED | No auditoría remota renovada ni requests con sesiones QA. |

**Capas separadas:**
- **Aplicación/UI:** el piloto real fue ejercitado; presentación de captura no se renovó con usuario QA autenticado.
- **Servidor:** guards de pertenencia y evidencia cubiertos por integración PASS. El runtime de persistencia usa operaciones privilegiadas tras controles de servicio: no demuestra RLS por sí mismo.
- **RLS:** no cambios; el resultado unilateral previo sigue siendo histórico y limitado a lectura. La fuente de migraciones no sustituye pruebas efectivas alojadas.

La restauración de sesión propia mediante `lovable auth-session --json --self` falló: no hay cuenta de la aplicación que corresponda al solicitante. No se seleccionó otra identidad ni se pidió su contraseña. **Se requiere una sesión autenticada de QA A y de QA B, o autorización para las identidades QA exactas; sin ello la batería alojada permanece NOT_TESTED.**

## 7. VAR-01 a VAR-08

Se conservan IDs y definiciones del E03 de B01-R recuperado del mensaje histórico #510; no se inventan variantes.

| ID | Variante original | Estado final y precisión |
|---|---|---|
| VAR-01 | Captura de disponibilidad, cuatro estados, 31 capacidades | PASS integración actual (36/36); PASS alojado histórico. No nueva afirmación alojada. |
| VAR-02 | OP-01 «No lo sé» UNKNOWN | PASS normalización/regresión actual; PASS alojado histórico. |
| VAR-03 | OP-02 no regresión del conocimiento publicado | PASS actual, runtime y SHA-256 intactos. |
| VAR-04 | Persistencia tras recarga/cambio de sesión en preview | PASS histórico conservado; renovación alojada NOT_TESTED. |
| VAR-05 | Separación frontend / Knowledge Engine DG-01 | **PASS; cerrada técnicamente**: control original intacto, nuevas pruebas de frontera y preview sintético. |
| VAR-06 | Subida/recuperación física de bytes | **NOT_TESTED**, pendiente explícita, fuera de esta corrección localizada. |
| VAR-07 | Aislamiento cruzado bilateral alojado QA A ↔ QA B | **NOT_TESTED**; unilateral histórico no se convierte en bilateral. Bloquea la verificación obligatoria de este mandato. |
| VAR-08 | Login por formulario tras logout | **NOT_TESTED**, pendiente explícita, fuera de esta corrección localizada. |

La severidad de VAR-07 en B01-R no se reescribe retrospectivamente; el mandato FIX exige ahora su comprobación para evidencia suficiente de cierre.

## 8. Integridad de baselines y decisiones

- Instantánea de inicio de este FIX: **217 archivos**, cero diferencias, incluyendo Master completo, todos los archivos de los 31 packs, Engine y módulos IA disponibles, además del test de arquitectura.
- Referencia histórica `docs/evidence/dec-046/protected-before.json`: **233 archivos**, cero diferencias.
- Reglas y hallazgos publicados quedan cubiertos por los hashes de packs; Engine 0.2.0 sin cambios.
- Catálogo léxico, candidatos y sus flags conservados. Ninguna aprobación semántica, publicación o emisión.
- DEC-046 y SEM-QA-01 no reabiertos. REC-01 bloqueada. Sin Gateway, IA externa, migraciones, permisos nuevos, scoring o reevaluaciones automáticas.

Evidencia: `docs/evidence/pym-nov-b01-fix/integrity.json`.

## 9. Bloqueos residuales

1. **QA A/B sin sesiones disponibles:** impide renovar recuperación alojada 31/31 y ejecutar lectura/escritura bilateral e IDOR en servidor/RLS.
2. VAR-06 y VAR-08 siguen pendientes fuera del FIX; no se presentan como fallos resueltos.

No quedan fallos de arquitectura ni de regresión automatizada conocidos. La comprobación del piloto corresponde al preview local, no a una nueva publicación ni verificación del dominio publicado.

## 10. Propuesta para Gate 02

**BLOCKED por evidencia alojada obligatoria incompleta.** La corrección localizada y VAR-05 están listas para revisión; completar las verificaciones con sesiones QA A/B identificadas antes de proponer READY FOR ACCEPTANCE integral.

Gate 02 conserva la decisión de aceptación. **No se declara B01 ACCEPTED, no se publica y no se inicia B02/B03.**

### Evidencia reproducible

Carpeta `docs/evidence/pym-nov-b01-fix/`: `architecture-before.log`, `architecture-after.log`, `focal.log` (108 PASS), `suite.log` (1.266 PASS), `browser.json`, `integrity.json` y dos capturas inspeccionadas. No contiene tokens ni credenciales.