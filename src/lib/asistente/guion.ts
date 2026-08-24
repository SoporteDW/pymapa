/**
 * Macroentrega 5 · Asistente Pymapa (simulado).
 *
 * IMPORTANTE: en el MVP Alfa NO hay IA real ni llamadas a un modelo. El
 * objetivo es validar la EXPERIENCIA de acompañamiento: el asistente sabe en
 * qué parte del journey está el usuario y responde con el conocimiento ya
 * acumulado de su empresa (perfil, diagnóstico, hallazgo, prioridad,
 * indicador). Todo el guion es determinista y explicable.
 */

export type ZonaAsistente =
  | "entrada"
  | "perfil"
  | "diagnostico"
  | "profundizacion"
  | "diagnostico_final"
  | "plan"
  | "actividad"
  | "seguimiento";

export interface ContextoAsistente {
  empresaNombre: string;
  /** Avance del cuestionario. */
  respondidas: number;
  total: number;
  /** Aspectos de profundización pendientes. */
  profundizacionPendiente: number;
  /** Actividad en foco, cuando el usuario está en una ficha o ejecución. */
  actividadTitulo?: string | null;
  hallazgo?: string | null;
  prioridad?: string | null;
  objetivo?: string | null;
  /** Seguimiento en foco. */
  indicador?: string | null;
  proximoHito?: string | null;
}

export interface RespuestaAsistente {
  id: string;
  pregunta: string;
  respuesta: string;
}

export const etiquetaZona: Record<ZonaAsistente, string> = {
  entrada: "Tu recorrido",
  perfil: "Etapa 1 · Preparar",
  diagnostico: "Etapa 2 · Diagnosticar",
  profundizacion: "Etapa 2 · Profundización",
  diagnostico_final: "Etapa 2 · Diagnóstico final",
  plan: "Etapa 3 · Actuar",
  actividad: "Etapa 3 · Actividad",
  seguimiento: "Etapa 4 · Seguir",
};

/** Deduce la zona del journey a partir de la ruta actual. */
export function zonaDesdeRuta(ruta: string): ZonaAsistente {
  if (ruta.startsWith("/perfil")) return "perfil";
  if (ruta.startsWith("/diagnostico/cierre")) return "profundizacion";
  if (ruta.startsWith("/diagnostico/listo")) return "diagnostico_final";
  if (ruta.startsWith("/diagnostico")) return "diagnostico";
  if (ruta.startsWith("/plan-de-accion/workspace")) return "actividad";
  if (ruta.startsWith("/plan-de-accion/")) return "actividad";
  if (ruta.startsWith("/plan-de-accion") || ruta.startsWith("/roadmap")) return "plan";
  if (ruta.startsWith("/seguimiento") || ruta.startsWith("/dashboard")) return "seguimiento";
  return "entrada";
}

export function saludoAsistente(zona: ZonaAsistente, ctx: ContextoAsistente): string {
  const empresa = ctx.empresaNombre.trim() || "tu empresa";
  switch (zona) {
    case "perfil":
      return `Estamos en Preparar. Con el nombre, el sector y el tamaño de ${empresa} puedo interpretar después cada respuesta del diagnóstico.`;
    case "diagnostico":
      return `Estás en el cuestionario del diagnóstico: ${ctx.respondidas} de ${ctx.total} respondidas. Pregúntame lo que no entiendas de una pregunta; no tienes que terminarlas todas hoy.`;
    case "profundizacion":
      return ctx.profundizacionPendiente > 0
        ? `Tu resultado todavía es preliminar: faltan ${ctx.profundizacionPendiente} aspectos por confirmar. Te explico por qué pedimos cada uno.`
        : "Ya tenemos todo lo que necesitábamos confirmar: puedes cerrar tu diagnóstico.";
    case "diagnostico_final":
      return `El diagnóstico de ${empresa} está cerrado. Puedo explicarte cualquier parte del informe antes de pasar a las actividades.`;
    case "plan":
      return "Estás en tu Plan de Acción. Puedo explicarte por qué una actividad va antes que otra.";
    case "actividad":
      return ctx.actividadTitulo
        ? `Estás trabajando “${ctx.actividadTitulo}”. Puedo explicarte el objetivo, el instrumento o qué debes entregar.`
        : "Estás en una actividad de tu plan. Puedo explicarte el objetivo, el instrumento o el entregable.";
    case "seguimiento":
      return ctx.proximoHito
        ? `Estamos en seguimiento. Tu próxima medición formal es ${ctx.proximoHito}, pero puedes registrar novedades cuando quieras.`
        : "Estamos en seguimiento: aquí comprobamos si lo ejecutado produjo resultados.";
    default:
      return `Soy el asistente de Pymapa. Te acompaño en las cuatro etapas: Preparar, Diagnosticar, Actuar y Seguir.`;
  }
}

