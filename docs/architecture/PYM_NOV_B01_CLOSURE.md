# PYMAPA · PYM-NOV-B01 · Cierre de Build 1

Fecha: 27 octubre 2026. **Dictamen: BLOCKED (BUILD BLOCKED).**

La captura transversal está operativa en preview; no se declara BUILD ACCEPTED mientras la regresión de arquitectura siga fallando. No se publicó el sitio ni se inició B02/B03.

## Resultado y alcance

- 31/31 capacidades cargadas, con respuesta registrada y recuperada tras recarga; posteriormente 31/31 recuperadas desde un nuevo contexto de navegador autenticado. No fue un ingreso manual con contraseña, sino restauración de una sesión QA autorizada.
- 31 registros de evidencia sintética recuperados, conservando organización y capacidad de carga. 30 asociados también a una observación; OP-01 registrado sin vínculo opcional. No se probó subida/descarga de bytes de archivos: se usaron referencias/títulos sintéticos.
- Catálogo: 31 tarjetas; totales por dominio sumados de los contadores reales de adquisición. Son datos de captura, no suficiencia ni madurez.
- Dos capacidades con reglas/hallazgos publicados (OP-01/OP-02), 29 solo captura. No se aprobó conocimiento adicional. Las preguntas literales conservan el texto publicado; solicitudes estructuradas se identifican como no equivalentes a preguntas oficiales.
- Solo organización QA SINTETICA MVP-BETA-INT-01 · Sensores y Calibración Andina (ficticia) recibió registros de prueba. No se escribieron datos de empresas reales ni se usó IA/Gateway.

## Matriz obligatoria

PASS corresponde a una captura real por capacidad, no a agotar todas sus adquisiciones. Persistencia incluye recarga y posterior lectura desde nueva sesión restaurada. Evidencia verifica registro/contexto y lectura, no validación semántica.

| Capacidad | Carga | Captura | Persistencia | Evidencia/contexto |
|---|---|---|---|---|
| DG-01 | PASS | PASS | PASS | PASS |
| DG-02 | PASS | PASS | PASS | PASS |
| DG-03 | PASS | PASS | PASS | PASS |
| DG-04 | PASS | PASS | PASS | PASS |
| DG-05 | PASS | PASS | PASS | PASS |
| PC-01 | PASS | PASS | PASS | PASS |
| PC-02 | PASS | PASS | PASS | PASS |
| PC-03 | PASS | PASS | PASS | PASS |
| PC-04 | PASS | PASS | PASS | PASS |
| PC-05 | PASS | PASS | PASS | PASS |
| OP-01 | PASS | PASS | PASS | PASS |
| OP-02 | PASS | PASS | PASS | PASS |
| OP-03 | PASS | PASS | PASS | PASS |
| OP-04 | PASS | PASS | PASS | PASS |
| OP-05 | PASS | PASS | PASS | PASS |
| DT-01 | PASS | PASS | PASS | PASS |
| DT-02 | PASS | PASS | PASS | PASS |
| DT-03 | PASS | PASS | PASS | PASS |
| DT-04 | PASS | PASS | PASS | PASS |
| DT-05 | PASS | PASS | PASS | PASS |
| DT-06 | PASS | PASS | PASS | PASS |
| CM-01 | PASS | PASS | PASS | PASS |
| CM-02 | PASS | PASS | PASS | PASS |
| CM-03 | PASS | PASS | PASS | PASS |
| CM-04 | PASS | PASS | PASS | PASS |
| CM-05 | PASS | PASS | PASS | PASS |
| CM-06 | PASS | PASS | PASS | PASS |
| EC-02 | PASS | PASS | PASS | PASS |
| EC-03 | PASS | PASS | PASS | PASS |
| EC-04 | PASS | PASS | PASS | PASS |
| EC-05 | PASS | PASS | PASS | PASS |

## Cambios mínimos

