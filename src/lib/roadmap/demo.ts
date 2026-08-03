/**
 * Roadmap de demostración (POC-06, sección 16).
 * Doce acciones distribuidas en tres fases, con estados variados, dos
 * dependencias, dos acciones sin responsable y una acción vencida.
 * Son datos simulados y reemplazables: la interfaz no depende de ellos.
 */

import { taxonomia } from "@/lib/motor/catalogo";
import { plantillasPorCapacidad } from "@/lib/resultados/plantillas";
import { duracionEstimada, etiquetaEsfuerzo } from "@/lib/resultados/fichas";
import { desplazamientoFase, duracionEnDias, fasesRoadmap } from "./fases";
import { hoyISO, sumarDias } from "./fechas";
import { ordenarSecuencia } from "./generador";
import { estadoGeneralDe } from "./avance";
import {
  ROADMAP_VERSION,
  type AccionRoadmap,
  type Bloqueo,
  type EstadoAccionRoadmap,
  type FaseId,
  type RegistroAvance,
  type Roadmap,
} from "./tipos";
import type { EsfuerzoFicha, NivelPrioridad } from "@/lib/resultados/tipos";

export const EXECUTION_ID_DEMO = "demo-roadmap-poc06";

interface SemillaDemo {
  clave: string;
  fase: FaseId;
  prioridad: NivelPrioridad;
  esfuerzo: EsfuerzoFicha;
  estado: EstadoAccionRoadmap;
  responsable: string;
  avance: number;
  pasosCompletados: number;
  dependeDe?: string;
  /** Días de desplazamiento respecto a la fecha base; negativo = vencida. */
  desfase?: number;
  sinFecha?: boolean;
  bloqueo?: { tipo: Bloqueo["tipo"]; descripcion: string };
  motivoDescarte?: string;
  nota?: string;
  evidencia?: string;
}

const semillas: SemillaDemo[] = [
  {
    clave: "CAP-D01-01",
    fase: "ahora",
    prioridad: "critica",
    esfuerzo: "bajo",
    estado: "COMPLETADA",
    responsable: "Ana Restrepo",
    avance: 100,
    pasosCompletados: 99,
    nota: "Objetivos aprobados en el comité de dirección.",
    evidencia: "acta-objetivos-digitales.pdf",
  },
  {
    clave: "CAP-D06-01",
    fase: "ahora",
    prioridad: "critica",
    esfuerzo: "bajo",
    estado: "EN_CURSO",
    responsable: "Camilo Duarte",
    avance: 50,
    pasosCompletados: 2,
    nota: "Ya se inventariaron los accesos de los sistemas principales.",
  },
  {
    clave: "CAP-D04-01",
    fase: "ahora",
    prioridad: "alta",
    esfuerzo: "medio",
    estado: "EN_CURSO",
    responsable: "Lucía Pardo",
    avance: 25,
    pasosCompletados: 1,
    desfase: -50,
    nota: "La consolidación tomó más tiempo del previsto.",
  },
  {
    clave: "CAP-D02-01",
    fase: "ahora",
    prioridad: "alta",
    esfuerzo: "medio",
    estado: "BLOQUEADA",
    responsable: "Jorge Medina",
    avance: 25,
    pasosCompletados: 1,
    bloqueo: {
      tipo: "decision",
      descripcion:
        "Falta decidir qué herramienta usará el equipo comercial para el registro de clientes.",
    },
  },
  {
    clave: "CAP-D03-01",
    fase: "ahora",
    prioridad: "alta",
    esfuerzo: "bajo",
    estado: "LISTA",
    responsable: "",
    avance: 0,
    pasosCompletados: 0,
  },
  {
    clave: "CAP-D05-01",
    fase: "proximamente",
    prioridad: "media",
    esfuerzo: "medio",
    estado: "PENDIENTE",
    responsable: "Marta Ochoa",
    avance: 0,
    pasosCompletados: 0,
    dependeDe: "CAP-D01-01",
  },
  {
    clave: "CAP-D02-02",
    fase: "proximamente",
    prioridad: "media",
    esfuerzo: "medio",
    estado: "PENDIENTE",
    responsable: "Jorge Medina",
    avance: 0,
    pasosCompletados: 0,
    dependeDe: "CAP-D02-01",
  },
  {
    clave: "CAP-D04-02",
    fase: "proximamente",
    prioridad: "alta",
    esfuerzo: "medio",
    estado: "PAUSADA",
    responsable: "Lucía Pardo",
    avance: 25,
    pasosCompletados: 1,
    nota: "Se pausó hasta cerrar la centralización de la información.",
  },
  {
    clave: "CAP-D03-02",
    fase: "proximamente",
    prioridad: "media",
    esfuerzo: "alto",
    estado: "PENDIENTE",
    responsable: "",
    avance: 0,
    pasosCompletados: 0,
    sinFecha: true,
  },
  {
    clave: "CAP-D01-02",
    fase: "mas_adelante",
    prioridad: "media",
    esfuerzo: "bajo",
    estado: "PENDIENTE",
    responsable: "Ana Restrepo",
    avance: 0,
    pasosCompletados: 0,
  },
  {
    clave: "CAP-D05-02",
    fase: "mas_adelante",
    prioridad: "baja",
    esfuerzo: "bajo",
    estado: "PENDIENTE",
    responsable: "Marta Ochoa",
    avance: 0,
    pasosCompletados: 0,
  },
  {
    clave: "CAP-D06-02",
    fase: "mas_adelante",
    prioridad: "baja",
    esfuerzo: "alto",
    estado: "PENDIENTE",
    responsable: "Camilo Duarte",
    avance: 0,
    pasosCompletados: 0,
  },
];

