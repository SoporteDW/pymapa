import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  definicionDiagnostico,
  obtenerPregunta,
  preguntasEnOrden,
  totalPreguntasObligatorias,
} from "@/lib/diagnostico/definicion";
import {
  contarObligatoriasRespondidas,
  pendientesAgrupados,
  primeraPendiente,
  validarConfiguracion,
  valorValido,
} from "@/lib/diagnostico/validacion";
import { calcularResultado } from "@/lib/diagnostico/calculo";
import {
  crearSesionDiagnostico,
  estadoInicial,
  guardarEstado,
  leerEstado,
  limpiarEstado,
} from "@/lib/diagnostico/repositorio";
import type {
  DiagnosticAnswer,
  DiagnosticResult,
  EstadoDiagnosticoAlmacenado,
  EstadoGuardado,
  ValorRespuesta,
} from "@/lib/diagnostico/tipos";
import { registrarEvento } from "@/lib/analytics";
import { useSesion } from "./use-sesion";

/**
 * Servicio de sesión, respuestas, validación, cálculo y persistencia del
 * diagnóstico (POC-03). Mantiene el estado en memoria incluso si el
 * almacenamiento falla y ofrece reintento explícito.
 */
export function useDiagnostico() {
  const [estado, setEstado] = useState<EstadoDiagnosticoAlmacenado>(estadoInicial);
  const [isHydrated, setIsHydrated] = useState(false);
  const [estadoGuardado, setEstadoGuardado] = useState<EstadoGuardado>("idle");
  const [errorCalculo, setErrorCalculo] = useState<string | null>(null);
  const pendienteDeGuardar = useRef<EstadoDiagnosticoAlmacenado | null>(null);
  const calculando = useRef(false);
  const { sincronizarDiagnostico } = useSesion();

  const problemasConfiguracion = useMemo(() => validarConfiguracion(definicionDiagnostico), []);
  const configuracionValida = problemasConfiguracion.length === 0;

  useEffect(() => {
    try {
      setEstado(leerEstado());
    } catch (error) {
      console.warn("No se pudo leer el diagnóstico guardado:", error);
      setEstadoGuardado("error");
      registrarEvento("diagnostic_error", { errorCode: "STO-001", stage: "lectura" });
    }
    setIsHydrated(true);
  }, []);

  /** Escribe en el repositorio conservando el estado en memoria si falla. */
  const persistir = useCallback(
    (siguiente: EstadoDiagnosticoAlmacenado) => {
      setEstado(siguiente);
      setEstadoGuardado("saving");
      try {
        guardarEstado(siguiente);
        pendienteDeGuardar.current = null;
        setEstadoGuardado("saved");
      } catch (error) {
        console.warn("No se pudo guardar el diagnóstico:", error);
        pendienteDeGuardar.current = siguiente;
        setEstadoGuardado("error");
        registrarEvento("diagnostic_error", { errorCode: "STO-002", stage: "guardado" });
      }
      const respondidas = contarObligatoriasRespondidas(siguiente.respuestas);
      sincronizarDiagnostico({
        estado:
          siguiente.sesion.status === "completed"
            ? "completado"
            : siguiente.sesion.status === "not_started"
              ? "no_iniciado"
              : "en_progreso",
        progreso: Math.round((respondidas / totalPreguntasObligatorias) * 100),
        respondidasObligatorias: respondidas,
        totalPreguntas: totalPreguntasObligatorias,
      });
    },
    [sincronizarDiagnostico]
  );

  const reintentarGuardado = useCallback(() => {
    const siguiente = pendienteDeGuardar.current ?? estado;
    persistir(siguiente);
  }, [estado, persistir]);

  const respondidas = contarObligatoriasRespondidas(estado.respuestas);
  const porcentaje = Math.round((respondidas / totalPreguntasObligatorias) * 100);
  const pendientes = useMemo(() => pendientesAgrupados(estado.respuestas), [estado.respuestas]);
  const siguientePendiente = useMemo(() => primeraPendiente(estado.respuestas), [estado.respuestas]);
  const completo = respondidas >= totalPreguntasObligatorias;

  const valorDe = useCallback(
    (questionId: string): ValorRespuesta | undefined =>
      estado.respuestas.find((r) => r.questionId === questionId)?.value,
    [estado.respuestas]
  );

  /** Crea la sesión y abre la primera pregunta. */
  const comenzar = useCallback(() => {
    const primera = preguntasEnOrden[0]!;
    const sesion = {
      ...crearSesionDiagnostico(),
      status: "in_progress" as const,
      currentQuestionId: primera.id,
      currentDimensionId: primera.dimensionId ?? null,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    persistir({ sesion, respuestas: [], resultado: null });
    registrarEvento("diagnostic_started", {
      sessionId: sesion.id,
      definitionVersion: sesion.definitionVersion,
      timestamp: sesion.startedAt!,
    });
    return primera.id;
  }, [persistir]);

  const reanudar = useCallback(() => {
    const destino = estado.sesion.currentQuestionId ?? siguientePendiente?.id ?? preguntasEnOrden[0]!.id;
    persistir({
      ...estado,
      sesion: {
        ...estado.sesion,
        status: estado.sesion.status === "completed" ? "completed" : "in_progress",
        currentQuestionId: destino,
        updatedAt: new Date().toISOString(),
      },
    });
    registrarEvento("diagnostic_resumed", { sessionId: estado.sesion.id, progress: porcentaje });
    return destino;
  }, [estado, persistir, porcentaje, siguientePendiente]);

  /** Guarda automáticamente al seleccionar o cambiar una respuesta (R-NAV-05). */
  const responder = useCallback(
    (questionId: string, valor: ValorRespuesta) => {
      const pregunta = obtenerPregunta(questionId);
      if (!pregunta) return;
      if (!valorValido(pregunta, valor)) return;

      const respuesta: DiagnosticAnswer = {
        questionId,
        ...(pregunta.dimensionId ? { dimensionId: pregunta.dimensionId } : {}),
        value: valor,
        answeredAt: new Date().toISOString(),
      };

      const respuestasSiguientes = [
        ...estado.respuestas.filter((r) => r.questionId !== questionId),
        respuesta,
      ];

      persistir({
        ...estado,
        respuestas: respuestasSiguientes,
        sesion: {
          ...estado.sesion,
          status: estado.sesion.status === "completed" ? "completed" : "in_progress",
          currentQuestionId: questionId,
          currentDimensionId: pregunta.dimensionId ?? null,
          startedAt: estado.sesion.startedAt ?? new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      });

      registrarEvento("question_answered", {
        sessionId: estado.sesion.id,
        questionId,
        dimensionId: pregunta.dimensionId ?? "contexto",
        timestamp: respuesta.answeredAt,
      });
    },
    [estado, persistir]
  );

  /** Guarda la ubicación actual sin alterar respuestas (R-NAV-06). */
  const marcarPreguntaActual = useCallback(
    (questionId: string) => {
      if (estado.sesion.currentQuestionId === questionId) return;
      const pregunta = obtenerPregunta(questionId);
      persistir({
        ...estado,
        sesion: {
          ...estado.sesion,
          status: estado.sesion.status === "not_started" ? "in_progress" : estado.sesion.status,
          currentQuestionId: questionId,
          currentDimensionId: pregunta?.dimensionId ?? null,
          startedAt: estado.sesion.startedAt ?? new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      });
    },
    [estado, persistir]
  );

  const pausar = useCallback(() => {
    registrarEvento("diagnostic_paused", {
      sessionId: estado.sesion.id,
      progress: porcentaje,
      currentQuestionId: estado.sesion.currentQuestionId ?? "",
    });
  }, [estado.sesion, porcentaje]);

  const marcarRevision = useCallback(() => {
    if (estado.sesion.status === "completed") return;
    persistir({
      ...estado,
      sesion: { ...estado.sesion, status: "review", updatedAt: new Date().toISOString() },
    });
  }, [estado, persistir]);

  /** Valida, calcula y guarda el resultado preliminar. Evita cálculos duplicados. */
  const finalizar = useCallback((): DiagnosticResult | null => {
    if (calculando.current) return estado.resultado;
    if (!configuracionValida) {
      setErrorCalculo("CFG-000");
      return null;
    }
    if (!completo) {
      setErrorCalculo("VAL-001");
      return null;
    }

    calculando.current = true;
    setErrorCalculo(null);
    try {
      const resultado = calcularResultado(estado.sesion.id, estado.respuestas);
      const completadoEn = new Date().toISOString();
      const duracion = estado.sesion.startedAt
        ? Math.round((Date.parse(completadoEn) - Date.parse(estado.sesion.startedAt)) / 1000)
        : 0;

      persistir({
        ...estado,
        resultado,
        sesion: {
          ...estado.sesion,
          status: "completed",
          completedAt: completadoEn,
          updatedAt: completadoEn,
          errorCode: null,
        },
      });

      registrarEvento("diagnostic_completed", {
        sessionId: estado.sesion.id,
        globalScore: resultado.globalScore,
        globalLevel: resultado.globalLevel,
        duration: duracion,
      });
      return resultado;
    } catch (error) {
      console.warn("Falló el cálculo del diagnóstico:", error);
      setErrorCalculo("CAL-001");
      registrarEvento("diagnostic_error", {
        sessionId: estado.sesion.id,
        errorCode: "CAL-001",
        stage: "calculo",
      });
      return null;
    } finally {
      calculando.current = false;
    }
  }, [completo, configuracionValida, estado, persistir]);

  /** Reinicia el avance local. La interfaz debe pedir confirmación antes (R-NAV-08). */
  const reiniciar = useCallback(() => {
    try {
      limpiarEstado();
    } catch (error) {
      console.warn("No se pudo limpiar el diagnóstico guardado:", error);
    }
    const inicial = estadoInicial();
    setEstado(inicial);
    setEstadoGuardado("idle");
    setErrorCalculo(null);
    sincronizarDiagnostico({
      estado: "no_iniciado",
      progreso: 0,
      respondidasObligatorias: 0,
      totalPreguntas: totalPreguntasObligatorias,
    });
  }, [sincronizarDiagnostico]);

  return {
    definicion: definicionDiagnostico,
    isHydrated,
    configuracionValida,
    problemasConfiguracion,
    sesion: estado.sesion,
    respuestas: estado.respuestas,
    resultado: estado.resultado,
    progreso: { respondidas, total: totalPreguntasObligatorias, porcentaje },
    completo,
    pendientes,
    siguientePendiente,
    estadoGuardado,
    errorCalculo,
    reintentarGuardado,
    valorDe,
    comenzar,
    reanudar,
    responder,
    marcarPreguntaActual,
    pausar,
    marcarRevision,
    finalizar,
    reiniciar,
  };
}
