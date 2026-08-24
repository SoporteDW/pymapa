import { useCallback, useEffect, useMemo, useState } from "react";

import { useDiagnostico } from "./use-diagnostico";
import { useDelegacion } from "./use-delegacion";
import {
  alternarAplazada,
  guardarMarcas,
  leerMarcas,
  marcasVacias,
  type MarcasCuestionario,
} from "@/lib/diagnostico/marcas-repositorio";
import { resumenCuestionario } from "@/lib/diagnostico/pendientes";
import { respuestasVigentes } from "@/lib/diagnostico/validacion";

/**
 * Macroentrega 5 · Cuestionario interrumpible.
 *
 * Reutiliza `useDiagnostico` (respuestas) y `useDelegacion` (preguntas pedidas a
 * otras personas) y añade solo la marca de "aplazada". Una pregunta aplazada o
 * delegada no bloquea las demás, pero el cuestionario no queda completo hasta
 * responderlas.
 */
export function useCuestionario() {
  const diagnostico = useDiagnostico();
  const { delegaciones, hidratado: delegacionesHidratadas } = useDelegacion();
  const [marcas, setMarcas] = useState<MarcasCuestionario>(marcasVacias);
  const [hidratado, setHidratado] = useState(false);

  useEffect(() => {
    setMarcas(leerMarcas());
    setHidratado(true);
  }, []);

  const delegadas = useMemo(() => {
    const mapa: Record<string, string> = {};
    for (const delegacion of delegaciones) {
      if (delegacion.origen.tipo !== "pregunta") continue;
      if (delegacion.estado === "incorporado") continue;
      mapa[delegacion.origen.referenciaId] = delegacion.nombre;
    }
    return mapa;
  }, [delegaciones]);

  const respondidas = useMemo(
    () => respuestasVigentes(diagnostico.respuestas).map((r) => r.questionId),
    [diagnostico.respuestas]
  );

  const resumen = useMemo(
    () =>
      resumenCuestionario({
        respondidas,
        aplazadas: marcas.aplazadas,
        delegadas,
        preguntaActual: diagnostico.sesion.currentQuestionId,
      }),
    [respondidas, marcas.aplazadas, delegadas, diagnostico.sesion.currentQuestionId]
  );

  const alternarAplazamiento = useCallback((preguntaId: string) => {
    setMarcas((previo) => guardarMarcas(alternarAplazada(previo, preguntaId)));
  }, []);

  const estaAplazada = useCallback(
    (preguntaId: string) => marcas.aplazadas.includes(preguntaId),
    [marcas.aplazadas]
  );

  return {
    hidratado: hidratado && diagnostico.isHydrated && delegacionesHidratadas,
    resumen,
    aplazadas: marcas.aplazadas,
    delegadas,
    alternarAplazamiento,
    estaAplazada,
  };
}
