import type { Diagnostico, Pregunta } from "@/types";

export const diagnosticoDemo: Diagnostico = {
  id: "diag-demo-001",
  estado: "en_progreso",
  progreso: 35,
  pasoActual: 2,
  totalPasos: 5,
  fechaActualizacion: new Date().toISOString(),
};

export const diagnosticoVacio: Diagnostico = {
  id: "diag-vacio-001",
  estado: "no_iniciado",
  progreso: 0,
  pasoActual: 0,
  totalPasos: 5,
  fechaActualizacion: new Date().toISOString(),
};

export const preguntasDemo: Pregunta[] = [
  {
    id: "p-01",
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
    seccion: "Procesos operativos",
    texto: "¿Qué tan digitalizados están los procesos principales de la operación?",
    tipo: "seleccion_unica",
    opciones: [
      { id: "p-02-a", etiqueta: "Mayormente digitalizados", valor: 3 },
      { id: "p-02-b", etiqueta: "Algunos procesos digitales", valor: 2 },
      { id: "p-02-c", etiqueta: "Pocos procesos digitales", valor: 1 },
      { id: "p-02-d", etiqueta: "Principalmente manuales", valor: 0 },
    ],
    ayuda: "Considere ventas, inventario, facturación, contabilidad y atención al cliente.",
  },
  {
    id: "p-03",
    seccion: "Presencia digital",
    texto: "¿Cuáles canales digitales utiliza la empresa actualmente?",
    tipo: "seleccion_multiple",
    opciones: [
      { id: "p-03-a", etiqueta: "Sitio web propio", valor: "web" },
      { id: "p-03-b", etiqueta: "Redes sociales activas", valor: "redes" },
      { id: "p-03-c", etiqueta: "Tienda en línea", valor: "ecommerce" },
      { id: "p-03-d", etiqueta: "Correo corporativo", valor: "email" },
      { id: "p-03-e", etiqueta: "Ninguno de los anteriores", valor: "ninguno" },
    ],
    ayuda: "Seleccione todos los canales que la empresa utiliza de forma activa.",
  },
  {
    id: "p-04",
    seccion: "Datos y decisiones",
    texto: "¿La empresa usa datos para tomar decisiones de mejora?",
    tipo: "escala",
    opciones: [
      { id: "p-04-a", etiqueta: "Nunca", valor: 0 },
      { id: "p-04-b", etiqueta: "Raramente", valor: 1 },
      { id: "p-04-c", etiqueta: "A veces", valor: 2 },
      { id: "p-04-d", etiqueta: "Frecuentemente", valor: 3 },
      { id: "p-04-e", etiqueta: "Siempre", valor: 4 },
    ],
    ayuda: "Esto incluye reportes de ventas, métricas de marketing o indicadores de operación.",
  },
  {
    id: "p-05",
    seccion: "Capacidad del equipo",
    texto: "¿El equipo cuenta con habilidades digitales básicas para adoptar nuevas herramientas?",
    tipo: "seleccion_unica",
    opciones: [
      { id: "p-05-a", etiqueta: "Sí, en la mayoría del equipo", valor: 3 },
      { id: "p-05-b", etiqueta: "Sí, en algunas personas", valor: 2 },
      { id: "p-05-c", etiqueta: "Limitadas", valor: 1 },
      { id: "p-05-d", etiqueta: "No se ha evaluado", valor: 0 },
    ],
    ayuda: "Considere capacidades como uso de herramientas ofimáticas, plataformas colaborativas o software de gestión.",
  },
];
