/**
 * Home como orquestador del recorrido.
 *
 * Función pura que decide, con el estado real de la empresa, cuál es el
 * siguiente paso y qué otros pendientes existen. Usa la fuente única de
 * etapas (`journey/etapas.ts`: Preparar → Diagnosticar → Actuar → Seguir) y
 * nunca devuelve una ruta inexistente: todas las rutas están declaradas aquí.
 */

import type { SesionMVP } from "@/types";
import type { EtapaJourneyId } from "@/lib/journey/etapas";
import type { NecesidadInformacion } from "@/lib/suficiencia/tipos";
import type { ActividadWorkspace } from "@/lib/workspace/tipos";
import type { SeguimientoActividad } from "@/lib/seguimiento/tipos";
import type { Delegacion } from "@/lib/delegacion/tipos";
import type { RecomendacionApoyo } from "@/lib/apoyo-humano/tipos";
import { proximoHitoPendiente } from "@/lib/seguimiento/servicio";

export type TipoPaso =
  | "completar_perfil"
  | "continuar_diagnostico"
  | "profundizar_diagnostico"
  | "cerrar_diagnostico"
  | "aportar_evidencia"
  | "responder_aclaracion"
  | "revisar_resultados"
  | "corregir_entregable"
  | "continuar_workspace"
  | "iniciar_actividad"
  | "realizar_seguimiento"
  | "atender_delegacion"
  | "revisar_apoyo"
  | "conocer_plan"
  | "cerrar_plan"
  | "iniciar_seguimiento"
  | "medir_avance";

export interface PasoSugerido {
  tipo: TipoPaso;
  etapa: EtapaJourneyId;
  titulo: string;
  descripcion: string;
  /** Explicabilidad: por qué Pymapa propone este paso. */
  porQue: string;
  label: string;
  ruta: string;
}

export interface ContextoRecorrido {
  sesion: SesionMVP;
  necesidades: NecesidadInformacion[];
  actividades: ActividadWorkspace[];
  seguimientos: SeguimientoActividad[];
  delegaciones: Delegacion[];
  apoyos: RecomendacionApoyo[];
  /** Avance de la profundización del diagnóstico (Macroentrega 4.1). */
  profundizacion?: { total: number; completadas: number; pendientes: number };
  /** El diagnóstico ya fue cerrado formalmente y su informe emitido. */
  diagnosticoCerrado?: boolean;
  /** Transiciones narrativas que el usuario ya vivió (Macroentrega 5). */
  hitos?: { entradaActuar: boolean; cierrePlan: boolean; entradaSeguir: boolean };
  /**
   * Estado del Plan proyectado desde el Workspace (`lib/actuar/plan.ts`). Es la
   * única forma válida de saber si el Plan está cerrado: contar solo las
   * Actividades abiertas produce cierres prematuros.
   */
  plan?: { construido: boolean; total: number; validadas: number; cerrado: boolean };
}

/** Rutas que el orquestador puede proponer (evita rutas muertas). */
const RUTAS_VALIDAS = [
  "/perfil",
  "/moda-origen",
  "/diagnostico",
  "/diagnostico/cierre",
  "/diagnostico/listo",
  "/plan-de-accion/entrada",
  "/plan-de-accion/cierre",
  "/seguimiento/entrada",

  "/resultados",
  "/plan-de-accion",
  "/roadmap",
  "/dashboard",
  "/seguimiento",
  "/colaboracion",
  "/apoyo",
];

export function rutaSoportada(ruta: string): boolean {
  // Rutas con parámetro: se valida que el segmento final exista y sea único.
  const segmentos = ruta.split("/").filter((s) => s.length > 0);
  if (ruta.startsWith("/plan-de-accion/workspace/")) return segmentos.length === 3;
  if (ruta.startsWith("/seguimiento/")) return segmentos.length === 2;
  return RUTAS_VALIDAS.includes(ruta);
}

function rutaWorkspace(actividadId: string): string {
  return `/plan-de-accion/workspace/${actividadId}`;
}

/**
 * Todos los pendientes del recorrido, en orden de prioridad. El primero es el
 * "siguiente paso" del Home; el resto alimenta la lista "Qué tengo pendiente".
 */
/** Opciones de gobierno del CTA. */
export interface OpcionesPendientes {
  /**
   * Etapa activa del Journey (fuente única `journey/etapas.ts`). Cuando se
   * indica, el Home solo muestra trabajo accionable de esa etapa. Si la etapa
   * activa no tiene pendientes, se devuelve el resto para no dejar al usuario
   * sin siguiente paso.
   */
  etapaActiva?: EtapaJourneyId;
}

