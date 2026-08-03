import { useCallback, useEffect, useMemo, useState } from "react";
import { DEFINITION_VERSION } from "@/lib/diagnostico/definicion";
import { leerEstado } from "@/lib/diagnostico/repositorio";
import { ejecutarMotor } from "@/lib/motor/motor";
import { ultimaEjecucionDe, leerEjecuciones } from "@/lib/motor/repositorio";
import { escenarioPorId, escenariosResultados } from "@/lib/resultados/escenarios";
import { generarResultados } from "@/lib/resultados/generador";
import { registrarEvento } from "@/lib/analytics";
import type { SalidaMotor } from "@/lib/motor/tipos";
import type { ResultadoPyme } from "@/lib/resultados/tipos";

export type EstadoResultados = "cargando" | "vacio" | "error" | "listo";

const CLAVE_ESCENARIO = "pyme-digital:resultados:escenario";

/**
 * Servicio de resultados del POC-05: coordina la ejecución del motor, la
 * generación del resultado presentable y los estados de interfaz.
 * La lógica de negocio vive en src/lib/resultados; aquí solo se orquesta.
 */
export function useResultados() {
  const [estado, setEstado] = useState<EstadoResultados>("cargando");
  const [salida, setSalida] = useState<SalidaMotor | null>(null);
  const [escenarioId, setEscenarioId] = useState<string | null>(null);
  const [errorCodigo, setErrorCodigo] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);

  const cargar = useCallback((idEscenario: string | null) => {
    setEstado("cargando");
    setErrorCodigo(null);
    try {
      if (idEscenario) {
        const escenario = escenarioPorId(idEscenario);
        if (!escenario) {
          setEstado("vacio");
          return;
        }
        const ejecucion = ejecutarMotor({
          diagnosisId: escenario.diagnosisId,
          definitionVersion: DEFINITION_VERSION,
          respuestas: escenario.respuestas,
        });
        setSalida(ejecucion);
        setEstado("listo");
        return;
      }

      const diagnostico = leerEstado();
      const respuestas = diagnostico.respuestas;
      if (respuestas.length === 0) {
        setSalida(null);
        setEstado("vacio");
        return;
      }

      const guardada = ultimaEjecucionDe(diagnostico.sesion.id) ?? leerEjecuciones()[0] ?? null;
      const ejecucion =
        guardada ??
        ejecutarMotor({
          diagnosisId: diagnostico.sesion.id,
          companyId: diagnostico.sesion.companyProfileId,
          definitionVersion: DEFINITION_VERSION,
          respuestas,
        });
      setSalida(ejecucion);
      setEstado("listo");
    } catch (error) {
      console.warn("No se pudieron generar los resultados:", error);
      setErrorCodigo("RS-500");
      setEstado("error");
      registrarEvento("results_error", { errorCode: "RS-500" });
    }
  }, []);

  useEffect(() => {
    let inicial: string | null = null;
    try {
      inicial = window.localStorage.getItem(CLAVE_ESCENARIO);
    } catch {
      inicial = null;
    }
    setEscenarioId(inicial);
    cargar(inicial);
  }, [cargar, intento]);

  const resultado = useMemo<ResultadoPyme | null>(() => {
    if (!salida) return null;
    try {
      return generarResultados(salida);
    } catch (error) {
      console.warn("Falló la generación del resultado presentable:", error);
      return null;
    }
  }, [salida]);

  const aplicarEscenario = useCallback(
    (id: string | null) => {
      try {
        if (id) window.localStorage.setItem(CLAVE_ESCENARIO, id);
        else window.localStorage.removeItem(CLAVE_ESCENARIO);
      } catch {
        /* el escenario sigue disponible en memoria */
      }
      setEscenarioId(id);
      cargar(id);
      registrarEvento("results_scenario_loaded", { scenarioId: id ?? "propio" });
    },
    [cargar]
  );

  const reintentar = useCallback(() => setIntento((valor) => valor + 1), []);

  return {
    estado: resultado ? estado : estado === "listo" ? "vacio" : estado,
    resultado,
    salida,
    escenarioId,
    escenarios: escenariosResultados,
    errorCodigo,
    aplicarEscenario,
    reintentar,
  };
}
