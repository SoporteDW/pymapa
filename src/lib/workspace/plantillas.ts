/**
 * B4 · Adaptadores: actividad existente → plantilla de workspace.
 *
 * Aquí se conserva la trazabilidad. No se crean actividades nuevas: se traduce
 * lo que ya produjo el diagnóstico general (Ficha de Acción) o el diagnóstico
 * especializado (Iniciativa del Knowledge Pack).
 */

import { nombreDominio } from "@/lib/dominios/registro";
import type { FichaAccion } from "@/lib/resultados/tipos";
import type { IniciativaKB } from "@/lib/kb/tipos";
import type { PlantillaActividad } from "./tipos";

export function plantillaDesdeFicha(ficha: FichaAccion): PlantillaActividad {
  return {
    id: ficha.id,
    titulo: ficha.title,
    objetivo: ficha.impactExpected,
    porQue: ficha.whyItMatters,
    origen: {
      tipo: "ficha_general",
      fuente: `Diagnóstico general · ${ficha.sourceRefs.catalogVersion}`,
      dominioId: ficha.dimensionId,
      dominioNombre: ficha.dimensionNombre,
      referencias: [
        ...ficha.sourceRefs.hallazgos.map((h) => h.id),
        ...ficha.sourceRefs.reglas,
        ...ficha.sourceRefs.preguntas,
      ],
    },
    pasosSugeridos: ficha.steps,
    senalesProfundizacion: [ficha.title, ficha.problem, ficha.dimensionNombre],
  };
}

export function plantillaDesdeIniciativa(iniciativa: IniciativaKB): PlantillaActividad {
  const { accion, origen } = iniciativa;
  return {
    id: accion.id,
    titulo: accion.titulo,
    objetivo: origen.objetivo || accion.proposito,
    porQue: accion.porQueImporta,
    origen: {
      tipo: "iniciativa_kb",
      fuente: `${origen.packId} ${origen.packVersion}`,
      dominioId: accion.dimensionId,
      dominioNombre: nombreDominio(accion.dimensionId),
      referencias: [origen.reglaId, origen.hallazgoId, origen.recomendacionId, ...origen.preguntas],
    },
    pasosSugeridos: accion.pasos,
    senalesProfundizacion: [accion.titulo, accion.proposito, origen.objetivo],
  };
}
