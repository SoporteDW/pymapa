import { estadoRecorrido, primerModuloPendiente } from "@/lib/recorrido-modulos";
import type { EtapaId, SesionMVP } from "@/types";


/**
 * Mapa del recorrido (POC-02, sección 7).
 * Las cinco etapas de acompañamiento a la pyme.
 */
export interface Etapa {
  id: EtapaId;
  numero: number;
  titulo: string;
  descripcion: string;
  ruta: string;
}

export const etapas: Etapa[] = [
  {
    id: "preparar",
    numero: 1,
    titulo: "Preparar",
    descripcion: "Registra el contexto básico de tu empresa.",
    ruta: "/perfil",
  },
  {
    id: "diagnosticar",
    numero: 2,
    titulo: "Diagnosticar",
    descripcion: "Responde el diagnóstico guiado paso a paso.",
    ruta: "/diagnostico",
  },
  {
    id: "interpretar",
    numero: 3,
    titulo: "Interpretar",
    descripcion: "Comprende tu estado actual y tus prioridades.",
    ruta: "/resultados",
  },
  {
    id: "actuar",
    numero: 4,
    titulo: "Actuar",
    descripcion: "Convierte las prioridades en acciones concretas.",
    ruta: "/plan-de-accion",
  },
  {
    id: "seguir",
    numero: 5,
    titulo: "Seguir",
    descripcion: "Revisa tu avance y define el siguiente paso.",
    ruta: "/dashboard",
  },
];

export type EstadoEtapa = "completada" | "activa" | "pendiente";

export interface SiguientePaso {
  etapa: EtapaId;
  titulo: string;
  descripcion: string;
  accionLabel: string;
  ruta: string;
}

/** Estado de cada etapa a partir de la sesión local. No implica lógica de diagnóstico. */
export function estadoEtapas(sesion: SesionMVP): Record<EtapaId, EstadoEtapa> {
  const perfilOk = sesion.perfilCompletado && sesion.empresa.nombre.trim().length > 0;
  const diagCompleto = sesion.diagnostico.estado === "completado";
  const diagIniciado =
    (sesion.diagnostico.respondidasObligatorias ?? sesion.respuestas.length) > 0 ||
    sesion.diagnostico.estado === "en_progreso";
  const hayResultados = sesion.resultados.length > 0 && sesion.diagnostico.resultadosGenerados;
  const hayAcciones = sesion.acciones.length > 0;
  const accionIniciada = sesion.acciones.some(
    (a) => a.estado === "en_progreso" || a.estado === "completada"
  );

  const estados: Record<EtapaId, EstadoEtapa> = {
    preparar: perfilOk ? "completada" : "activa",
    diagnosticar: diagCompleto ? "completada" : diagIniciado ? "activa" : "pendiente",
    interpretar: hayResultados ? "completada" : diagCompleto ? "activa" : "pendiente",
    actuar: accionIniciada ? "completada" : hayAcciones ? "activa" : "pendiente",
    seguir: accionIniciada ? "activa" : "pendiente",
  };

  if (!perfilOk) {
    return { ...estados, diagnosticar: estados.diagnosticar === "completada" ? "completada" : estados.diagnosticar };
  }
  return estados;
}

/** Siguiente paso único y contextual mostrado en Inicio y Dashboard. */
export function siguientePaso(sesion: SesionMVP): SiguientePaso {
  const perfilOk = sesion.perfilCompletado && sesion.empresa.nombre.trim().length > 0;

  if (!perfilOk) {
    return {
      etapa: "preparar",
      titulo: "Completa el perfil de tu empresa",
      descripcion:
        "Con el nombre, el sector y el tamaño podemos ordenar el recorrido y explicarte cada paso.",
      accionLabel: "Completar perfil",
      ruta: "/perfil",
    };
  }

  const respondidas =
    sesion.diagnostico.respondidasObligatorias ?? sesion.respuestas.length;
  const totalPreguntas = sesion.diagnostico.totalPreguntas ?? sesion.diagnostico.totalPasos;

  if (sesion.diagnostico.estado === "no_iniciado") {
    return {
      etapa: "diagnosticar",
      titulo: "Inicia tu diagnóstico",
      descripcion:
        "Son preguntas breves sobre seis dimensiones. Puedes guardar y continuar después.",
      accionLabel: "Comenzar diagnóstico",
      ruta: "/diagnostico",
    };
  }

  if (sesion.diagnostico.estado === "en_progreso") {
    return {
      etapa: "diagnosticar",
      titulo: "Continúa tu diagnóstico",
      descripcion: `Has respondido ${respondidas} de ${totalPreguntas} preguntas del diagnóstico.`,
      accionLabel: "Continuar diagnóstico",
      ruta: "/diagnostico",
    };
  }

  if (!sesion.diagnostico.resultadosGenerados || sesion.resultados.length === 0) {
    return {
      etapa: "interpretar",
      titulo: "Consulta tu resultado preliminar",
      descripcion:
        "Ya tienes tu puntaje global y por dimensión. La interpretación y las prioridades llegarán en el siguiente paquete.",
      accionLabel: "Ver resultado preliminar",
      ruta: "/diagnostico/resumen",
    };
  }

  const accionEnProgreso = sesion.acciones.find((a) => a.estado === "en_progreso");
  if (accionEnProgreso) {
    return {
      etapa: "actuar",
      titulo: `Avanza en “${accionEnProgreso.titulo}”`,
      descripcion: "Ya iniciaste esta acción demostrativa. Continúa cuando quieras.",
      accionLabel: "Ver acción",
      ruta: `/plan-de-accion/${accionEnProgreso.id}`,
    };
  }

  const pendiente = sesion.acciones.find((a) => a.estado === "pendiente");
  if (pendiente) {
    return {
      etapa: "actuar",
      titulo: "Comienza tu primera acción",
      descripcion: `Sugerimos empezar por “${pendiente.titulo}”, de alto impacto y bajo esfuerzo.`,
      accionLabel: "Ver plan de acción",
      ruta: "/plan-de-accion",
    };
  }

  return {
    etapa: "seguir",
    titulo: "Revisa tu avance",
    descripcion: "Consulta el resumen de tu recorrido y define el siguiente movimiento.",
    accionLabel: "Ir al dashboard",
    ruta: "/dashboard",
  };
}

