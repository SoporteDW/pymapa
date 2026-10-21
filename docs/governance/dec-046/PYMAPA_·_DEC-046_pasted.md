# PYMAPA · DEC-046
## Implementación controlada del contrato prescriptivo OP-01/H04

**Autoridad:** 00 · Gobierno de Producto  
**Validación:** 02 · Autoridad de Conocimiento  
**Ejecución:** 06 · Arquitectura Técnica  
**Modalidad:** BUILD · Implementación y pruebas autorizadas

### 1. Mandato

Gobierno ha aprobado `PRESC-OP01-H04-v0.3` como contenido prescriptivo complementario y autoriza su implementación técnica y verificación.

**No autoriza publicación, activación comercial ni emisión de REC-01.**

El mandato DEC-046 prevalece sobre las leyendas de estado anteriores que permanezcan en el documento adjunto. Conservar íntegro el expediente y registrar por separado la aprobación posterior.

### 2. Implementación

Implementar el contrato complementario versionado `PRESC-OP01-H04 / 0.3.0`, sin modificar Knowledge Master v1.0, los 31 Knowledge Packs v1.0.0 ni Knowledge Engine v0.2.0.

La implementación debe:

1. Consumir hallazgos H04 y evidencias previamente admitidas y validadas.
2. Evaluar C1–C6 con estados `TRUE`, `FALSE`, `UNKNOWN`, `CONTRADICTORY` y `NOT_APPLICABLE`, conservando evidencia, responsable, fecha y justificación.
3. Incorporar diagnóstico diferencial, contraindicaciones y rutas de abstención.
4. Separar estrictamente:
   - `semanticDecision`: RECOMMEND_CANDIDATE, REQUEST_INFO, ABSTAIN_ESCALATE o PRESERVE_MONITOR.
   - `emissionDecision`: BLOCKED, EMIT_ALLOWED o EMITTED.
5. Implementar controles independientes de aprobación del contenido, verificación técnica y autorización explícita de activación/emisión.
6. Mantener `emissionDecision=BLOCKED` para REC-01 en todas las pruebas de esta etapa, incluso cuando las seis condiciones sean TRUE.
7. Incorporar la recomendación complementaria REC-01 y las actividades ACT-01…05 exclusivamente bajo sus identificadores prescriptivos propios, sin crear equivalencias históricas Rxx/Axx.
8. Implementar trazabilidad, auditoría, suspensión, reevaluación y conservación del historial.

### 3. Seguridad e integridad

- No utilizar propuestas de IA documental en estado CANDIDATE como evidencia admitida.
- No invocar el Gateway ni modificar SEM-QA-01.
- No procesar documentos empresariales reales.
- No permitir que el frontend determine elegibilidad ni autorización de emisión.
- No crear mecanismos que permitan activar REC-01 mediante una simple configuración de interfaz.
- No publicar recomendaciones o actividades como contenido prescriptivo dirigido a usuarios finales.

### 4. Pruebas obligatorias

Implementar y ejecutar los doce casos sintéticos T01–T12 del expediente aprobado.

Verificar especialmente:

- H04 confirmado no implica automáticamente REC-01.
- C1–C6=TRUE permite exclusivamente candidatura semántica.
- UNKNOWN solicita información cuando corresponda.
- FALSE, contradicciones y contraindicaciones impiden la recomendación.
- Una causa primaria diferente conduce a abstención o ruta alternativa.
- Las decisiones anteriores no se sobrescriben ante nueva evidencia.
- Ningún escenario produce emisión sin autorización posterior de Gobierno.

Ejecutar pruebas de seguridad, aislamiento por empresa y regresión.

### 5. Entregables

Registrar:

1. Especificación técnica del contrato complementario y su ubicación.
2. Archivos y componentes implementados.
3. Resultados T01–T12.
4. Evidencia de bloqueo de emisión.
5. Resultados de regresión y seguridad.
6. Desviaciones, limitaciones y pendientes.

### 6. Criterio de cierre

La intervención puede cerrarse técnicamente cuando el contrato esté implementado, las pruebas obligatorias sean satisfactorias y REC-01 permanezca bloqueada.

No declarar REC-01 habilitada, publicada ni emitida.

Entregar el informe final para revisión de Arquitectura Técnica y posterior devolución a Gobierno.

**No extender el alcance a otras capacidades ni abrir nuevos paquetes de implementación.**