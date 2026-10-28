# MVP31 · Optimización documental, confirmación y aislamiento

Fecha: 28 octubre 2026. Estado: IMPLEMENTADO Y PROBADO CON LÍMITES; MVP31 NO COMPLETADO.

## IMPLEMENTADO

- Contexto contiguo de hasta tres fragmentos, misma página/sección y máximo 900 caracteres, siempre contenido literalmente en la página extraída. El extractor histórico, Master, packs y Engine permanecen intactos. No OCR, IA, Gateway ni inferencia.
- Desempate determinista y preferencia por la cita más corta a igualdad de coincidencia. No se redujeron los umbrales para forzar cobertura.
- Métricas separadas: adquisiciones con cita candidata, propuestas pendientes y adquisiciones con respuesta documental vigente. Las propuestas no descuentan preguntas ni acreditan suficiencia.
- Revisión por documento o dominio, selección individual/grupal, progreso de guardado y conservación de los rechazos para revisión. Cuatro peticiones independientes por oleada, separadas por capacidad; dentro de cada petición las escrituras son secuenciales.
- Servidor exige OWNER/ADMIN, deriva la empresa, comprueba evidencia/assessment, reextrae y recalcula propuestas desde los PDF; nunca admite texto del cliente. Cada respuesta conserva cita, página, fragmento, evidencia, actor y versión del mapeador. Una evaluación final por capacidad tras las respuestas admitidas conserva los IDs de respuestas/observaciones/evaluación.
- Reintentos secuenciales y duplicados dentro de una petición no vuelven a registrar adquisiciones ya respondidas. No se declara garantía transaccional/idempotencia para peticiones simultáneas externas de la misma adquisición; no se cambiaron RLS ni schema.

## Métricas reales antes/después

Mismos cinco PDFs sintéticos Qhapaq; no se añadió contenido al expediente para alcanzar una cuota.

| Métrica | Antes | Después del mapeo | Después de QA de confirmación |
|---|---:|---:|---:|
| Capacidades catalogadas | 31 | 31 | 31 |
| Adquisiciones | 448 | 448 | 448 |
| Fragmentos originales / unidades contextuales | 127 | 127 + 153 | igual |
| Adquisiciones únicas con cita candidata (evaluación sin excluir respuestas) | 207 | 249 | 249 |
| Porcentaje con cita candidata | 46,2 % | 55,6 % | 55,6 % |
| Candidatas con coincidencia alta, corpus sin excluir respuestas | 76 | 97 | 97 |
| Adquisiciones documentales efectivamente confirmadas y vigentes | 75 | 75 | 96 |
| Propuestas pendientes de revisión | 132 | 174 | 153 |
| Sin respuesta ni propuesta | 241 | 199 | 199 |
| Tiempo de lectura servidor (una muestra, no mediana) | 2104 ms | 3273 ms | no comparación controlada |

La lectura se hizo más lenta en esa muestra, aunque recuperó 42 adquisiciones adicionales con contexto literal. No se afirma mejora de velocidad de extracción.

**85–90 % NO ALCANZADO.** 249 citas candidatas no equivalen a 249 respuestas verificadas semánticamente ni a cobertura FULL. La revisión mostró coincidencias altas imprecisas (p. ej. proveedores comerciales contra licencias/costo operativo): no se confirmaron por su etiqueta. El porcentaje es alcance léxico potencial, no precisión/recall ni suficiencia. No existe gold standard que permita declarar precisión general.

### Confirmación observada

- Primera prueba UI: ocho selecciones, siete observaciones admitidas y una respuesta rechazada por el pack (OP01-P13). La expectativa de ocho éxitos FALLÓ; la validación protegida no se eludió. La respuesta rechazada sigue append-only y no cuenta como confirmada.
- Prueba intermedia: seis citas revisadas, 6/6 confirmadas en 45,85 s UI (45,3 s informado), 7 clics. Mezcla de cinco capacidades, sin paralelización por capacidad en esa ejecución.
- Prueba final optimizada: ocho citas revisadas en DG-01, PC-01 y EC-05, 8/8 en 9,94 s UI (9,4 s informado), 9 clics; 1,24 s por respuesta. Recuperación tras recarga: 96 respuestas documentales vigentes.
- Los lotes tienen tamaños y capacidades diferentes: **no es un benchmark pareado ni permite afirmar un porcentaje exacto universal de aceleración**. Referencia anterior ~3 s/respuesta era histórica, no medición nueva controlada.
- Selección grupal + confirmar conserva dos comandos para un grupo ya revisado; selección individual permanece disponible. No se afirma reducción de clics respecto de la interfaz anterior, que ya tenía selección global. La mejora comprobada es el tiempo del lote final y la agrupación por documento sin perder citas.

## Información/documentos que faltan

Inventario completo: `docs/evidence/mvp31-optimization/missing-information.csv`, 199 requisitos literales; matriz 31C: `coverage-31.csv`.

No fabricar documentos para reflejar automáticamente preguntas: los anexos deben declarar hechos sintéticos coherentes y dejar explícitamente desconocido lo que no existe.

