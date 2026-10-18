# INT-01-BUILD · E3 — Integración, seguridad y regresión · Informe de cierre

Fecha: 2026-10-18 · Entorno: organización QA aislada `88fb67d6-4161-4f1e-a698-c703a4db9319` · Sin IA externa · Sin datos reales · Digiway Corp solo lectura.

## 1. Componentes E1 y E2 efectivamente integrados

- Persistencia documental del Bloque 1 (evidence → version → extraction → fragment → interpretation → mapping) verificada en base de datos alojada: 9 mappings, 9 fragmentos, 1 extracción, 3 evidencias preexistentes en QA.
- RPC gobernado `validate_fragment_mapping` operativo alojado: VALIDATED y REJECTED persisten con auditoría; transiciones inválidas rechazadas; MEMBER rechazado.
- Reutilización transversal E2 (`reuseCapabilityDocument` → `cross-capability-evidence.ts`) operativa alojada: mapping CANDIDATE independiente en PC-01 desde mapping VALIDATED de DG-01, con clave determinista idempotente.
- Cuestionario manual (`submitCapabilityResponse`) operativo alojado con Knowledge Engine 0.2.0: respuesta UNKNOWN aceptada y persistida (observación VA02, evaluation run creado); KNOWN sin valor semántico rechazado por el Engine (fail-closed verificado en vivo).
- Workspace de capacidad proyecta estado correctamente (DG-01: 1 respuesta registrada, 8 requerimientos pendientes, historial conservado).

**Hallazgo de integración (limitación, no defecto nuevo):** el puente de admisión E1 (`document-admission-bridge.ts`) no está invocado por ningún handler del servidor; su comportamiento está verificado con repositorio en memoria (9 pruebas) pero no existe recorrido alojado que lo ejecute. Además, los mappings persistidos en QA son de tipo INFORMATION_NEED sin `factualCorrespondenceRef`, por lo que aunque estuviera conectado no generarían observaciones. Coherente con INT01-COVERAGE-GAP-01.

## 2. Archivos modificados durante E3

Ninguno en el código del producto. No se requirieron correcciones: no se demostró ningún defecto dentro de los contratos vigentes.
Datos sintéticos creados en QA (autorizados): usuario `qa2.member@digiwaycorp.com` con rol MEMBER en la organización QA; 2 decisiones de mappings (1 VALIDATED, 1 REJECTED); 1 mapping CANDIDATE de reutilización en PC-01; 1 respuesta manual UNKNOWN en DG-01.

## 3. Pruebas ejecutadas y resultados verificables

| Prueba | Resultado | Evidencia |
|---|---|---|
| Suite automatizada completa (referencia 984) | **984 PASS / 0 FAIL / 0 omitidas** (47 archivos) | `bunx vitest run` |
| A · Persistencia real alojada | PASS | mappings/auditoría verificados por consulta directa |
| B · RLS lectura cruzada (QA → Digiway, solo lectura) | PASS | 0 filas devueltas, sin error |
| C · Validación por MEMBER (negativa) | PASS | "Solo un administrador…"; mapping permanece CANDIDATE |
| C2 · Reutilización por MEMBER (negativa) | PASS | `DOCUMENT_REUSE_FORBIDDEN` |
| C3 · Lectura MEMBER de su propia org (positiva) | PASS | 5 filas visibles |
| D · Reintento de reutilización (idempotencia) | PASS | mismo `mappingId` determinista `0be53999-…`, sin duplicado |
| E · Invalidación (SUPERSEDED vía RPC) | **NOT_TESTED parcial** | RPC rechaza SUPERSEDED (`FRAGMENT_MAPPING_INVALID_DECISION`); la invalidación append-only del puente E1 solo está cubierta por pruebas unitarias |
| F · Reutilización transversal DG-01 → PC-01 | PASS | CANDIDATE independiente, evidencia/fragmento originales referenciados |
| G · Recorrido autenticado de navegador | PASS | `/capacidad/DG-01` muestra pendientes, registradas e historial; mappings VALIDATED no descuentan preguntas (comportamiento conservador aceptado) |
| H · Regresión cuestionario manual | PASS | UNKNOWN aceptada y persistida; KNOWN sin valor semántico rechazado por el Engine |
| I · Suite completa | PASS | 984/984 |

## 4. Pruebas no ejecutadas y motivos

- **Invalidación alojada extremo a extremo (E completa):** el RPC gobernado no admite la transición SUPERSEDED; invalidar un mapping VALIDADO requeriría una vía no prevista en el contrato actual. La lógica de invalidación del puente (registro de control append-only) está probada unitariamente. Dependencia: decisión de gobierno sobre cómo se supersede un mapping VALIDATED.
- **Concurrencia real simultánea (D ampliada):** se verificó idempotencia por reintento secuencial; no se ejecutaron escrituras concurrentes paralelas contra la base alojada.
- **Aceptar/rechazar propuestas IA desde la interfaz:** la pantalla `/ia-documental` solo muestra propuestas de una interpretación IA en curso; ejecutarla requeriría una llamada a IA externa, prohibida en E3.

## 5. Seguridad multitenant y permisos

- RLS verificado en vivo: la sesión QA no lee mappings de Digiway Corp (0 filas).
- Validación restringida a OWNER/ADMIN verificada en vivo con usuario MEMBER real (creado como sintético QA): rechazada sin efecto sobre el dato.
- Reutilización transversal rechazada para MEMBER antes de cualquier operación privilegiada.
- Sin escrituras en Digiway Corp; toda escritura ocurrió en la organización QA aislada.

