# Auditoría previa · Lectura de intervención y financiación (demo Bancóldex)

Sin implementación. Esta es la propuesta para revisión.

## 1. Tabla de auditoría

| Capacidad | ¿Existe? | Qué existe hoy | Qué falta | Fuente de verdad propuesta | Pantalla afectada | Cambio mínimo |
|---|---|---|---|---|---|---|
| Ruta de intervención | Parcial (~80%) | Brecha (`HallazgoVista`), resultado esperado (`FichaAccion.impactExpected`), pasos e indicadores (`plantillas.ts`), instrumento y entregable (`instrumentos/catalogo.ts`), dominio y trazabilidad (`sourceRefs`) | Solo la **clasificación del tipo de intervención** (proceso / tecnología / formación / asistencia técnica) y el eje recursos–inversión | Función derivada pura en `src/lib/intervencion/` que **lee** ficha + actividad + instrumento + indicador. Sin persistencia | Ficha de Actividad (Workspace) | 1 módulo derivado + 1 sección en `ficha-actividad.tsx` |
| Recursos y apoyos | Parcial (~60%) | `apoyo-humano` (6 especialidades, reglas), `delegacion` (interno), `instrumentos.tipo`, `esfuerzo`, `requiereValidacion` | Lectura **agregada** del Plan (cuántas internas / formación / asistencia técnica / proveedor / inversión) | La misma función derivada, agregada sobre las actividades de `useActuar()` | Cierre de Plan (`plan-de-accion.cierre.tsx`) | 1 tarjeta de resumen (proyección) |
| Posible necesidad de financiación | No existe | Solo `esfuerzo`, `EspecialidadApoyo: "finanzas"` | Señal derivada `requiereInversion: si / no / por_determinar` | Regla determinista dentro del mismo módulo (versionada, como `reglasApoyo`) | Ficha de Actividad + Cierre de Plan | Incluido en el módulo, 0 pantallas nuevas |
| Proyecto potencialmente financiable | Parcial (~85%) de los datos | Problema, resultado, componentes (pasos/instrumento), horizonte (`duration`, hitos d30/60/90), indicadores (`seguimiento/catalogo.ts`), trazabilidad | Solo el **ensamblaje** y el estado "requiere estructuración y validación financiera" | Proyección: no se guarda nada | Nueva ruta de consulta `/proyecto/$actividad` (o drawer en la Ficha) | 1 vista de consulta, sin estado |
| Instrumentos a explorar | No existe | — | 2 referencias como **datos de conocimiento** + disclaimer | Archivo estático `src/lib/intervencion/instrumentos-financieros.ts` (capa conocimiento, sin API) | Sección dentro de la vista de proyecto | 1 archivo de datos + bloque de advertencia |
| Vista agregada de cohorte | No existe | Dominios D01–D06 y categorías de intervención reutilizables como etiquetas | Pantalla 100% simulada | Constante simulada en el propio archivo de la ruta | Nueva ruta `/cohorte` (fuera del Journey, no en el menú cronológico) | 1 ruta autocontenida |

## 2. Respuestas específicas

**A. Arquitectura.** Un módulo derivado nuevo, `src/lib/intervencion/`, de la capa conocimiento: funciones puras `clasificarIntervencion(actividad, ficha, instrumento)` y `agregarRecursos(actividades)`. No persiste, no escribe en localStorage, no emite hitos, no participa en `siguiente-paso/orquestador.ts`. Todo lo que muestre se recalcula desde Workspace + Resultados, que siguen siendo la única fuente de verdad.

**B. Reutilización.** `FichaAccion` (problem, whyItMatters, impactExpected, effort, duration, ownerRole, steps, indicators, risks, sourceRefs), `ActividadWorkspace` (estado, instrumento, entregable, pasos), `InstrumentoEjecucion.tipo` y `senales`, `IndicadorSeguimiento` + hitos d30/60/90, `EspecialidadApoyo`, `Delegacion.area`, `nombreDominio()`. Componentes: `Card`, `Badge`, `DemoNote`, `Seccion` de `ficha-actividad.tsx`, `PageHeader`.

