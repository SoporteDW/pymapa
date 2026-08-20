/**
 * Biblioteca semilla de recomendaciones del Knowledge Pack E-commerce v0.1
 * (sección 10) más los campos semilla de conversión a iniciativa (sección 12).
 *
 * Impacto, esfuerzo y urgencia son escalas experimentales (sección 11):
 * revisables y explicables, sin algoritmo de prioridad definitivo.
 */

import type { RecomendacionKB } from "../tipos";

export const recomendaciones: RecomendacionKB[] = [
  {
    id: "TEC-R01",
    hallazgoId: "TEC-H01",
    texto: "Definir perfil tecnológico requerido antes de seleccionar plataforma.",
    objetivo:
      "Establecer qué capacidades tecnológicas necesita el canal digital antes de evaluar plataformas o proveedores.",
    resultadoEsperado:
      "Perfil tecnológico requerido documentado y criterios de decisión acordados.",
    acciones: [
      "Listar capacidades necesarias del canal digital",
      "Determinar el nivel de administración propia frente a servicio administrado",
      "Definir criterios de evaluación de proveedores",
      "Validar el perfil con la gerencia",
    ],
    impacto: "alto",
    esfuerzo: "medio",
    urgencia: "alto",
    dimension: "Adecuación tecnológica",
    experimental: true,
  },
  {
    id: "TEC-R02",
    hallazgoId: "TEC-H02",
    texto: "Mapear integraciones críticas y dependencias.",
    objetivo:
      "Identificar qué sistemas deben intercambiar información y con qué criticidad.",
    resultadoEsperado: "Mapa de integraciones con dependencias y prioridades.",
    acciones: [
      "Inventariar los sistemas involucrados",
      "Definir qué información viaja entre cada par de sistemas",
      "Clasificar cada integración por criticidad",
      "Identificar dependencias técnicas y responsables",
    ],
    impacto: "alto",
    esfuerzo: "medio",
    urgencia: "medio",
    dimension: "Necesidades de integración",
    experimental: true,
  },
  {
    id: "TEC-R03",
    hallazgoId: "TEC-H03",
    texto: "Evaluar integración de información operativa con e-commerce.",
    objetivo:
      "Reducir la dependencia de procesos manuales en la operación del canal digital.",
    resultadoEsperado: "Menos inconsistencias de disponibilidad y menor trabajo manual.",
    acciones: [
      "Documentar el proceso actual de inventario",
      "Identificar los puntos de error o reproceso",
      "Evaluar alternativas de sincronización",
      "Definir el alcance de una prueba controlada",
    ],
    impacto: "alto",
    esfuerzo: "alto",
    urgencia: "medio",
    dimension: "Complejidad operativa",
    experimental: true,
  },
  {
    id: "SS-R01",
    hallazgoId: "SS-H01",
    texto: "Diseñar proceso básico de Social Selling.",
    objetivo:
      "Convertir la actividad en redes en una capacidad comercial con pasos definidos.",
    resultadoEsperado:
      "Proceso comercial digital definido desde la señal hasta el siguiente paso.",
    acciones: [
      "Definir qué se considera una señal de interés",
      "Establecer cómo se responde y quién lo hace",
      "Definir el siguiente paso comercial esperado",
      "Acordar la revisión periódica del proceso",
    ],
    impacto: "alto",
    esfuerzo: "medio",
    urgencia: "medio",
    dimension: "Social Selling · Gestión",
    experimental: true,
  },
  {
    id: "SS-R02",
    hallazgoId: "SS-H02",
    texto: "Implementar registro mínimo de oportunidades sociales.",
    objetivo:
      "Establecer un proceso básico para registrar y seguir oportunidades originadas en canales sociales.",
    resultadoEsperado: "Trazabilidad desde la interacción hasta el próximo paso comercial.",
    acciones: [
      "Definir qué se considera una oportunidad",
      "Definir los datos mínimos por registrar",
      "Asignar responsable del registro",
      "Definir próximo paso y fecha",
      "Elegir el mecanismo de registro",
      "Establecer una revisión periódica",
    ],
    impacto: "alto",
    esfuerzo: "bajo",
    urgencia: "alto",
    dimension: "Social Selling · Conversación",
    experimental: true,
  },
  {
    id: "SS-R03",
    hallazgoId: "SS-H03",
    texto: "Construir Scorecard comercial digital.",
    objetivo:
      "Medir la evolución desde la interacción social hasta la oportunidad y el resultado.",
    resultadoEsperado: "Indicadores comerciales digitales revisados con periodicidad.",
    acciones: [
      "Definir los indicadores de la ruta comercial digital",
      "Determinar la fuente de cada dato",
      "Establecer la periodicidad de revisión",
      "Acordar quién interpreta los resultados",
    ],
    impacto: "medio",
    esfuerzo: "medio",
    urgencia: "medio",
    dimension: "Social Selling · Medición",
    experimental: true,
  },
  {
    id: "SS-R04",
    hallazgoId: "SS-H04",
    texto: "Diseñar mapa inicial de contenido útil.",
    objetivo:
      "Complementar el contenido promocional con contenido que ayude a comprender y decidir.",
    resultadoEsperado: "Mapa problema → valor con temas de contenido priorizados.",
    acciones: [
      "Identificar los problemas frecuentes del cliente",
      "Relacionar cada problema con el valor que aporta la empresa",
      "Definir formatos y responsables",
      "Programar una primera tanda de contenidos",
    ],
    impacto: "medio",
    esfuerzo: "bajo",
    urgencia: "medio",
    dimension: "Social Selling · Contenido",
    experimental: true,
  },
  {
    id: "CRO-R01",
    hallazgoId: "CRO-H01",
    texto: "Implementar medición básica del funnel transaccional.",
    objetivo:
      "Obtener visibilidad de las etapas del proceso de compra para localizar pérdidas.",
    resultadoEsperado: "Funnel medido por etapas con datos confiables.",
    acciones: [
      "Definir las etapas del funnel por medir",
      "Verificar la instrumentación analítica",
      "Habilitar el reporte por etapas",
      "Validar la calidad de los datos",
    ],
    impacto: "alto",
    esfuerzo: "medio",
    urgencia: "alto",
    dimension: "CRO/UX · Medición",
    experimental: true,
  },
  {
    id: "CRO-R02",
    hallazgoId: "CRO-H02",
    texto: "Crear ciclo periódico de optimización CRO/UX.",
    objetivo: "Sustituir las mejoras por percepción por un ciclo basado en evidencia.",
    resultadoEsperado: "Ciclo de mejora recurrente con hipótesis y resultados registrados.",
    acciones: [
      "Definir la periodicidad del ciclo",
      "Establecer cómo se formulan hipótesis",
      "Definir cómo se valida cada cambio",
      "Registrar aprendizajes",
    ],
    impacto: "medio",
    esfuerzo: "medio",
    urgencia: "medio",
    dimension: "CRO/UX · Optimización",
    experimental: true,
  },
  {
    id: "CRO-R03",
    hallazgoId: "CRO-H03",
    texto: "Ejecutar auditoría especializada de la etapa afectada.",
    objetivo:
      "Profundizar con una auditoría especializada antes de concluir causas específicas.",
    resultadoEsperado: "Diagnóstico detallado de la etapa con hallazgos verificados.",
    acciones: [
      "Delimitar el alcance de la auditoría",
      "Recolectar la evidencia disponible",
      "Ejecutar la revisión especializada",
      "Priorizar los ajustes resultantes",
    ],
    impacto: "medio",
    esfuerzo: "medio",
    urgencia: "medio",
    dimension: "CRO/UX · Journey transaccional",
    experimental: true,
  },
];
