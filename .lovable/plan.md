# Diagnóstico Inteligente · E-commerce (POC Knowledge Pack v0.1)

Análisis previo a implementación. No se toca el motor actual (POC-04), ni la navegación, ni las pantallas aprobadas.

## 1. Cómo entendí la arquitectura propuesta

El Knowledge Pack define una cadena de siete eslabones que debe quedar explícita en datos, no en la interfaz:

```text
Pregunta (EC/TEC/SS/CRO-Qxx)
  -> Respuesta (opción declarada)
    -> Variable (EC-V01 ecommerce_status, TEC-V02 integration_needs, ...)
      -> Evaluación (interpretación de 1..n variables)
        -> Hallazgo (TEC-H01..H03, SS-H01..H04, CRO-H01..H03)
          -> Recomendación (TEC-R01..R03, SS-R01..R04, CRO-R01..R03)
            -> Iniciativa (modelo mínimo, sección 13)
```

Elementos que el pack fija y que se implementan tal cual, sin inventar nada:
- Instrumento semilla de 16 preguntas en 4 bloques: EC (3), TEC (4), SS (5), CRO (4).
- Lógica condicional LC-01 a LC-06 (sin tienda activa se oculta CRO detallado; con tienda activa se habilitan TEC y CRO; redes activas habilitan SS; registro inexistente o dependiente del vendedor activa trazabilidad; sin medición de conversión se evalúa CRO-H01; múltiples integraciones + baja capacidad genera la tensión TEC).
- 10 hallazgos y 10 recomendaciones semilla con su texto de evidencia e interpretación.
- Priorización experimental con tres criterios visibles (Impacto / Esfuerzo / Urgencia, escala Bajo/Medio/Alto), marcados como revisables. Sin scoring, pesos ni benchmarks.
- Perfil tecnológico como *perfil requerido* ("solución administrada con capacidad media/alta de integración"), marcado como preliminar, nunca una marca.
- Social Selling evaluado por la secuencia Detectar → Comprender → Aportar → Respaldar → Conversar → Gestionar → Aprender.
- CRO/UX solo a alto nivel; cuando hay etapa percibida como problemática sin evidencia, la salida es "recomendamos auditoría especializada de esta etapa".
- Cuando falta evidencia: "Información insuficiente para concluirlo."
- Dataset DEMO ficticio (tienda activa, B2C, canal importante, capacidad básica, inventario en Excel, integraciones inventario/facturación/logística/pagos, Instagram + WhatsApp, proceso parcial, registro dependiente del vendedor, contenido a veces útil, medición solo de redes, conversión general, sin análisis de abandono, optimización por percepción, dificultad en checkout).

## 2. Qué reutilizo del MVP actual

- Layout completo: `__root.tsx`, `AppHeader`, `AppSidebar`, `AppFooter`, `PageHeader`, patrón de tarjetas y tokens de `styles.css`.
- Componentes de pregunta existentes: `campo-pregunta.tsx`, `progreso-diagnostico.tsx`, `indicador-guardado.tsx`.
- Componentes de resultados: `finding-list.tsx`, `traceability-drawer.tsx` (base del "Ver por qué"), `result-summary-card.tsx`, `confidence-badge.tsx`, `action-card.tsx`.
- Navegación de etapa: `EtapaFooter` / `recorrido-modulos.ts` para insertar el nuevo módulo sin romper la secuencia.
- Modo demo ya construido: `src/lib/demo/modo-demo.ts`, `use-modo-demo.ts`, `DemoBanner`, `AutocompletarEtapa` y la ruta `/demostracion`.
- Roadmap existente (`AccionRoadmap`, `OrigenAccion`, repositorio) como destino de "Convertir en iniciativa", más un modelo de iniciativa propio de la POC para los campos del pack.
- Persistencia: patrón `use-local-storage` / `use-sesion`.

Nada de lo anterior cambia de comportamiento: solo se consume.

## 3. Nuevos componentes mínimos

Capa de conocimiento (datos puros, reemplazable):
- `src/lib/kb/ecommerce/preguntas.ts` — las 16 preguntas con id, dominio, tema, tipo, opciones y variable asociada.
- `src/lib/kb/ecommerce/variables.ts` — variables y normalización respuesta → valor de variable.
- `src/lib/kb/ecommerce/condicionales.ts` — LC-01..LC-06.
- `src/lib/kb/ecommerce/reglas.ts` — reglas evaluación → hallazgo (condición sobre variables, confianza, fuente metodológica).
- `src/lib/kb/ecommerce/hallazgos.ts`, `recomendaciones.ts` — bibliotecas semilla con textos del pack.
- `src/lib/kb/ecommerce/perfil-tecnologico.ts` — reglas de perfil requerido.
- `src/lib/kb/ecommerce/dataset-demo.ts` — respuestas DEMO ficticias.
- `src/lib/kb/ecommerce/index.ts` — un único objeto `knowledgePackEcommerce` versionado (`v0.1`).