**C. Campos nuevos indispensables.** Ninguno en los tipos persistidos. Solo un tipo derivado en memoria:

```
tiposIntervencion: ("proceso"|"tecnologia"|"formacion"|"asistencia_tecnica")[]
recursos: "internos" | "externos" | "mixtos"
requiereInversion: "si" | "no" | "por_determinar"
```

Nada de campos financieros, montos, plazos ni elegibilidad.

**D. UX (momentos exactos).**
1. *Ruta de intervención*: sección adicional en la **Ficha de Actividad**, después de "Cómo lo trabajaremos". Lectura, no CTA de avance.
2. *Recursos y apoyos agregados*: tarjeta en el **Cierre de Plan**, junto al resumen de actividades validadas.
3. *Proyecto potencialmente financiable + instrumentos*: enlace de **consulta** (variant link/outline) desde la Ficha, solo cuando `requiereInversion !== "no"`. Nunca compite con "Empezar actividad" ni con el siguiente paso.
4. *Cohorte*: acceso desde `/demostracion` (contexto demo), no desde el menú cronológico.

**E. Moda Origen.** No se crea otra empresa ni se toca el sembrado. Se usa la actividad ya existente del dominio D02 "Organizar la información de clientes en un registro único" (brecha: baja digitalización y control del proceso comercial). Su instrumento, entregable, indicador de seguimiento y hitos ya existen, y su clasificación derivada da: intervención = proceso + tecnología + formación; recursos = mixtos; inversión = por determinar → habilita la ficha de proyecto y los instrumentos a explorar. Las otras dos actividades quedan como "internas", lo que hace creíble la lectura agregada.

**F. Cohorte.** Una sola ruta autocontenida con un array constante (brechas por dominio y necesidades de intervención), rotulada explícitamente como "Vista simulada · no corresponde a datos reales". Sin multiempresa, sin analítica, sin persistencia, sin hooks nuevos.

**G. Riesgos y mitigación.**
- *Nueva fuente de verdad*: se evita con funciones puras sin estado ni escritura.
- *CTA que compita con el siguiente paso*: todo lo nuevo se rotula como consulta y no pasa por el orquestador ni por `etapa-nav.tsx`.
- *Nueva etapa implícita*: la cohorte queda fuera del mapa de 4 etapas y del sidebar cronológico.
- *Contaminación del sembrado Hero*: cero cambios en `sembrado-hero.ts` y en el escenario.
- *Roadmap/Dashboard*: no se tocan; siguen siendo proyección.
- *Lectura financiera indebida*: disclaimer fijo y ausencia total de elegibilidad, montos o simulación.

**H. Alcance: 5 intervenciones de código.**
1. `src/lib/intervencion/clasificacion.ts` (+ `instrumentos-financieros.ts`) — funciones puras versionadas.
2. Sección "Ruta de intervención" en `src/components/workspace/ficha-actividad.tsx`.
3. Tarjeta "Recursos y apoyos requeridos" en `src/routes/plan-de-accion.cierre.tsx`.
4. Vista de consulta "Proyecto potencialmente financiable" + instrumentos a explorar.
5. Ruta simulada `/cohorte` enlazada desde `/demostracion`.

Más pruebas unitarias de la clasificación (determinismo), sin tocar los 214 tests existentes.

## 3. Impacto cualitativo

| Ámbito | Impacto |
|---|---|
| Journey Maestro y estados | Bajo (nulo por diseño) |
| Modelo de datos persistido | Bajo (nulo) |
| Navegación principal | Bajo (una entrada de consulta desde demo) |
| Valor demostrativo para Bancóldex | Alto |
| Esfuerzo de implementación | Medio-bajo |

Riesgo de regresión: **bajo**, porque todo es lectura derivada y ninguna intervención modifica ejecución, hitos ni orquestación.
