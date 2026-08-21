# Plan de Intervención · Journey Maestro (MVP Alfa)

No se reconstruye nada de M1–M3. Se reorganiza la experiencia sobre las capacidades existentes.

## A. Diagnóstico del estado actual

Se conserva (sin tocar contratos ni lógica):
- Motores y repositorios: diagnóstico, suficiencia, evidencias, KB e-commerce (304 ítems), workspace + máquina de estados, revisión simulada, seguimiento 30/60/90, delegación, apoyo humano.
- Orquestador puro `src/lib/siguiente-paso/orquestador.ts` y `useSiguientePaso`.
- Sembrado Hero (`src/lib/demo/sembrado-hero.ts`), aislamiento del modo demo y las 170 pruebas.

Problemas de Journey que explican la confusión:
1. La entrada (`/inicio`) no explica el proceso ni ofrece dos caminos claros (pyme nueva vs. Moda Origen); "Ver demostraciones" es la única puerta al escenario profundo.
2. Cada capacidad vive como módulo autónomo (`/colaboracion`, `/apoyo`, `/seguimiento`), obligando a abandonar la actividad.
3. Faltan momentos de cierre narrados: "diagnóstico listo", "actividad validada", "plan completado", "ciclo al día".
4. No hay transiciones entre etapas: se salta de sección a sección sin relato causal.
5. Se filtra lenguaje interno (IDs de reglas, "304 verificaciones", vocabulario de motor) y mezcla de perspectivas pyme/consultor.
6. No existen los tres entregables como objetos visibles ni descarga del informe.

## B. Mapa del Journey propuesto

```text
Entrada (qué es Pymapa + elegir camino)
  ├─ A) Pyme nueva: Perfil → Diagnóstico → Profundización → Diagnóstico listo → ...
  └─ B) Moda Origen: Contexto "qué ya pasó" → Continuar profundización
Profundizar (evidencias · aclaraciones · revisión especializada de carrito)
Cierre de diagnóstico  ▸ ENTREGABLE 1 (PDF real)
Transición narrativa   ▸ Diagnóstico → Hallazgos → Recomendaciones → Actividades
Plan de Acción         ▸ ENTREGABLE 2 (descarga simulada)
Actividad Hero: qué encontramos → objetivo → por qué importa → cómo → qué hacer
   → qué entregar → cómo se evalúa → entrega → revisión → ajustes → validada
   (transversales en contexto: pedir información a un compañero · apoyo especialista)
Completar plan (resto acelerado) → "Plan de Acción inicial completado"
Transición → Plan de Seguimiento ▸ ENTREGABLE 3 (descarga simulada)
Seguimiento 30/60/90 (línea base → d30 → d60 → d90, lectura cualitativa)
Cierre de ciclo: "Tu ciclo actual está al día" + próximo check → Volver a mi tablero
```

## C. Pantallas / rutas

Nuevas:
- `/` (entrada): explicación del recorrido en 8 pasos + dos caminos. Reemplaza el redirect actual a `/inicio`.
- `/moda-origen` (contexto del escenario): qué ya ocurrió + CTA "Continuar profundización" (activa demo + sembrado).
- `/diagnostico/listo`: momento de cierre, dashboard ejecutivo nivel 1 + descarga del informe.
- `/plan-de-accion/transicion`: puente narrativo diagnóstico → plan.
- `/seguimiento/plan`: Plan de Seguimiento con hitos y fechas reales.
- `/cierre-de-ciclo`: resumen del ciclo y próxima revisión.

Modificadas (solo presentación y encuadre):
- `inicio.tsx`: sigue siendo el orquestador ("Tu siguiente paso"), con narrativa de ubicación en el proceso.
- `diagnostico.cierre.tsx` / `diagnostico.especializados.ecommerce.tsx`: lenguaje de "revisión especializada", sin IDs ni "304".
- `resultados.index.tsx`: nivel 1 ejecutivo + acceso al informe.
- `plan-de-accion.index.tsx`: tabla completa de atributos + CTA de descarga simulada.
- `plan-de-accion.workspace.$actividad.tsx`: 7 secciones narrativas, entrega, revisión, ajustes, cierre visual, y accesos en contexto a delegación y apoyo.
- `seguimiento.index.tsx` / `$actividad`: línea base → hitos, ligado a actividades validadas.
- `app-sidebar.tsx`: `/colaboracion` y `/apoyo` pasan a navegación secundaria de consulta.
- `demostracion.tsx`: se mantiene íntegro como acceso QA secundario.