## 6. Persistencia, idempotencia e invalidación

- Decisiones de mappings persisten con `admission_basis`, `validated_by` y eventos de auditoría (`FRAGMENT_MAPPING_VALIDATED` ×2, `FRAGMENT_MAPPING_REJECTED` ×2, `FRAGMENT_MAPPING_PROPOSED` ×11).
- Re-decidir un mapping ya decidido es rechazado ("Esta propuesta ya fue decidida") — historial append-only intacto.
- Reutilización idempotente: clave determinista SHA-256, reintento devuelve el mismo mapping sin duplicar.
- Invalidación: cubierta unitariamente (E1); transición SUPERSEDED no disponible vía RPC (ver §4).

## 7. Regresiones y defectos corregidos

Ninguna regresión detectada; ningún defecto demostrado; ninguna corrección necesaria. Suite estable en 984/984 antes y después de las pruebas alojadas.

## 8. Confirmación de componentes protegidos intactos

`git status` limpio; sin cambios en `knowledge/` (Master v1.0 + 31 packs) ni `packages/knowledge-engine` (0.2.0). Moda Origen intacto. Sin migraciones nuevas. Sin llamadas a IA. Sin publicación.

## 9. Limitaciones funcionales abiertas

- **INT01-COVERAGE-GAP-01 · Contrato gobernado de cobertura de adquisiciones pendiente** (abierto, aceptado como comportamiento conservador provisional): ninguna admisión documental descuenta adquisiciones; las preguntas se conservan todas. No se declara PASS por ello.
- Puente E1 sin invocación desde handlers del servidor (ver §1).
- Mappings INFORMATION_NEED sin `factualCorrespondenceRef` no pueden alimentar observaciones aunque estén VALIDATED.
- Transición SUPERSEDED sin vía gobernada alojada.
- Defecto cruzado CM-05 (conflictos de adquisiciones progresivas distintas mezclados bajo VA01) sigue documentado y sin corregir, fuera del alcance INT-01.

## 10. Recomendación de siguiente paso

Cerrar INT01-COVERAGE-GAP-01 mediante un contrato canónico de cobertura (ver §11), con autorización previa; después, conectar el puente E1 al flujo de validación y dotar al RPC de una transición de supersesión gobernada.

## 11. Propuesta posterior (sin implementar) — alternativas para INT01-COVERAGE-GAP-01

### Alternativa 1 · Metadato de cobertura en el pack (`acquisitionCoverage`)
- **Contrato faltante:** por adquisición, lista exhaustiva y cerrada de variables/hechos que la componen y regla de completitud (p. ej. "todos los variableRefs con valor conocido").
- **Componentes a modificar:** esquema de packs (`knowledge/schemas`), pipeline de publicación (checksum), `documentary-coverage.ts`, `caso-uso.ts`.
- **Compatibilidad con los 31 packs:** requiere re-publicación versionada (1.1.0) de los packs que adopten el metadato; los demás permanecen en comportamiento conservador.
- **Impacto en gobernanza:** alto control — la regla vive en el conocimiento gobernado, no en código; auditable por checksum.
- **Riesgo de omitir preguntas:** medio — depende de la calidad del metadato por pack; mitigable con revisión de publicación.
- **Incremental:** sí, pack a pack.

### Alternativa 2 · Declaración factual explícita por mapping (`factualCoverage: "FULL"`)
- **Contrato faltante:** campo en `fragment_mappings` (o tabla auxiliar) donde el validador OWNER/ADMIN declara cobertura completa de la adquisición referenciada, con nota obligatoria.
- **Componentes a modificar:** migración aditiva, RPC `validate_fragment_mapping`, `documentary-coverage.ts`, `actionable.ts`.
- **Compatibilidad:** total — no toca packs ni Engine; la responsabilidad es humana gobernada.
- **Impacto en gobernanza:** medio — traslada la decisión de completitud al validador; requiere criterio documentado para evitar criterios heterogéneos.
- **Riesgo de omitir preguntas:** medio-alto si el validador sobreestima la cobertura; mitigable exigiendo `factualCorrespondenceRef` + nota + auditoría.
- **Incremental:** sí, inmediato.

### Alternativa 3 · Cobertura por correspondencia estructural 1:1:1 verificada
- **Contrato faltante:** regla canónica "en packs de biyección 1:1:1, una observación admitida con valor semántico válido para la única variable de la única adquisición de la NI cubre la adquisición".
- **Componentes a modificar:** `documentary-coverage.ts` (resolución por arquetipo desde metadatos del pack), `caso-uso.ts`.
- **Compatibilidad:** cubre los 11 packs 1:1:1; los otros 20 permanecen conservadores.
- **Impacto en gobernanza:** bajo — la regla deriva de la estructura ya publicada y verificada por checksum.
- **Riesgo de omitir preguntas:** bajo en 1:1:1 estricto; nulo para progresivas (quedan excluidas por diseño).
- **Incremental:** sí; primera entrega posible con DG-01..05/PC-01..05.

**Recomendación:** Alternativa 3 como primer incremento (bajo riesgo, sin cambios de esquema), seguida de Alternativa 1 para cobertura general gobernada.

## Estados finales

- **A · Estado técnico de integración INT-01: PASS WITH CONDITIONS** (condiciones: puente E1 no invocado desde handlers; SUPERSEDED sin vía alojada; concurrencia paralela no probada).
- **B · Estado de cobertura documental inteligente: BLOCKED BY CANONICAL CONTRACT** (INT01-COVERAGE-GAP-01 abierto; no se declara funcionalmente completo).
