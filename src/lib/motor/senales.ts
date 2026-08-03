/**
 * MC-02 · Cálculo de señales (POC-04, secciones 4, 7 y 9).
 * Convierte respuestas normalizadas en señales elementales con polaridad,
 * intensidad, evidencia y confianza. No emite conclusiones.
 */

import { capacidadDePregunta, paresContradiccion } from "./catalogo";
import { textoPregunta } from "./normalizacion";
import type {
  Intensidad,
  ParContradiccion,
  Polaridad,
  RespuestaNormalizada,
  Senal,
  TipoSenal,
} from "./tipos";

interface PerfilSenal {
  tipo: TipoSenal;
  polaridad: Polaridad;
  intensidad: Intensidad;
  confianza: number;
}

/** Correspondencia escala 1-5 → señal elemental. */
function perfilDeValor(valor: number): PerfilSenal {
  switch (valor) {
    case 1:
      return { tipo: "brecha", polaridad: -1, intensidad: 3, confianza: 0.9 };
    case 2:
      return { tipo: "brecha", polaridad: -1, intensidad: 2, confianza: 0.9 };
    case 3:
      return { tipo: "oportunidad", polaridad: 0, intensidad: 1, confianza: 0.8 };
    case 4:
      return { tipo: "fortaleza", polaridad: 1, intensidad: 2, confianza: 0.9 };
    default:
      return { tipo: "fortaleza", polaridad: 1, intensidad: 3, confianza: 0.9 };
  }
}

export interface SalidaSenales {
  senales: Senal[];
  inconsistencias: ParContradiccion[];
}

export function calcularSenales(respuestas: RespuestaNormalizada[]): SalidaSenales {
  const valorDe = new Map<string, number | null>();
  for (const r of respuestas) {
    if (r.puntuable && (r.bandera === "ok" || r.bandera === "duplicada")) {
      valorDe.set(r.questionId, r.valorNormalizado === null ? null : r.valorNormalizado / 25 + 1);
    }
  }

  const inconsistencias = paresContradiccion.filter((par) => {
    const baja = valorDe.get(par.preguntaBaja);
    const alta = valorDe.get(par.preguntaAlta);
    if (baja === undefined || alta === undefined || baja === null || alta === null) return false;
    return baja <= par.umbralBajo && alta >= par.umbralAlto;
  });

  const preguntasEnConflicto = new Set(
    inconsistencias.flatMap((par) => [par.preguntaBaja, par.preguntaAlta])
  );

  const senales: Senal[] = [];

  for (const respuesta of respuestas) {
    if (!respuesta.puntuable) continue;
    const capacidad = capacidadDePregunta(respuesta.questionId);
    const base = {
      dimensionId: respuesta.dimensionId ?? "",
      capacidadId: capacidad?.id ?? null,
      evidencia: [respuesta.questionId],
    };

    if (respuesta.bandera === "no_aplica") continue;

    if (respuesta.bandera !== "ok" && respuesta.bandera !== "duplicada") {
      senales.push({
        id: `S-${respuesta.questionId}`,
        tipo: "sin_evidencia",
        ...base,
        polaridad: 0,
        intensidad: 1,
        confianza: 0,
        valorNormalizado: null,
        descripcion: `Sin evidencia suficiente sobre: ${textoPregunta(respuesta.questionId)}`,
      });
      continue;
    }

    const valor = (respuesta.valorNormalizado ?? 0) / 25 + 1;
    const perfil = perfilDeValor(valor);
    const penalizada = preguntasEnConflicto.has(respuesta.questionId)
      ? Math.max(0, perfil.confianza - 0.35)
      : perfil.confianza;

    senales.push({
      id: `S-${respuesta.questionId}`,
      tipo: perfil.tipo,
      ...base,
      polaridad: perfil.polaridad,
      intensidad: perfil.intensidad,
      confianza: Math.round(penalizada * 100) / 100,
      valorNormalizado: respuesta.valorNormalizado,
      descripcion: `${textoPregunta(respuesta.questionId)} → valor ${valor} de 5.`,
    });
  }

  for (const par of inconsistencias) {
    senales.push({
      id: `S-${par.id}`,
      tipo: "inconsistencia",
      dimensionId: par.dimensionId,
      capacidadId: null,
      polaridad: 0,
      intensidad: 2,
      evidencia: [par.preguntaBaja, par.preguntaAlta],
      confianza: 0.6,
      valorNormalizado: null,
      descripcion: par.descripcion,
    });
  }

  return { senales, inconsistencias };
}