Capa de dominio (funciones puras, sin UI):
- `src/lib/kb/tipos.ts` — contratos: `PreguntaKB`, `VariableKB`, `ReglaKB`, `HallazgoKB`, `RecomendacionKB`, `Trazabilidad`, `IniciativaKB`.
- `src/lib/kb/motor-kb.ts` — evaluador: respuestas → variables → evaluaciones → hallazgos → recomendaciones + trazabilidad y marcas de "información insuficiente".
- `src/lib/kb/formulario.ts` — cálculo de preguntas visibles según condicionales y progreso.
- `src/lib/kb/iniciativas.ts` — recomendación → iniciativa con prellenado, y conexión opcional al Roadmap.
- `src/lib/kb/contexto-conversacional.ts` — genera respuestas a las 7 consultas tipo, separando siempre "Nos indicaste que…", "Pymapa identifica…", "Por eso recomendamos…".
- `src/lib/kb/repositorio.ts` — persistencia por empresa.
- `src/lib/kb/kb.test.ts` — pruebas: condicionales, resultado esperado del dataset DEMO (sección 17), trazabilidad completa.

Interfaz (mínima, en el lenguaje visual actual):
- Rutas nuevas: `/diagnostico-ecommerce` (layout), `.index` (intro + iniciar / cargar DEMO), `.formulario` (formulario dinámico), `.resultados` (resumen ejecutivo, estado preliminar de Tecnología / Social Selling / CRO-UX, hallazgos prioritarios, recomendaciones), `.iniciativa.$recomendacion` (conversión).
- Componentes: `kb/pregunta-dinamica.tsx`, `kb/hallazgo-card.tsx`, `kb/recomendacion-card.tsx` (prioridad/impacto/esfuerzo/dimensión/hallazgo origen), `kb/ver-por-que-dialog.tsx`, `kb/perfil-tecnologico-card.tsx`, `kb/consulta-pymapa.tsx` (panel conversacional mínimo con las 7 preguntas sugeridas).
- Entradas: un ítem en el sidebar dentro de la etapa Diagnosticar y una tarjeta de acceso desde `/diagnostico.index`, sin alterar el orden existente.

## 4. Almacenamiento temporal

- Knowledge Pack: módulos TypeScript versionados, solo lectura, sin mezclarse con el estado del usuario. Sustituible por una v0.2 o por Cloud sin tocar la UI.
- Datos del cliente: `localStorage` bajo `pymapa:kb-ecommerce:v1`, indexado por `companyId` (el id de `Empresa` de la sesión actual). Guarda respuestas con fecha, evaluación derivada e iniciativas creadas — es decir, quedan asociadas a la empresa y no a la ejecución del formulario.
- El modo DEMO escribe en un slot separado y respeta el respaldo/restauración ya existente: los datos reales nunca se sobrescriben.

## 5. Desacople reglas / interfaz

La interfaz solo consume el resultado de `evaluarKB(respuestas, pack)`. Ningún componente contiene textos de hallazgos, condiciones ni recomendaciones; todos vienen de `src/lib/kb/**`. El pack se inyecta como parámetro, de modo que una versión futura se cambia en un solo punto.

## 6. Integración sin afectar el avance actual

- Módulo aditivo: rutas nuevas, ficheros nuevos. No se modifica `src/lib/motor/**`, `src/lib/resultados/**`, ni `src/lib/roadmap/**`.
- `recorrido-modulos.ts` y el sidebar reciben solo una entrada opcional; el cálculo de avance de los 6 módulos actuales no cambia.
- La conversión a iniciativa crea un registro propio de la POC; opcionalmente lo publica en el Roadmap usando el `OrigenAccion` existente, sin alterar sus estados.
- Se mantienen verdes las 104 pruebas actuales y se añaden las del pack.

## 7. Dudas y riesgos técnicos

1. Iniciativas: ¿las quieres como registro propio de la POC (aislado) o publicadas también en el Roadmap actual? Propongo registro propio + botón opcional "enviar al Roadmap".
2. Convivencia de diagnósticos: el diagnóstico general (28 preguntas) y este especializado son instrumentos distintos (Nivel 1 y Nivel 2 del pack). Propongo mantenerlos separados y no mezclar puntajes.
3. Conversacional: sin IA generativa, el panel responderá con plantillas deterministas construidas desde la trazabilidad. Queda desacoplado para conectar el modelo después. ¿Aceptas esa aproximación en esta POC?
4. Priorización: al no existir algoritmo, propongo valores sugeridos por regla, editables y marcados como "experimental".
5. Preguntas de opción múltiple (TEC-Q02, SS-Q01): el pack lista los valores pero no todos los cruces; me limitaré a las reglas explícitas y en el resto mostraré "Información insuficiente para concluirlo".
6. El pack no define umbral de confianza; usaré una marca cualitativa (declarado / inferido / insuficiente) en lugar de números inventados.

## Alcance excluido

Sin las 304 verificaciones CRO, sin catálogo de plataformas, sin scoring ni benchmarks, sin cambios metodológicos en el resto del MVP.
