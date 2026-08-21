import { useCallback, useEffect, useMemo, useState } from "react";

import { leerEstado } from "@/lib/diagnostico/repositorio";
import { contarObligatoriasRespondidas } from "@/lib/diagnostico/validacion";
import { totalPreguntasObligatorias } from "@/lib/diagnostico/definicion";
import {
  diagnosticoCerrado,
  leerCierre,
  registrarCierre,
  cierreVacio,
  type CierreDiagnostico,
} from "@/lib/diagnostico/cierre-repositorio";
import { estadoJourneyDiagnostico, type EstadoJourney } from "@/lib/diagnostico/estado-journey";
import { useEvidencias } from "./use-evidencias";

/**
 * Macroentrega 4.1 · Estado único del journey del diagnóstico.
 *
 * Reúne el avance real del cuestionario (28 obligatorias), la profundización
 * pendiente y el cierre formal, y delega la decisión en una función pura. La
 * interfaz solo pinta el estado y su único CTA.
 */
export function useEstadoDiagnostico() {
  const { hidratado: evidenciasHidratadas, suficiencia, registro } = useEvidencias();
  const [respondidas, setRespondidas] = useState(0);
  const [diagnosticoId, setDiagnosticoId] = useState<string | null>(null);
  const [cierre, setCierre] = useState<CierreDiagnostico>(cierreVacio);
  const [hidratado, setHidratado] = useState(false);

  useEffect(() => {
    try {
      const estado = leerEstado();
      setRespondidas(contarObligatoriasRespondidas(estado.respuestas));
      setDiagnosticoId(estado.sesion.id ?? null);
    } catch (error) {
      console.warn("No se pudo leer el avance del diagnóstico:", error);
    }
    setCierre(leerCierre());
    setHidratado(true);
  }, [registro.actualizadoEn]);

  const necesidades = useMemo(
    () => suficiencia.dominios.flatMap((d) => d.necesidades),
    [suficiencia.dominios]
  );

  const cerrado = diagnosticoCerrado(cierre, diagnosticoId);

  const journey: EstadoJourney = useMemo(
    () =>
      estadoJourneyDiagnostico({
        respondidas,
        total: totalPreguntasObligatorias,
        necesidadesTotales: necesidades.length,
        necesidadesResueltas: necesidades.filter((n) => n.resuelta).length,
        cerrado,
      }),
    [respondidas, necesidades, cerrado]
  );

  /** Registra el cierre formal del diagnóstico (emisión del informe). */
  const cerrarDiagnostico = useCallback(() => {
    setCierre(registrarCierre(diagnosticoId));
  }, [diagnosticoId]);

  return {
    hidratado: hidratado && evidenciasHidratadas,
    journey,
    suficiencia,
    necesidades,
    cerrado,
    cerrarDiagnostico,
  };
}
