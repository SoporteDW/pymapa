import { useCallback, useEffect, useMemo, useState } from "react";
import { DEFINITION_VERSION } from "@/lib/diagnostico/definicion";
import { ejecutarMotor, serializarSalida } from "@/lib/motor/motor";
import {
  guardarEjecucion,
  leerEjecuciones,
  limpiarEjecuciones,
  ultimaEjecucionDe,
} from "@/lib/motor/repositorio";
import { registrarEvento } from "@/lib/analytics";
import type { DiagnosticAnswer } from "@/lib/diagnostico/tipos";
import type { SalidaMotor } from "@/lib/motor/tipos";

/**
 * Servicio de ejecución del Motor de Conocimiento (POC-04).
 * Mantiene la lógica del motor separada de la interfaz: aquí solo se coordina
 * la ejecución, la persistencia del historial y los estados visibles.
 */
export function useMotor() {
  const [ejecuciones, setEjecuciones] = useState<SalidaMotor[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [ejecutando, setEjecutando] = useState(false);
  const [errorMotor, setErrorMotor] = useState<string | null>(null);

  useEffect(() => {
    setEjecuciones(leerEjecuciones());
    setIsHydrated(true);
  }, []);

  const ultima = useMemo(() => ejecuciones[0] ?? null, [ejecuciones]);

  const ejecutar = useCallback(
    (entrada: { diagnosisId: string; respuestas: DiagnosticAnswer[]; companyId?: string | null }) => {
      setEjecutando(true);
      setErrorMotor(null);
      try {
        const salida = ejecutarMotor({
          diagnosisId: entrada.diagnosisId,
          companyId: entrada.companyId ?? null,
          definitionVersion: DEFINITION_VERSION,
          respuestas: entrada.respuestas,
        });
        setEjecuciones(guardarEjecucion(salida));
        registrarEvento("engine_executed", {
          executionId: salida.metadata.executionId,
          ruleSetVersion: salida.metadata.ruleSetVersion,
          status: salida.metadata.status,
          coverage: salida.quality.coverage,
          findings: salida.findings.length,
        });
        return salida;
      } catch (error) {
        console.warn("Falló la ejecución del motor de conocimiento:", error);
        setErrorMotor("MC-500");
        registrarEvento("engine_error", { errorCode: "MC-500" });
        return null;
      } finally {
        setEjecutando(false);
      }
    },
    []
  );

  const buscarPorDiagnostico = useCallback(
    (diagnosisId: string) => ultimaEjecucionDe(diagnosisId) ?? null,
    []
  );

  const exportar = useCallback((salida: SalidaMotor) => serializarSalida(salida), []);

  const limpiar = useCallback(() => {
    limpiarEjecuciones();
    setEjecuciones([]);
    setErrorMotor(null);
  }, []);

  return {
    isHydrated,
    ejecutando,
    errorMotor,
    ejecuciones,
    ultima,
    ejecutar,
    buscarPorDiagnostico,
    exportar,
    limpiar,
  };
}
