import type { Resultado, Accion, Actividad } from "@/types";

export const resultadosDemo: Resultado[] = [
  {
    dimension: "Estrategia digital",
    puntajeDemostrativo: 62,
    nivel: "En desarrollo",
    mensaje: "Existen objetivos informales, pero falta documentarlos y asignar responsables.",
    esSimulado: true,
  },
  {
    dimension: "Procesos operativos",
    puntajeDemostrativo: 45,
    nivel: "Inicial",
    mensaje: "Varios procesos clave aún dependen de tareas manuales y hojas de cálculo.",
    esSimulado: true,
  },
  {
    dimension: "Presencia digital",
    puntajeDemostrativo: 78,
    nivel: "Avanzado",
    mensaje: "La empresa tiene presencia activa en múltiples canales digitales.",
    esSimulado: true,
  },
  {
    dimension: "Datos y decisiones",
    puntajeDemostrativo: 51,
    nivel: "En desarrollo",
    mensaje: "Se generan datos, pero no se consolidan para decisiones sistemáticas.",
    esSimulado: true,
  },
  {
    dimension: "Capacidad del equipo",
    puntajeDemostrativo: 70,
    nivel: "Avanzado",
    mensaje: "El equipo muestra disposición y habilidades básicas para adoptar herramientas.",
    esSimulado: true,
  },
];

export const accionesDemo: Accion[] = [
  {
    id: "acc-01",
    titulo: "Formalizar objetivos digitales",
    proposito: "Definir metas claras de transformación digital para los próximos 12 meses.",
    prioridad: "alta",
    impacto: "alto",
    esfuerzo: "bajo",
    estado: "pendiente",
    esSimulada: true,
  },
  {
    id: "acc-02",
    titulo: "Digitalizar procesos de inventario",
    proposito: "Reducir errores y liberar tiempo del equipo mediante un sistema de inventario.",
    prioridad: "alta",
    impacto: "alto",
    esfuerzo: "medio",
    estado: "pendiente",
    esSimulada: true,
  },
  {
    id: "acc-03",
    titulo: "Crear tablero de métricas",
    proposito: "Consolidar indicadores clave para tomar decisiones basadas en datos.",
    prioridad: "media",
    impacto: "medio",
    esfuerzo: "medio",
    estado: "pendiente",
    esSimulada: true,
  },
  {
    id: "acc-04",
    titulo: "Capacitación en herramientas colaborativas",
    proposito: "Aumentar la productividad del equipo con herramientas de trabajo en equipo.",
    prioridad: "media",
    impacto: "medio",
    esfuerzo: "bajo",
    estado: "pendiente",
    esSimulada: true,
  },
  {
    id: "acc-05",
    titulo: "Automatizar respuestas de atención",
    proposito: "Mejorar la experiencia del cliente con respuestas rápidas y consistentes.",
    prioridad: "baja",
    impacto: "medio",
    esfuerzo: "alto",
    estado: "pendiente",
    esSimulada: true,
  },
];

export const actividadDemo: Actividad[] = [
  {
    id: "act-01",
    fecha: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    tipo: "diagnostico",
    descripcion: "Se inició el diagnóstico de transformación digital.",
  },
  {
    id: "act-02",
    fecha: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString(),
    tipo: "perfil",
    descripcion: "Se actualizaron los datos básicos de la empresa.",
  },
  {
    id: "act-03",
    fecha: new Date().toISOString(),
    tipo: "sistema",
    descripcion: "Se cargaron datos ilustrativos para el MVP Alfa.",
  },
];