Sin cambios: repositorios, motores, tipos, máquinas de estado, pruebas existentes.

## D. Estados de Moda Origen

- Precargado: perfil, 28 respuestas, dominios, lectura preliminar, necesidades de profundización abiertas, actividad Hero de carrito lista para ejecutar, delegación a Laura Gómez disponible, indicador base de abandono en checkout (72%).
- Manual (lo que el usuario vive): aportar evidencia/aclaración, cerrar diagnóstico, descargar informe, ejecutar la actividad Hero (entregar → recibir ajustes → corregir → validar), pedir información a un compañero, agendar apoyo, registrar medición d30.
- Simulado: análisis de evidencias, revisión de entregables, respuesta de Laura, sesión y conclusión del especialista, completado acelerado del resto del plan, descargas 2 y 3.

## E. Tres entregables

1. Informe de Diagnóstico — descarga real (PDF estático de Moda Origen).
2. Plan de Acción — descarga simulada, con diálogo explicativo.
3. Plan de Seguimiento — descarga simulada, mismo patrón.
Componente compartido `TarjetaEntregable` + `DialogoDescargaSimulada` para consistencia y diseño imprimible.

## F. Cambios de perspectiva

- Colaboración nace dentro de la actividad ("Necesito ayuda de alguien de mi empresa" → "Solicitar información a un compañero"); al volver: "Respuesta de Laura incorporada a esta actividad".
- Apoyo humano se ofrece en contexto con motivo, especialidad y objetivo; la pyme solo agenda; la conclusión llega simulada con CTA "Incorporar recomendación y continuar", que regresa a la actividad.
- Se elimina de la vista principal todo lenguaje de consultor/administrador/motor.

## G. Knowledge Base

Interno (solo trazabilidad y desarrollo): IDs de hallazgos, reglas, instrumentos, "304 verificaciones", nombres del motor. Visible: "Revisión especializada de carrito", "Vamos a revisar 10 aspectos relevantes…", metodología recomendada, evidencias necesarias, criterios de validación. Los IDs quedan disponibles en el panel técnico existente, no en la experiencia principal.

## H. Estrategia del PDF

- Archivo estático en `public/entregables/diagnostico-moda-origen.pdf`, servido tal cual con `download`; sin generación dinámica.
- Un único punto de verdad (`src/lib/entregables/catalogo.ts`) con la ruta y metadatos; se usa desde `/diagnostico/listo` y desde el dashboard, garantizando el mismo archivo siempre.
- Contenido según lo especificado (portada, perfil, metodología, resumen ejecutivo, seis dominios, fortalezas, brechas, hallazgos, evidencias, profundización e-commerce, recomendaciones, prioridades, plan inicial, fichas, indicadores, roadmap, siguientes pasos). Lo generaremos una vez como activo y quedará fijo.

## I. Riesgos y mitigación

- Duplicar seguimiento o actividades → todas las pantallas nuevas leen los repositorios existentes; cero estado nuevo.
- Romper el aislamiento demo → la entrada B reutiliza `activarModoDemo` + sembrado Hero ya probados.
- Rutas muertas en el orquestador → las nuevas rutas se agregan a `RUTAS_VALIDAS` con pruebas.
- Cambiar `/` puede afectar enlaces publicados → `/inicio` sigue existiendo como tablero.
- Regresión de pruebas → no se toca lógica pura; se añaden pruebas de orquestación.

## J. Macroentregas propuestas (3)

- **M4 · Entrada y cierre del diagnóstico**: nueva `/`, `/moda-origen`, `/diagnostico/listo`, lenguaje sin KB interno en profundización, entregable 1 con PDF estático. 
- **M5 · Plan de Acción y actividad Hero en contexto**: transición narrativa, plan con atributos y descarga simulada, workspace con las 7 secciones, entrega/revisión/ajuste/validación, colaboración y apoyo humano dentro de la actividad.
- **M6 · Seguimiento y cierre de ciclo**: completado acelerado del plan, Plan de Seguimiento, hitos 30/60/90 ligados a actividades, cierre de ciclo, ajustes de navegación secundaria y pruebas de la nueva orquestación.
