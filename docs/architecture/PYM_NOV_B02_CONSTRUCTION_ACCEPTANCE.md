# PYM-NOV-B02 · Informe de construcción y aceptación

**Gobierno:** DEC-051 · **Fecha:** 27 de octubre de 2026

**Dictamen propuesto: BLOCKED.** Infraestructura implementada; aceptación positiva alojada pendiente de designaciones explícitas del Gobierno de PYMAPA. No se declara B02 ACCEPTED ni se inicia B03.

## 1. Reutilización

- Organizaciones, membresías, assessments y versiones de conocimiento existentes.
- Respuestas persistidas (`responses`) y evidencias (`evidence`) del assessment; no segunda captura ni duplicación de archivos.
- Registro estático verificado de 31 packs para resolver identidades, sin modificarlos ni ejecutar el Engine desde EPAR.
- Autenticación y portador existentes (`requireSupabaseAuth`, middleware vigente), controles de pertenencia y helper `private.is_organization_member`.
- Componentes Button, Badge, Input, Textarea, Checkbox y las pantallas de capacidades existentes.

EPAR lee el assessment recibido y verifica pertenencia; no crea organizaciones ni assessments en su lectura. El contexto productivo existente de la pantalla permanece independiente.

## 2. Archivos y migraciones

Nuevos:
- `src/lib/production/epar-contract.ts`: validación de entradas y predicado de autoridad.
- `src/lib/production/epar.server.ts`: proyección y controles de servidor.
- `src/lib/production/epar.functions.ts`: lectura, registro, revisión, designación y revocación autenticadas.
- `src/lib/production/epar.test.ts`: 56 pruebas de reglas.
- `src/components/capacidad/epar-panel.tsx`: formulario, abstención, fuentes, revisión y versiones.
- `drizzle/migrations/0014_epar_professional_authority_and_append_only_assessments.sql`.
- `drizzle/migrations/0015_epar_explicit_least_privilege.sql`.

Modificados: `capacidad.$id.tsx`, `capacidad.op-01.tsx`, `AGENTS.md`, `roadmap.md`; tipos de datos regenerados por la herramienta, sin edición manual. Evidencias en `docs/evidence/pym-nov-b02/`.

## 3. Contrato de autoridad profesional

La decisión humana recibida fue **Gobierno de PYMAPA** como único otorgante/revocante. OWNER/ADMIN no es autoridad profesional ni autoridad otorgante.

- `professional_governance_authorities`: identidad de Gobierno con referencia explícita y vigencia. Su provisión exige mandato externo, no existe bootstrap ni autodeclaración en la aplicación.
- `professional_governance_revocations`: revocación institucional append-only.
- `professional_authorities`: designación `AUTHORIZED_PROFESSIONAL_EVALUATOR`, organización, evaluador, lista de capacidades, assessment opcional, vigencia, autoridad de Gobierno, otorgante y aprobación.
- `professional_authority_events`: revocación profesional con autor, nota y fecha.
- RPC de designación comprueba autoridad de Gobierno vigente, pertenencia del evaluador, alcance canónico y vigencia; prohíbe otorgarse autoridad a sí mismo.
- Creación y revisión EPAR exigen designación activa del usuario dentro del alcance; no hay cliente privilegiado en estos flujos. RPC vuelve a comprobarlo y bloquea la fila de autoridad para coordinarse con revocaciones.

**Estado alojado observado:** cero designaciones de Gobierno y cero designaciones profesionales. No se asignó facultad institucional a ninguna cuenta QA.

## 4. Modelo y auditoría

`professional_assessments` registra origen `PROFESSIONAL_ASSESSMENT`, organización, assessment, capacidad, versión de conocimiento, evaluador, autoridad, fuentes/fecha/vigencia, estado, conclusión nullable, justificación, limitaciones, incertidumbre e información pendiente.

Estados profesionales: `SUBSTANTIATED`, `INSUFFICIENT_INFORMATION`, `CONTRADICTORY_INFORMATION`, `NOT_APPLICABLE`, `REVIEW_REQUIRED`. Los tres estados de abstención no admiten conclusión; sustentada exige conclusión y al menos una respuesta o evidencia. Suficiencia es juicio profesional, no se deriva automáticamente de KNOWN ni de conteos.

Cada fila es una versión inmutable con `evaluation_id`, número y `previous_version_id`. Corrección agrega versión; referencia única y bloqueo impiden reemplazos concurrentes silenciosos. Respuestas y evidencias usadas se conservan como identificadores y snapshot de contenido/metadatos. Evidencia debe pertenecer al mismo assessment/organización; respuesta además debe corresponder a la capacidad (legacy sin etiqueta = OP-01).

`professional_assessment_reviews` agrega autor profesional, autoridad, decisión, nota y fecha sin alterar la evaluación. La interfaz proyecta el último evento como estado de revisión; no convierte REVIEWED en validación institucional. Versiones previas quedan visibles; una evaluación vencida no se revisa como vigente.

Seis tablas nuevas tienen RLS. SELECT solo a miembros (autoridad institucional solo a su titular); ninguna política de escritura directa autenticada. Triggers rechazan UPDATE/DELETE incluso privilegiados. Escrituras gobernadas únicamente vía RPC. Se observó expansión de privilegios por la plataforma y se aplicó una segunda migración para revocar permisos sobrantes de anon/authenticated; SELECT autenticado y permisos service_role quedaron explícitos.

## 5. Resultados de pruebas