| Área | Faltantes prioritarios | Documentos a solicitar o preparar como ficción explícita |
|---|---|---|
| OP-03 / OP-04 / OP-05 | 22 / 34 / 43 requisitos sin propuesta: conexiones, propósito, controles, iniciativas, beneficiarios y resultados | Mapa de procesos y handoffs, matriz de controles/requisitos, fichas de iniciativas con resultado, propietario, presupuesto, licencias y dependencias |
| DT-02 / DT-03 / DT-06 | 13 / 16 / 13: definición, completitud, origen/destino, integración y adecuación | Diccionario de datos con origen/calidad, especificaciones de interfaces y traspasos, requisitos de la solución y pruebas de adecuación |
| Personas y conocimiento | Acceso, plazos, confiabilidad, aprendizaje, cambio, concentración y comunicación | Matriz de competencias, evaluaciones/pruebas prácticas, plan de aprendizaje/cambio, inventario de conocimiento y plan de comunicación |
| Dirección | Prioridad y secuencia, autoridad, seguimiento y desviaciones | Actas de decisión y responsabilidades, cronograma con estado y registro de desviaciones/acciones |
| Clientes y ecosistema | Razones de elección/pérdida, valor, riesgo, uso y alternativas | Registros de entrevistas/CRM, análisis por canal/línea, contratos/SLA, revisiones de proveedores y pruebas de alternativas |
| OP-01 / OP-02 | Selecciones y situación concreta faltante | Revisión manual de opciones y relato de un incidente sintético con evidencia |

Además quedan **153 propuestas sin confirmar**: tener una cita no elimina la revisión. Preguntas que exigen suficiencia o juicio no quedan resueltas por coincidencia léxica.

## PROBADO · aislamiento bilateral

Sesiones controladas de QA Qhapaq (OWNER) y QA INT01 (OWNER), organizaciones diferentes. No usuarios nuevos, ninguna modificación de políticas/RLS ni de registros de la segunda empresa. Repetido después de nuevas respuestas Qhapaq.

**32 PASS / 0 FAIL / 2 positivos sin fixture.** Matriz: `docs/evidence/mvp31-optimization/isolation-results.json`.

- Lecturas propias no vacías y cruces por organization_id + IDs conocidos: evidence, responses, observations, findings, evaluation_runs.
- PDF propio descargable; PDF ajeno denegado sin bytes en ambos sentidos.
- Fragmentos/mappings persistidos de QA INT01 inaccesibles para Qhapaq, incluso por ID. Qhapaq no tiene fragmentos/mappings persistidos del dossier: el flujo proyecta fragmentos/propuestas en lectura, no escribe esas tablas. La comprobación inversa de esas tablas devuelve vacío pero no acredita bloqueo con filas Qhapaq no vacías; esos dos controles positivos quedan NO_FIXTURE, no PASS integral.
- Proyección del expediente por cada identidad contiene solo documentos y propuestas de su organización. Qhapaq tiene 5 documentos y 153 propuestas tras QA; QA INT01 29 documentos y 23 propuestas. No se mezclan citas.
- Resultados persistidos protegidos por RLS y lecturas propias positivas. No se repitió aquí el recorrido interactivo de todos los resultados por capacidad ni la matriz de roles ADMIN/MEMBER alojada; MEMBER se probó a nivel de handler.

## Pruebas y protección

- 28/28 pruebas focales PASS: corpus antes/después, cita literal, límites de contexto, opciones cerradas, desempates, evidencia ajena, MEMBER, fragmento arbitrario, duplicación/reintento secuencial, respuesta/observación/evaluación y captura previa.
- 1338/1338 regresión PASS, 73 archivos de prueba, incluidas fronteras arquitectónicas.
- 233 huellas históricas verificadas sin cambios frente a `docs/evidence/dec-046/protected-before.json`.
- Comprobación automática de compilación final: OK. Navegador del flujo de confirmación: sin errores JavaScript observados.
- El extractor histórico no cambió. No se alteró el conocimiento ni se activó REC-01, SEM-QA-01 o la vía IA. No se inició B03.

## PENDIENTE / BLOQUEADO

- PENDIENTE: sustanciar anexos sintéticos para los 199 faltantes, revisión de 153 propuestas y validación pareada de rendimiento/precisión con un corpus independiente; objetivo documental 85–90 % todavía distante.
- PENDIENTE: prueba de fragmentos/mappings persistidos no vacíos en Qhapaq si ese camino se habilita por mandato; no se crean filas artificiales para hacer pasar aislamiento.
- PENDIENTE: Escenario A preparado y demostración integral de ambos escenarios; este bloque no cierra MVP31.
- BLOQUEADO: DEC-053 para análisis asistido de 29 capacidades; SEM-QA-01 detenido; redacción de preguntas específicas de 18 capacidades sin formulación literal requiere Gobierno. REC-01 bloqueada.
- Cobertura 31/31: catálogo y captura disponibles; documentos producen candidatos transversales; diagnóstico con reglas publicadas solo en 2 packs, no se inventaron conclusiones para los 29 restantes.

Siguiente dentro del plazo autorizado: completar anexos documentales sintéticos verificables, priorizar OP-03/04/05 y DT-02/03/06, evaluar faltantes sin cuotas y preparar el Escenario A. Gobierno no se sustituye por presión de plazo.