/** Conversaciones simuladas disponibles en cada zona del journey. */
export function sugerenciasAsistente(
  zona: ZonaAsistente,
  ctx: ContextoAsistente
): RespuestaAsistente[] {
  const empresa = ctx.empresaNombre.trim() || "tu empresa";

  const comunes: RespuestaAsistente[] = [
    {
      id: "donde-estoy",
      pregunta: "¿En qué parte del proceso estoy?",
      respuesta: `Estás en ${etiquetaZona[zona]}. El recorrido completo tiene cuatro etapas: Preparar, Diagnosticar, Actuar y Seguir. Siempre te muestro un único siguiente paso recomendado para que no tengas que adivinar.`,
    },
    {
      id: "se-guarda",
      pregunta: "¿Se guarda lo que voy haciendo?",
      respuesta:
        "Sí. Tu avance queda guardado en este navegador y puedes salir y regresar al mismo punto. En esta versión demostrativa no se envía nada a un servidor.",
    },
  ];

  switch (zona) {
    case "perfil":
      return [
        {
          id: "por-que-perfil",
          pregunta: "¿Por qué necesitan datos de mi empresa?",
          respuesta:
            "Porque el mismo puntaje significa cosas distintas según sector y tamaño. Con el contexto de tu empresa podemos interpretar tus respuestas y priorizar actividades que sí puedas ejecutar.",
        },
        ...comunes,
      ];

    case "diagnostico":
      return [
        {
          id: "responsable-iniciativas",
          pregunta: "No entiendo qué significa “responsable de iniciativas digitales”.",
          respuesta:
            "Es la persona que en la práctica empuja los temas digitales: quien decide sobre la tienda en línea, las redes, el sistema de facturación o la página web. No necesita tener ese cargo formal ni ser del área de tecnología; en muchas pymes es el dueño o alguien de ventas o administración.",
        },
        {
          id: "no-se",
          pregunta: "No sé esta respuesta.",
          respuesta:
            "No hay problema. Puedes dejarla pendiente y continuar con las demás; también puedes enviársela a alguien de tu equipo con “Pedir a alguien de mi empresa”. La pregunta queda marcada y no bloquea el resto del cuestionario.",
        },
        {
          id: "terminar-28",
          pregunta: `¿Tengo que terminar las ${ctx.total} preguntas ahora?`,
          respuesta: `No. Tu avance se guarda y puedes continuar después desde donde quedaste. Vas ${ctx.respondidas} de ${ctx.total}; cuando vuelvas te llevo exactamente a la siguiente pregunta abierta.`,
        },
        ...comunes,
      ];

    case "profundizacion":
      return [
        {
          id: "por-que-evidencia",
          pregunta: "¿Por qué me piden un documento si ya respondí todo?",
          respuesta:
            "Porque hay conclusiones que no podemos sostener solo con lo declarado. Tu cuestionario está completo y no se reabre: lo que falta es confirmar información concreta para que el diagnóstico final sea confiable, no responder más preguntas.",
        },
        {
          id: "cuanto-falta",
          pregunta: "¿Cuánto falta para tener mi diagnóstico final?",
          respuesta:
            ctx.profundizacionPendiente > 0
              ? `Faltan ${ctx.profundizacionPendiente} aspectos por confirmar. Cuando resuelvas el último, el siguiente paso pasa a ser “Cerrar mi diagnóstico”.`
              : "Nada: ya puedes cerrar tu diagnóstico y descargar tu informe.",
        },
        {
          id: "no-tengo-doc",
          pregunta: "No tengo ese documento.",
          respuesta:
            "Puedes pedirlo a la persona de tu empresa que lo maneje, o responder con una aclaración explicando lo que sabes. Si la información no existe todavía, eso también es un hallazgo útil del diagnóstico.",
        },
        ...comunes,
      ];

    case "diagnostico_final":
      return [
        {
          id: "que-sigue",
          pregunta: "¿Qué sigue después del diagnóstico?",
          respuesta:
            "Convertimos los hallazgos y recomendaciones en un conjunto priorizado de Actividades. Cada Actividad tiene una Ficha con objetivo, método, entregable y criterio de validación, y Pymapa revisa lo que entregues.",
        },
        {
          id: "transferencia",
          pregunta: "¿Puedo pedir que alguien me explique el diagnóstico?",
          respuesta:
            "Sí. Con “Agendar transferencia con consultor” reservas una sesión (demostrativa en esta versión) para que un especialista te explique el diagnóstico y sus prioridades antes de empezar a ejecutar.",
        },
        ...comunes,
      ];

    case "plan":
      return [
        {
          id: "por-que-prioritaria",
          pregunta: `¿Por qué esta actividad es prioritaria para ${empresa}?`,
          respuesta: [
            ctx.hallazgo
              ? `Porque el diagnóstico encontró: ${ctx.hallazgo}`
              : `Porque el diagnóstico de ${empresa} identificó ahí la brecha con mayor efecto sobre las ventas digitales.`,
            ctx.prioridad ? `Prioridad asignada: ${ctx.prioridad}.` : "",
            ctx.objetivo ? `Lo que buscamos lograr: ${ctx.objetivo}` : "",
            "Además habilita a las siguientes: medir o rediseñar el carrito sirve de poco si el checkout todavía pierde compradores.",
          ]
            .filter(Boolean)
            .join(" "),
        },
        {
          id: "orden",
          pregunta: "¿Puedo hacerlas en otro orden?",
          respuesta:
            "Puedes explorar todas, pero te recomiendo respetar el orden: la primera actividad genera la información que las siguientes necesitan. Si haces la tercera primero, medirás un proceso que aún vas a cambiar.",
        },
        {
          id: "roadmap",
          pregunta: "¿El Roadmap es otro plan?",
          respuesta:
            "No. El Roadmap es la misma lista de Actividades vista en el tiempo. Sirve para consultar cuándo ocurre cada cosa, pero el trabajo se hace desde el Plan de Acción.",
        },
        ...comunes,
      ];

    case "actividad":
      return [
        {
          id: "que-entregar",
          pregunta: "¿Qué tengo que entregar exactamente?",
          respuesta:
            "El entregable que aparece en la ficha, con la evidencia que lo respalde (una captura, un documento o una nota con lo observado). Pymapa revisa esa entrega contra los criterios de validación y te dice qué falta si algo no se cumple.",
        },
        {
          id: "no-puedo-solo",
          pregunta: "No puedo hacer esto solo.",
          respuesta:
            "Tienes dos salidas dentro de la actividad: “Pedir a alguien de mi empresa”, si otra persona tiene la información o el acceso; o “Pedir apoyo experto”, si el obstáculo requiere criterio especializado. En ambos casos la actividad queda con su estado y regresas al mismo punto.",
        },
        {
          id: "ajustes",
          pregunta: "¿Qué pasa si la revisión pide ajustes?",
          respuesta:
            "La actividad vuelve a ejecución con la lista concreta de lo que falta. Corriges, vuelves a entregar y Pymapa revisa de nuevo. Ese ida y vuelta es parte del método: no se valida algo que no cumple.",
        },
        ...comunes,
      ];

    case "seguimiento":
      return [
        {
          id: "mejoro-semana",
          pregunta: "Esta semana mejoró la conversión. ¿Eso significa que funcionó?",
          respuesta: [
            "Es una señal positiva y vale registrarla como novedad.",
            ctx.indicador ? `Aun así, la medición formal de ${ctx.indicador}` : "Aun así, la medición formal",
            ctx.proximoHito
              ? `corresponde al checkpoint programado (${ctx.proximoHito}).`
              : "corresponde al checkpoint programado.",
            "Una semana buena puede deberse a estacionalidad o a una campaña; por eso comparamos contra la línea base en 30, 60 y 90 días antes de concluir.",
          ].join(" "),
        },
        {
          id: "entre-checkpoints",
          pregunta: "¿Qué hago entre un checkpoint y el siguiente?",
          respuesta:
            "Nada obligatorio, pero no desaparecemos: puedes registrar novedades, atender pendientes de terceros y trabajar actividades derivadas. Yo te aviso cuando se acerque la próxima medición formal.",
        },
        {
          id: "empeoro",
          pregunta: "¿Y si el indicador empeora?",
          respuesta:
            "Entonces el seguimiento concluye que el resultado no se logró y el recorrido vuelve sobre sí mismo: la actividad puede reabrirse, generarse una actividad complementaria o sugerirse apoyo especializado. Ejecutar no es lo mismo que lograr resultados.",
        },
        ...comunes,
      ];

    default:
      return [
        {
          id: "como-funciona",
          pregunta: "¿Cómo funciona Pymapa?",
          respuesta:
            "Te acompaño en cuatro etapas: Preparar (contexto de tu empresa), Diagnosticar (cuestionario, profundización e informe), Actuar (actividades con entregables que reviso) y Seguir (medición a 30, 60 y 90 días). Explorar es libre, pero siempre te digo cuál es tu siguiente paso.",
        },
        ...comunes,
      ];
  }
}