| Comprobación | Resultado | Evidencia / alcance |
|---|---|---|
| ADMIN sin designación profesional | PASS unitario | `epar.test.ts`; ADMIN simulado sin designación, servidor DENIED |
| Evaluador designado en alcance 31/31 | PASS unitario | Predicado con las 31 identidades del registry |
| Fuera de alcance, revocada, vencida, futura, otro evaluador/assessment | PASS unitario | Casos concretos DENIED |
| Evidencia ajena y respuesta de otra capacidad | PASS unitario servidor | Rechazo antes de RPC |
| Abstención sin conclusión / rechazo de conclusión forzada | PASS unitario | Insuficiente, contradicción y no aplicabilidad |
| Versión anterior y revisión profesional separada | PASS unitario | RPC dedicadas y referencia anterior preservada |
| Creación, revisión y supersesión reales alojadas | NOT_TESTED | No existen autoridades profesionales QA válidas |
| Revocación/vencimiento con autoridad persistida alojada | NOT_TESTED | No se fabricaron designaciones |
| Pruebas EPAR | PASS · 56/56 | `focused-tests.txt` |
| Pruebas focales captura/arquitectura/runtime/servidor/frontera | PASS · 137/137 | `focused-tests.txt` |
| Regresión completa tras cambios | PASS · 1322/1322, 69 archivos | Resultado observado de vitest; 1266 existentes + 56 EPAR |

## 6. Aislamiento multiempresa

QA A: OWNER de `9816dfad-a1be-4140-8293-c4cab34f3603`. QA B: MEMBER de `b0400000-0000-4000-8000-000000000001`. Sesiones de las identidades existentes; roles y contraseñas sin cambios.

| Operación | QA A | QA B | Control y límites |
|---|---|---|---|
| Lectura propia de 4 tablas EPAR | PASS (vacías) | PASS (vacías) | Data API/RLS; prueba de acceso, no recuperación de filas |
| Lectura cruzada de 4 tablas EPAR | PASS (0 filas) | PASS (0 filas) | Vacío no demuestra ocultación de registros existentes |
| Inserción directa cruzada de 4 tablas | PASS DENIED | PASS DENIED | Base de datos: 42501, permisos mínimos; no se creó fila |
| RPC registro sin autoridad propia / con scope ajeno | PASS DENIED | PASS DENIED | Base de datos: EPAR_AUTHORITY_DENIED |
| Función de servidor con organización/assessment ajenos | PASS DENIED | PASS DENIED | EPAR_SCOPE_FORBIDDEN antes de lectura EPAR |
| Función de servidor sin designación profesional | PASS DENIED | PASS DENIED | EPAR_AUTHORITY_DENIED |
| Autodesignación sin autoridad de Gobierno | PASS DENIED | PASS DENIED | RPC: EPAR_GOVERNANCE_DENIED |
| IDOR lectura/modificación de EPAR ajena existente | NOT_TESTED | NOT_TESTED | No hay registros EPAR persistidos |

34 comprobaciones alojadas PASS delimitadas en `qa-a-security.json` y `qa-b-security.json`. No equivale a aceptación bilateral con datos no vacíos. No se ejecutaron UPDATE/DELETE de filas existentes porque no existen; no se los declara PASS.

## 7. Separación EPAR / Engine Finding

EPAR está en tablas/RPC propias y tiene identificador de origen visible. No importa ni instancia Engine; no escribe findings, observaciones, resultados, mappings, coberturas, recomendaciones ni decisiones empresariales. Hallazgos institucionales y decisiones de empresa permanecen en sus pantallas/contratos previos. No transforma selectionNote, no promueve conocimiento, no scoring/ranking ni IA. REC-01 sigue bloqueada; DEC-046/SEM-QA-01 no reabiertos.

## 8. Regresión e integridad

- Captura 31/31 preservada en 36 pruebas B01 y runtime genérico 24 pruebas.
- OP-01/OP-02: sin cambios al comportamiento del Engine o handlers existentes; solo incorporación independiente del panel EPAR.
- Arquitectura 7/7 y frontera DG-01 2/2 PASS, sin cambiar assertions ni excepciones.
- **233 huellas históricas sin diferencias**, referencia `docs/evidence/dec-046/protected-before.json`, evidencia `integrity.json`.
- Preview QA B `/capacidad/op-02`: panel profesional, rechazo explícito sin designación, cero errores de página observados; panel comprobado a 1280 y 390 px. QA A: mismo rechazo observado.
- Cabeceras de las dos rutas modificadas mantienen títulos/descripciones/OG propios; inspección de las rutas de contenido existentes no detectó falta de `head`.
- Última señal de compilación consultada: build OK. No publicado.

## 9. Bloqueos y pendientes

1. **Identidad institucional otorgante no designada.** Gobierno debe identificar expresamente la cuenta facultada, aprobación y vigencia; no se infiere de OWNER/ADMIN.
2. **Evaluadores sintéticos QA A/B no designados.** Gobierno debe aprobar sujetos, organizaciones, capacidades/assessment y fechas para habilitar QA positiva.
3. Ejecutar flujo alojado positivo por interfaz: registrar, recuperar, revisar, corregir por supersesión, verificar historial y probar IDOR bilateral contra filas no vacías; completar autoridad vencida/revocada y evidencia ajena bajo autoridad válida.
4. Pendiente heredado: seguridad de Storage de archivos binarios **NOT_TESTED en B02**.
5. Pendiente heredado: rol ADMIN alojado en QA B **NOT_TESTED**, QA B permanece MEMBER; no se cambiaron roles.

No se habilitaron documentos empresariales reales ni se declara preparado un piloto real.

## 10. Recomendación final

**BLOCKED para aceptación B02.** La implementación y las negativas verificadas no sustituyen el recorrido profesional positivo y el aislamiento con registros reales sintéticos. Completar las designaciones explícitas y la QA pendiente sin ampliar alcance; Gobierno conserva la decisión de aceptación. B03 no iniciado.