- `src/lib/production/actionable.ts`: modo de captura/evaluación derivado del contenido instalado, no lista de excepciones por capacidad.
- `src/lib/production/capability-handlers.ts`: exposición de ese modo y rechazo previo de IDs de evidencia ajenos al assessment/organización.
- `src/components/capacidad/acquisition-renderer.tsx`: distinción literal/solicitud/guía.
- `src/components/capacidad/acquisition-input.tsx`: conserva texto cuando el envío es rechazado; no vacía antes de la aceptación.
- `src/components/diagnostico/catalogo-capacidades.tsx`: conteos por dominio y modo de evaluación.
- `src/routes/_authenticated/capacidad.$id.tsx`: modo y conteo real, controles compartidos; evita mostrar el panel diagnóstico en las 29 de captura. Esto elimina la exposición de acciones OP-01 observada dentro de DG-01, sin modificar aquellas acciones.
- `src/services/production/response-value.ts`, `response-value.test.ts`, `production-client.ts`: corrige envío de cadena vacía para UNKNOWN/NOT_APPLICABLE. El contrato existente rechazaba esos envíos de OP-01 antes de registrar Response; ahora envía null, sin cambiar Engine ni opciones.
- `src/lib/production/nov-b01-capture.test.ts`: cobertura de 31 capacidades, cuatro estados, evidencia, scope y conteos.
- `src/lib/production/sprint04-integracion.test.ts`: negativa de evidencia ajena antes de persistencia.
- `packages/knowledge-pipeline/src/diagnostic-translation.test.ts` y `diagnostic-translation-lote2.test.ts`: correcciones de comprobación de fixtures indefinidos que impedían la compilación previa; no se cambiaron reglas, expectativas, staging ni conocimiento.
- `AGENTS.md`, `roadmap.md`, este informe y `docs/evidence/pym-nov-b01/`: decisiones y evidencias de cierre.

## Pruebas y regresiones

- Suite final: **1263 PASS / 1 FAIL**, 67 archivos (66 PASS, uno FAIL).
- `nov-b01-capture.test.ts`: 36 PASS. Cuatro estados para las otras 29: cero findings persistidos.
- `sprint04-integracion.test.ts`: 12 PASS, incluidos MEMBER sin asignación, alcances y evidencia ajena.
- `response-value.test.ts`: 4 PASS.
- Runtime/integridad focal: 66 PASS (24 runtime, seis versión Engine, 36 captura).
- OP-01/OP-02: regresiones de conocimiento pasan; se corrigió un defecto de transporte de OP-01, no su comportamiento diagnóstico.
- Preview: último registro de compilación `build OK`; nueva sesión de lectura de 31 capacidades sin `pageerror`.

### Fallo previo conservado

`src/lib/production/arquitectura.test.ts` detecta importaciones Engine/schema en:

1. `src/lib/piloto-dg01/candidato-pack.ts`
2. `src/lib/piloto-dg01/evaluador-piloto.ts`
3. `src/lib/piloto-dg01/interprete-semantico.test.ts`
4. `src/lib/piloto-dg01/interprete-semantico.ts`

Ya fallaba antes de cambios B01. No se modificó esta prueba, no se ampliaron autorizaciones y no se introdujeron excepciones artificiales. Es el bloqueo de aceptación integral pendiente de una corrección arquitectónica real con alcance autorizado.

## Integridad y aislamiento

- 233 hashes coinciden exactamente con `docs/evidence/dec-046/protected-before.json`: cero cambios. Comparación persistida en `docs/evidence/pym-nov-b01/integrity.json`. La instantánea temporal inicial de B01 se perdió al renovar el entorno; no se atribuye esta comparación a esa instantánea perdida.
- 31 packs validados contra `published.json`; Master y Engine protegidos, sin publicaciones candidatas.
- No migraciones ni alteraciones de contratos de base de datos, RLS o permisos.
- Cuenta QA B exclusiva: lectura directa autenticada de responses, observations y evidence de QA A devuelve cero filas, sin errores; pantalla QA B sin marcadores B01. No se afirma comprobación bilateral inversa alojada en este Build.
- Correcciones append-only preservadas. KNOWN significa disponibilidad, no suficiencia ni confirmación.
- REC-01 bloqueada; DEC-046 y SEM-QA-01 no reabiertos. Ningún hallazgo asistido ni scoring nuevo.

## Brechas y siguiente decisión

1. Resolver el fallo de arquitectura DG-01 sin alterar el control ni sus excepciones; aceptación B01 permanece BLOCKED.
2. Subida/recuperación de archivos binarios, aislamiento alojado bilateral e ingreso manual tras cerrar sesión no probados en B01: no se convierten en PASS por las pruebas en memoria.
3. Las 29 capacidades siguen sin reglas diagnósticas publicadas. Captura no crea interpretación semántica ni hallazgos asistidos; cualquier B02 requiere nuevo mandato.
4. OP-02 conserva adquisiciones condicionales y límites CRV existentes; este Build no los convierte en preguntas habilitadas ni en capacidad validable.

**Recomendación:** conservar esta base transversal verificada, corregir el bloqueo arquitectónico con un alcance explícito y cerrar las variantes operativas faltantes antes de aceptar integralmente B01. No iniciar B02/B03.