/** Determina si el usuario tiene progreso real guardado en la sesión. */
export function hayProgresoReal(sesion: SesionMVP): boolean {
  const perfilIniciado =
    sesion.perfilCompletado || sesion.empresa.nombre.trim().length > 0;
  const diagnosticoIniciado =
    sesion.diagnostico.estado !== "no_iniciado" ||
    (sesion.diagnostico.respondidasObligatorias ?? sesion.respuestas.length) > 0;
  const hayResultados = sesion.resultados.length > 0;
  const hayAcciones = sesion.acciones.length > 0;

  return perfilIniciado || diagnosticoIniciado || hayResultados || hayAcciones;
}

/** Rutas fijas a las que puede apuntar el recorrido. */
const RUTAS_RECORRIDO = new Set<string>([
  "/inicio",
  "/perfil",
  "/diagnostico",
  "/diagnostico/resumen",
  "/resultados",
  "/plan-de-accion",
  "/roadmap",
  "/dashboard",
]);

/**
 * Evita enviar al usuario a una ficha inexistente o eliminada: las rutas con
 * identificador solo son válidas si el registro sigue en el plan actual.
 */
export function rutaValida(sesion: SesionMVP, ruta: string): boolean {
  if (ruta.startsWith("/plan-de-accion/")) {
    const id = ruta.slice("/plan-de-accion/".length);
    return sesion.acciones.some((a) => a.id === id);
  }
  if (ruta.startsWith("/roadmap/")) {
    const id = ruta.slice("/roadmap/".length);
    return sesion.acciones.some((a) => a.id === id);
  }
  return RUTAS_RECORRIDO.has(ruta);
}

export type TipoCta = "iniciar" | "continuar" | "avance";

export interface CtaRecorrido {
  tipo: TipoCta;
  kicker: string;
  titulo: string;
  descripcion: string;
  label: string;
  ruta: string;
  hint: string;
}

/**
 * CTA principal del Home, derivado del mismo estado persistido que alimenta el
 * menú y los módulos: Iniciar / Continuar / Ver avance.
 */
export function ctaRecorrido(sesion: SesionMVP): CtaRecorrido {
  if (!hayProgresoReal(sesion)) {
    return {
      tipo: "iniciar",
      kicker: "Empieza aquí",
      titulo: "Inicia tu recorrido de transformación",
      descripcion:
        "Registra el perfil de tu empresa, responde el diagnóstico, descubre tus resultados y construye tu plan de acción paso a paso.",
      label: "Iniciar mi recorrido",
      ruta: "/perfil",
      hint: "Comenzar te lleva al primer paso: completar tu perfil.",
    };
  }

  const pendiente = primerModuloPendiente(sesion);

  if (estadoRecorrido(sesion) === "completada" || !pendiente) {
    const accionesAbiertas = sesion.acciones.filter(
      (a) => a.estado === "pendiente" || a.estado === "en_progreso"
    ).length;
    if (accionesAbiertas > 0) {
      return {
        tipo: "avance",
        kicker: "Tu recorrido está al día",
        titulo: "Continúa con tu plan",
        descripcion: `Tienes ${accionesAbiertas} acción(es) abiertas en tu Roadmap para seguir ejecutando.`,
        label: "Continuar con mi plan",
        ruta: "/roadmap",
        hint: "Te llevamos al Roadmap para retomar la ejecución.",
      };
    }
    return {
      tipo: "avance",
      kicker: "Recorrido completado",
      titulo: "Revisa tu avance",
      descripcion:
        "Completaste las seis etapas del recorrido. Consulta tus indicadores para medir resultados y decidir el siguiente ciclo.",
      label: "Ver mi avance",
      ruta: "/dashboard",
      hint: "Los indicadores resumen tu madurez y la ejecución del plan.",
    };
  }

  const paso = siguientePaso(sesion);
  // Si la referencia guardada ya no existe, se recupera el siguiente punto válido.
  const ruta = rutaValida(sesion, paso.ruta) ? paso.ruta : pendiente.ruta;
  const referenciaPerdida = ruta !== paso.ruta;

  return {
    tipo: "continuar",
    kicker: "Tu siguiente paso",
    titulo: referenciaPerdida ? `Continúa en ${pendiente.label}` : paso.titulo,
    descripcion: referenciaPerdida ? pendiente.descripcion : paso.descripcion,
    label: "Continuar mi recorrido",
    ruta,
    hint: "Continuar te lleva exactamente al punto donde quedaste.",
  };
}


export const etiquetaHorizonte: Record<string, string> = {
  ahora: "Ahora",
  despues: "Después",
  mas_adelante: "Más adelante",
};

export const etiquetaEstadoAccion: Record<string, string> = {
  pendiente: "No iniciada",
  en_progreso: "En progreso",
  completada: "Completada",
  pausada: "Pausada",
};

export const etiquetaPrioridad: Record<string, string> = {
  alta: "Prioridad alta",
  media: "Prioridad media",
  baja: "Prioridad baja",
};