export function pendientesDelRecorrido(
  ctx: ContextoRecorrido,
  opciones: OpcionesPendientes = {}
): PasoSugerido[] {
  const pasos: PasoSugerido[] = [];
  const { sesion } = ctx;

  const perfilOk = sesion.perfilCompletado && sesion.empresa.nombre.trim().length > 0;
  if (!perfilOk) {
    pasos.push({
      tipo: "completar_perfil",
      etapa: "preparar",
      titulo: "Completa el perfil de tu empresa",
      descripcion:
        "Con el nombre, el sector y el tamaño podemos ordenar el recorrido y explicar cada paso.",
      porQue: "Sin contexto de la empresa, el diagnóstico no puede interpretarse.",
      label: "Completar perfil",
      ruta: "/perfil",
    });
  }

  const respondidasCuestionario =
    sesion.diagnostico.respondidasObligatorias ?? sesion.respuestas.length;
  const totalCuestionario = sesion.diagnostico.totalPreguntas ?? sesion.diagnostico.totalPasos;
  // El cuestionario se considera cerrado por sus propias respuestas: la
  // evidencia pendiente no lo reabre nunca (Macroentrega 4.1).
  const cuestionarioCompleto =
    sesion.diagnostico.estado === "completado" ||
    (totalCuestionario > 0 && respondidasCuestionario >= totalCuestionario);

  if (perfilOk && !cuestionarioCompleto) {
    const respondidas = respondidasCuestionario;
    const total = totalCuestionario;
    const iniciado = sesion.diagnostico.estado === "en_progreso";
    pasos.push({
      tipo: "continuar_diagnostico",
      etapa: "diagnosticar",
      titulo: iniciado ? "Continúa tu diagnóstico" : "Inicia tu diagnóstico",
      descripcion: iniciado
        ? `Has respondido ${respondidas} de ${total} preguntas.`
        : "Son preguntas breves sobre seis dominios. Puedes guardar y continuar después.",
      porQue: "El diagnóstico general es el instrumento base de todo el recorrido.",
      label: iniciado ? "Continuar diagnóstico" : "Comenzar diagnóstico",
      ruta: "/diagnostico",
    });
  }

  const necesidadesPendientes = ctx.necesidades.filter((n) => !n.resuelta);
  const avance = ctx.profundizacion ?? {
    total: necesidadesPendientes.length,
    completadas: 0,
    pendientes: necesidadesPendientes.length,
  };

  if (perfilOk && cuestionarioCompleto && necesidadesPendientes.length > 0) {
    const primera = necesidadesPendientes[0]!;
    const restantes = avance.pendientes || necesidadesPendientes.length;
    pasos.push({
      tipo: "profundizar_diagnostico",
      etapa: "diagnosticar",
      titulo:
        restantes === 1
          ? "Falta confirmar un último aspecto de tu diagnóstico"
          : `Falta confirmar ${restantes} aspectos de tu diagnóstico`,
      descripcion:
        primera.tipo === "evidencia"
          ? `Necesitamos un documento: ${primera.titulo}.`
          : `Necesitamos una aclaración: ${primera.titulo}.`,
      porQue: primera.porQue,
      label: avance.completadas > 0 ? "Continuar profundización" : "Comenzar profundización",
      ruta: "/diagnostico/cierre",
    });
  }

  if (
    perfilOk &&
    cuestionarioCompleto &&
    necesidadesPendientes.length === 0 &&
    ctx.diagnosticoCerrado === false
  ) {
    const huboProfundizacion = avance.total > 0;
    pasos.push({
      tipo: "cerrar_diagnostico",
      etapa: "diagnosticar",
      titulo: huboProfundizacion
        ? "Profundización completada: podemos cerrar tu diagnóstico"
        : "Ya tenemos la información necesaria para cerrar tu diagnóstico",
      descripcion: huboProfundizacion
        ? "Resolviste todo lo que necesitábamos confirmar. Podemos emitir tu informe."
        : "Respondiste todo el cuestionario y no queda información pendiente por confirmar.",
      porQue: huboProfundizacion
        ? "El cuestionario está completo y todas las profundizaciones solicitadas quedaron resueltas."
        : "El cuestionario está completo y no se detectó información pendiente por confirmar.",
      label: huboProfundizacion ? "Procesar y cerrar mi diagnóstico" : "Cerrar mi diagnóstico",
      ruta: "/diagnostico/listo",
    });
  }


  const hitos = ctx.hitos ?? { entradaActuar: false, cierrePlan: false, entradaSeguir: false };

  // Macroentrega 5 · Del diagnóstico a actividades concretas: transición
  // pedagógica antes de mostrar la lista de Actividades.
  // Si el usuario ya empezó a ejecutar, la transición pedagógica sobra.
  const ejecucionIniciada = ctx.actividades.some((a) => a.estado !== "pendiente");
  if (ctx.diagnosticoCerrado === true && !hitos.entradaActuar && !ejecucionIniciada) {
    pasos.push({
      tipo: "conocer_plan",
      etapa: "actuar",
      titulo: "Convertimos tu diagnóstico en actividades concretas",
      descripcion:
        "Tus hallazgos ya se transformaron en un conjunto priorizado de Actividades. Te explicamos cómo funcionan antes de empezar.",
      porQue: "Tu diagnóstico quedó cerrado: ahora comienza la etapa Actuar.",
      label: "Ver cómo se construyó mi plan",
      ruta: "/plan-de-accion/entrada",
    });
  }

  if (
    perfilOk &&
    sesion.diagnostico.estado === "completado" &&
    (!sesion.diagnostico.resultadosGenerados || sesion.resultados.length === 0)
  ) {
    pasos.push({
      tipo: "revisar_resultados",
      etapa: "diagnosticar",
      titulo: "Revisa tus resultados",
      descripcion: "Ya puedes ver hallazgos, prioridades y su explicación.",
      porQue: "El diagnóstico está completo y su interpretación aún no se consultó.",
      label: "Ver resultados",
      ruta: "/resultados",
    });
  }

  const porCorregir = ctx.actividades.find((a) => a.estado === "requiere_ajustes");
  if (porCorregir) {
    const ultima = porCorregir.historial[porCorregir.historial.length - 1];
    pasos.push({
      tipo: "corregir_entregable",
      etapa: "actuar",
      titulo: `Corrige el entregable de “${porCorregir.titulo}”`,
      descripcion: ultima?.revision.mensaje ?? "La revisión pidió ajustes concretos.",
      porQue:
        "La revisión del entregable identificó criterios sin cumplir; al corregirlos la actividad puede validarse.",
      label: "Ir al workspace",
      ruta: rutaWorkspace(porCorregir.id),
    });
  }

  const enCurso = ctx.actividades.find((a) => a.estado === "en_ejecucion");
  if (enCurso) {
    pasos.push({
      tipo: "continuar_workspace",
      etapa: "actuar",
      titulo: `Continúa “${enCurso.titulo}”`,
      descripcion: "Avanza los pasos del instrumento y entrega el resultado a revisión.",
      porQue: "La actividad ya está en ejecución con su instrumento metodológico abierto.",
      label: "Continuar actividad",
      ruta: rutaWorkspace(enCurso.id),
    });
  }

  const seguimientoConHito = ctx.seguimientos.find(
    (s) => s.estado !== "cerrado" && proximoHitoPendiente(s) !== null
  );
  if (seguimientoConHito) {
    const hito = proximoHitoPendiente(seguimientoConHito)!;
    pasos.push({
      tipo: "realizar_seguimiento",
      etapa: "seguir",
      titulo: `Registra el seguimiento de “${seguimientoConHito.actividadTitulo}”`,
      descripcion: `${hito.etiqueta} · indicador ${seguimientoConHito.indicador.nombre}.`,
      porQue:
        "La actividad quedó validada: ahora hay que comprobar si produjo el resultado esperado.",
      label: "Registrar medición",
      ruta: `/seguimiento/${seguimientoConHito.actividadId}`,
    });
  }

  const delegacion = ctx.delegaciones.find((d) => d.estado !== "incorporado");
  if (delegacion) {
    pasos.push({
      tipo: "atender_delegacion",
      etapa: delegacion.origen.tipo === "seguimiento" ? "seguir" : "diagnosticar",
      titulo:
        delegacion.estado === "pendiente_tercero"
          ? `Pendiente de ${delegacion.nombre} (${delegacion.area})`
          : `Incorpora la respuesta de ${delegacion.nombre}`,
      descripcion: delegacion.tarea,
      porQue:
        "Pymapa registró que esta información se pidió a la persona más competente de la empresa.",
      label: "Ver delegaciones",
      ruta: "/colaboracion",
    });
  }

  const apoyo = ctx.apoyos.find((a) => a.estado === "sugerida" || a.estado === "reservada");
  if (apoyo) {
    pasos.push({
      tipo: "revisar_apoyo",
      etapa: "actuar",
      titulo:
        apoyo.estado === "sugerida"
          ? "Pymapa recomienda apoyo especializado"
          : "Tienes una sesión de apoyo reservada (demo)",
      descripcion: apoyo.origen.referenciaTitulo,
      porQue: apoyo.porQue,
      label: "Revisar recomendación",
      ruta: "/apoyo",
    });
  }

  // Una Actividad del Plan que aún no se abrió también hay que empezarla.
  const porEmpezar = ctx.plan
    ? ctx.plan.total > ctx.actividades.length || ctx.actividades.some((a) => a.estado === "pendiente")
    : ctx.actividades.length === 0 || ctx.actividades.some((a) => a.estado === "pendiente");

  const pendiente = ctx.actividades.find((a) => a.estado === "pendiente");
  if (pendiente) {
    pasos.push({
      tipo: "iniciar_actividad",
      etapa: "actuar",
      titulo: `Comienza “${pendiente.titulo}”`,
      descripcion: "El workspace ya tiene su instrumento, sus pasos y su entregable.",
      porQue: "La actividad está priorizada y todavía no se comenzó a ejecutar.",
      label: "Iniciar actividad",
      ruta: rutaWorkspace(pendiente.id),
    });
  }

  // Mientras no se haya visto la entrada a Actuar, ese es el único paso: no se
  // ofrece "elegir actividad" en paralelo a la explicación del plan.
  if (perfilOk && sesion.resultados.length > 0 && !pendiente && porEmpezar && hitos.entradaActuar) {
    pasos.push({
      tipo: "iniciar_actividad",
      etapa: "actuar",
      titulo: "Elige la primera actividad de tu plan",
      descripcion: "Abre una ficha priorizada y trabájala con su instrumento.",
      porQue: "Ya hay prioridades interpretadas, pero ninguna actividad en ejecución.",
      label: "Ver plan de acción",
      ruta: "/plan-de-accion",
    });
  }

  // Macroentrega 5 · Cierre del Plan de Acción y entrada a la etapa Seguir.
  const validadas = ctx.actividades.filter((a) => a.estado === "validado");
  /**
   * El cierre del Plan exige que TODAS las Actividades del Plan estén
   * validadas, no solo las que el usuario llegó a abrir.
   */
  const todasValidadas = ctx.plan
    ? ctx.plan.cerrado
    : ctx.actividades.length > 0 && validadas.length === ctx.actividades.length;

  if (todasValidadas && !hitos.cierrePlan) {
    pasos.push({
      tipo: "cerrar_plan",
      etapa: "actuar",
      titulo: "Tus actividades iniciales quedaron validadas",
      descripcion:
        "Revisa el resumen de lo ejecutado y descarga tu Plan de Acción antes de pasar al seguimiento.",
      porQue: "Todas las actividades abiertas de tu plan alcanzaron el estado validado.",
      label: "Ver cierre de mi Plan de Acción",
      ruta: "/plan-de-accion/cierre",
    });
  }

  // Si ya existe un seguimiento con mediciones por registrar, el plan de
  // seguimiento ya está creado: no se ofrece "crearlo" en paralelo.
  if (
    validadas.length > 0 &&
    hitos.cierrePlan &&
    !hitos.entradaSeguir &&
    seguimientoConHito === undefined
  ) {
    pasos.push({
      tipo: "iniciar_seguimiento",
      etapa: "seguir",
      titulo: "Crea tu Plan de Seguimiento",
      descripcion:
        "Comprobaremos en el día 30, 60 y 90 si lo ejecutado produjo el resultado esperado.",
      porQue: "Ya hay actividades validadas: lo ejecutado debe medirse en el tiempo.",
      label: "Crear Plan de Seguimiento",
      ruta: "/seguimiento/entrada",
    });
  }

  const soportados = pasos.filter((p) => rutaSoportada(p.ruta));
  if (!opciones.etapaActiva) return soportados;
  const deLaEtapa = soportados.filter((p) => p.etapa === opciones.etapaActiva);
  return deLaEtapa.length > 0 ? deLaEtapa : soportados;
}

/** Paso único que encabeza el Home. */
export function siguientePasoOrquestado(
  ctx: ContextoRecorrido,
  opciones: OpcionesPendientes = {}
): PasoSugerido {
  const pendientes = pendientesDelRecorrido(ctx, opciones);
  return (
    pendientes[0] ?? {
      tipo: "medir_avance",
      etapa: "seguir",
      titulo: "Revisa tus indicadores y decide el siguiente ciclo",
      descripcion:
        "No hay pendientes abiertos: es el momento de mirar resultados y elegir la próxima prioridad.",
      porQue:
        "Todas las actividades, evidencias y seguimientos abiertos están al día.",
      label: "Ver indicadores",
      ruta: "/dashboard",
    }
  );
}
