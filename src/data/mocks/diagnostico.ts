import type { Diagnostico, PasoDiagnostico, Pregunta } from "@/types";

export const pasosDiagnostico: PasoDiagnostico[] = [
  {
    id: "paso-1",
    numero: 1,
    titulo: "Estrategia digital",
    proposito: "Entender hacia dónde quiere avanzar la empresa.",
    dimensionId: "estrategia",
  },
  {
    id: "paso-2",
    numero: 2,
    titulo: "Procesos operativos",
    proposito: "Conocer cómo se ejecuta el trabajo del día a día.",
    dimensionId: "procesos",
  },
  {
    id: "paso-3",
    numero: 3,
    titulo: "Presencia digital",
    proposito: "Identificar cómo te encuentran y te contactan tus clientes.",
    dimensionId: "presencia",
  },
  {
    id: "paso-4",
    numero: 4,
    titulo: "Datos y decisiones",
    proposito: "Saber con qué información se toman las decisiones.",
    dimensionId: "datos",
  },
  {
    id: "paso-5",
    numero: 5,
    titulo: "Capacidad del equipo",
    proposito: "Estimar la facilidad para adoptar nuevas herramientas.",
    dimensionId: "equipo",
  },
];

export const totalPasos = pasosDiagnostico.length;

export const diagnosticoDemo: Diagnostico = {
  id: "diag-demo-001",
  estado: "completado",
  progreso: 100,
  pasoActual: totalPasos - 1,
  totalPasos,
  respuestasRevisadas: true,
  resultadosGenerados: true,
  fechaActualizacion: new Date().toISOString(),
};

export const diagnosticoVacio: Diagnostico = {
  id: "diag-vacio-001",
  estado: "no_iniciado",
  progreso: 0,
  pasoActual: 0,
  totalPasos,
  respuestasRevisadas: false,
  resultadosGenerados: false,
  fechaActualizacion: new Date().toISOString(),
};

export const preguntasDemo: Pregunta[] = [
  {
    id: "p-01",
    pasoId: "paso-1",
    seccion: "Estrategia digital",
    texto: "¿La empresa tiene definidos objetivos digitales claros para los próximos 12 meses?",
    tipo: "seleccion_unica",
    opciones: [
      { id: "p-01-a", etiqueta: "Sí, documentados y asignados", valor: 3 },
      { id: "p-01-b", etiqueta: "Sí, pero no están formalizados", valor: 2 },
      { id: "p-01-c", etiqueta: "No, pero se está trabajando", valor: 1 },
      { id: "p-01-d", etiqueta: "No se ha considerado", valor: 0 },
    ],
    ayuda: "Los objetivos digitales incluyen metas de ventas, presencia web, automatización o atención al cliente.",
  },
  {
    id: "p-02",
    pasoId: "paso-2",
    seccion: "Procesos operativos",
    texto: "¿Qué tan digitalizados están los procesos principales de la operación?",
    tipo: "seleccion_unica",
    opciones: [
      { id: "p-02-a", etiqueta: "Mayormente digitalizados", valor: 3 },
      { id: "p-02-b", etiqueta: "Algunos procesos digitales", valor: 2 },
      { id: "p-02-c", etiqueta: "Pocos procesos digitales", valor: 1 },
      { id: "p-02-d", etiqueta: "Principalmente manuales", valor: 0 },
    ],
    ayuda: "Considera ventas, inventario, facturación, contabilidad y atención al cliente.",
  },
  {
    id: "p-03",
    pasoId: "paso-3",
    seccion: "Presencia digital",
    texto: "¿Cómo describirías la presencia digital actual de la empresa?",
    tipo: "seleccion_unica",
    opciones: [
      { id: "p-03-a", etiqueta: "Vendemos en línea de forma habitual", valor: 3 },
      { id: "p-03-b", etiqueta: "Tenemos sitio web y canales activos", valor: 2 },
      { id: "p-03-c", etiqueta: "Solo redes sociales o WhatsApp", valor: 1 },
      { id: "p-03-d", etiqueta: "Casi no tenemos presencia digital", valor: 0 },
    ],
    ayuda: "Piensa en cómo te encuentran y te contactan tus clientes hoy.",
  },
  {
    id: "p-04",
    pasoId: "paso-4",
    seccion: "Datos y decisiones",
    texto: "¿La empresa usa datos para tomar decisiones de mejora?",
    tipo: "seleccion_unica",
    opciones: [
      { id: "p-04-a", etiqueta: "Siempre, con reportes periódicos", valor: 3 },
      { id: "p-04-b", etiqueta: "Frecuentemente, de forma parcial", valor: 2 },
      { id: "p-04-c", etiqueta: "A veces, sin método definido", valor: 1 },
      { id: "p-04-d", etiqueta: "Casi nunca", valor: 0 },
    ],
    ayuda: "Esto incluye reportes de ventas, métricas de marketing o indicadores de operación.",
  },
  {
    id: "p-05",
    pasoId: "paso-5",
    seccion: "Capacidad del equipo",
    texto: "¿El equipo cuenta con habilidades digitales básicas para adoptar nuevas herramientas?",
    tipo: "seleccion_unica",
    opciones: [
      { id: "p-05-a", etiqueta: "Sí, en la mayoría del equipo", valor: 3 },
      { id: "p-05-b", etiqueta: "Sí, en algunas personas", valor: 2 },
      { id: "p-05-c", etiqueta: "Limitadas", valor: 1 },
      { id: "p-05-d", etiqueta: "No se ha evaluado", valor: 0 },
    ],
    ayuda: "Considera el uso de herramientas ofimáticas, plataformas colaborativas o software de gestión.",
  },
];

export const respuestasDemo = preguntasDemo.map((pregunta, index) => ({
  preguntaId: pregunta.id,
  valor: [2, 1, 3, 1, 2][index] ?? 1,
  fechaGuardado: new Date(Date.now() - 1000 * 60 * 60 * (5 - index)).toISOString(),
}));

export function preguntasDePaso(pasoId: string) {
  return preguntasDemo.filter((p) => p.pasoId === pasoId);
}
