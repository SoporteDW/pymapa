/**
 * Home como orquestador del recorrido.
 *
 * Función pura que decide, con el estado real de la empresa, cuál es el
 * siguiente paso y qué otros pendientes existen. Conserva las cinco etapas
 * (Preparar → Diagnosticar → Interpretar → Actuar → Seguir) y nunca devuelve
 * una ruta inexistente: todas las rutas están declaradas aquí.
 */

import type { EtapaId, SesionMVP } from "@/types";
import type { NecesidadInformacion } from "@/lib/suficiencia/tipos";
import type { ActividadWorkspace } from "@/lib/workspace/tipos";
import type { SeguimientoActividad } from "@/lib/seguimiento/tipos";
import type { Delegacion } from "@/lib/delegacion/tipos";
import type { RecomendacionApoyo } from "@/lib/apoyo-humano/tipos";
import { proximoHitoPendiente } from "@/lib/seguimiento/servicio";

export type TipoPaso =
  | "completar_perfil"
  | "continuar_diagnostico"
  | "aportar_evidencia"
  | "responder_aclaracion"
  | "revisar_resultados"
  | "corregir_entregable"
  | "continuar_workspace"
  | "iniciar_actividad"
  | "realizar_seguimiento"
  | "atender_delegacion"
  | "revisar_apoyo"
  | "medir_avance";

export interface PasoSugerido {
  tipo: TipoPaso;
  etapa: EtapaId;
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
}

/** Rutas que el orquestador puede proponer (evita rutas muertas). */
const RUTAS_VALIDAS = [
  "/perfil",
  "/moda-origen",
  "/diagnostico",
  "/diagnostico/cierre",
  "/diagnostico/listo",

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
export function pendientesDelRecorrido(ctx: ContextoRecorrido): PasoSugerido[] {
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

  if (perfilOk && sesion.diagnostico.estado !== "completado") {
    const respondidas = sesion.diagnostico.respondidasObligatorias ?? sesion.respuestas.length;
    const total = sesion.diagnostico.totalPreguntas ?? sesion.diagnostico.totalPasos;
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

  const evidencia = ctx.necesidades.find((n) => n.tipo === "evidencia" && !n.resuelta);
  if (evidencia) {
    pasos.push({
      tipo: "aportar_evidencia",
      etapa: "diagnosticar",
      titulo: `Aporta la evidencia: ${evidencia.titulo}`,
      descripcion:
        "Con este documento Pymapa puede cerrar el diagnóstico en lugar de dejarlo preliminar.",
      porQue: evidencia.porQue,
      label: "Aportar evidencia",
      ruta: "/diagnostico/cierre",
    });
  }

  const aclaracion = ctx.necesidades.find((n) => n.tipo === "aclaracion" && !n.resuelta);
  if (aclaracion) {
    pasos.push({
      tipo: "responder_aclaracion",
      etapa: "diagnosticar",
      titulo: "Responde una aclaración de Pymapa",
      descripcion: aclaracion.titulo,
      porQue: aclaracion.porQue,
      label: "Responder aclaración",
      ruta: "/diagnostico/cierre",
    });
  }

  if (
    perfilOk &&
    sesion.diagnostico.estado === "completado" &&
    (!sesion.diagnostico.resultadosGenerados || sesion.resultados.length === 0)
  ) {
    pasos.push({
      tipo: "revisar_resultados",
      etapa: "interpretar",
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

  if (perfilOk && sesion.resultados.length > 0 && ctx.actividades.length === 0) {
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

  return pasos.filter((p) => rutaSoportada(p.ruta));
}

/** Paso único que encabeza el Home. */
export function siguientePasoOrquestado(ctx: ContextoRecorrido): PasoSugerido {
  const pendientes = pendientesDelRecorrido(ctx);
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