const etiquetaPrioridadDemo: Record<NivelPrioridad, string> = {
  critica: "Crítica",
  alta: "Alta",
  media: "Media",
  baja: "Baja",
};

const scorePrioridad: Record<NivelPrioridad, number> = {
  critica: 4.6,
  alta: 4.1,
  media: 3.2,
  baja: 2.3,
};

function idDe(clave: string): string {
  const dimension = clave.slice(4, 7);
  return `ACC-AC-${dimension}-${clave.replace(/^CAP-/, "")}`;
}

export function construirRoadmapDemo(hoy = hoyISO()): Roadmap {
  const creado = new Date().toISOString();
  const historial: RegistroAvance[] = [];
  const bloqueos: Bloqueo[] = [];

  const acciones: AccionRoadmap[] = semillas.map((semilla, indice) => {
    const plantilla =
      plantillasPorCapacidad.find((p) => p.clave === semilla.clave) ?? plantillasPorCapacidad[0]!;
    const dimensionId = semilla.clave.slice(4, 7);
    const dimensionNombre = taxonomia[dimensionId] ?? dimensionId;
    const dias = duracionEnDias(semilla.esfuerzo);
    const base = sumarDias(hoy, desplazamientoFase(semilla.fase) + (semilla.desfase ?? 0));
    const fechaInicio = semilla.sinFecha ? null : base;
    const fechaObjetivo = semilla.sinFecha ? null : sumarDias(base, dias);
    const id = idDe(semilla.clave);
    const fichaId = `AC-${dimensionId}-${semilla.clave.replace(/^CAP-/, "")}`;

    const checklist = plantilla.pasos.map((texto, posicion) => ({
      id: `${fichaId}-P${posicion + 1}`,
      texto,
      completado: posicion < semilla.pasosCompletados,
    }));

    if (semilla.bloqueo) {
      bloqueos.push({
        id: `BLQ-DEMO-${indice + 1}`,
        accionId: id,
        tipo: semilla.bloqueo.tipo,
        descripcion: semilla.bloqueo.descripcion,
        fechaDeteccion: creado,
        estado: "abierto",
        resolucion: null,
        fechaResolucion: null,
      });
    }

    historial.push({
      id: `HIS-DEMO-${indice + 1}-CREACION`,
      accionId: id,
      fecha: creado,
      usuario: "Sistema",
      tipo: "creacion",
      estadoAnterior: null,
      estadoNuevo: "PENDIENTE",
      porcentaje: 0,
      comentario: `Acción generada desde la ficha ${fichaId}.`,
      evidenciaId: null,
    });

    if (semilla.estado !== "PENDIENTE") {
      historial.push({
        id: `HIS-DEMO-${indice + 1}-ESTADO`,
        accionId: id,
        fecha: creado,
        usuario: "Tú",
        tipo: "cambio_estado",
        estadoAnterior: "PENDIENTE",
        estadoNuevo: semilla.estado,
        porcentaje: semilla.avance,
        comentario: semilla.bloqueo
          ? `Bloqueo registrado: ${semilla.bloqueo.descripcion}`
          : `Estado actualizado a ${semilla.estado}.`,
        evidenciaId: null,
      });
    }

    const accion: AccionRoadmap = {
      id,
      fichaAccionId: fichaId,
      hallazgoId: `F-${dimensionId}-DEMO`,
      titulo: plantilla.titulo,
      objetivo: plantilla.impactoEsperado,
      porQueImporta:
        "Es una de las brechas señaladas por el diagnóstico simulado de demostración.",
      prioridadOrigen: semilla.prioridad,
      prioridadOrigenLabel: etiquetaPrioridadDemo[semilla.prioridad],
      prioridadScore: scorePrioridad[semilla.prioridad],
      prioridadOperativa: semilla.prioridad,
      impacto: plantilla.impactoEsperado,
      esfuerzo: semilla.esfuerzo,
      duracion: duracionEstimada(semilla.esfuerzo),
      duracionDias: dias,
      responsable: semilla.responsable,
      responsableSugerido: plantilla.responsable,
      fechaInicio,
      fechaObjetivo,
      fechaInicioOriginal: fechaInicio,
      fechaObjetivoOriginal: fechaObjetivo,
      faseId: semilla.fase,
      faseOriginal: semilla.fase,
      orden: indice + 1,
      estado: semilla.estado,
      avance: semilla.avance,
      checklist,
      indicadores: plantilla.indicadores,
      dependencias: semilla.dependeDe ? [idDe(semilla.dependeDe)] : [],
      notas: semilla.nota
        ? [{ id: `NOT-DEMO-${indice + 1}`, texto: semilla.nota, fecha: creado, autor: "Tú" }]
        : [],
      evidencias: semilla.evidencia
        ? [
            {
              id: `EVI-DEMO-${indice + 1}`,
              tipo: "archivo",
              descripcion: "Acta de aprobación",
              referencia: semilla.evidencia,
              fecha: creado,
            },
          ]
        : [],
      motivoDescarte: semilla.motivoDescarte ?? null,
      requiereValidacion: false,
      origen: {
        fichaAccionId: fichaId,
        hallazgoId: `F-${dimensionId}-DEMO`,
        hallazgoTitulo: `Brecha detectada en ${dimensionNombre.toLowerCase()}`,
        prioridadId: `P-${dimensionId}-DEMO`,
        dimensionId,
        dimensionNombre,
        capacidadNombre: plantilla.clave,
        reglas: [`R-${dimensionId}-01`],
        preguntas: [`Q${dimensionId.slice(1)}`],
        executionId: EXECUTION_ID_DEMO,
      },
      actualizadaEn: creado,
    };
    return accion;
  });

  const roadmap: Roadmap = {
    id: "RM-DEMO",
    empresaId: "empresa-demo",
    executionId: EXECUTION_ID_DEMO,
    version: ROADMAP_VERSION,
    fechaCreacion: creado,
    fechaActualizacion: creado,
    estadoGeneral: "en_ejecucion",
    horizonte: "6 meses",
    fases: fasesRoadmap,
    acciones: ordenarSecuencia(acciones),
    bloqueos,
    historial,
    esDemo: true,
  };

  return { ...roadmap, estadoGeneral: estadoGeneralDe(roadmap) };
}

/** Etiqueta de esfuerzo reutilizada en la interfaz del Roadmap. */
export const etiquetaEsfuerzoRoadmap = etiquetaEsfuerzo;
