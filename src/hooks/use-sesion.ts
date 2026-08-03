import { useCallback } from "react";
import { useLocalStorage } from "./use-local-storage";
import { crearSesionVacia, sesionDemo, sesionInicial } from "@/data/mocks/sesion";
import { totalPasos } from "@/data/mocks/diagnostico";
import { registrarEvento } from "@/lib/analytics";
import type {
  Accion,
  Actividad,
  Empresa,
  EstadoAccion,
  Preferencias,
  Respuesta,
  SesionMVP,
  TipoActividad,
} from "@/types";

const STORAGE_KEY = "pyme-digital-sesion-v2";

/** Integra datos guardados con el modelo actual: conserva lo válido y completa lo faltante. */
function mergeSesion(stored: unknown, initial: SesionMVP): SesionMVP {
  if (!stored || typeof stored !== "object") return initial;
  const s = stored as Partial<SesionMVP>;
  return {
    empresa: { ...initial.empresa, ...(s.empresa ?? {}) },
    perfilCompletado: s.perfilCompletado ?? initial.perfilCompletado,
    diagnostico: { ...initial.diagnostico, ...(s.diagnostico ?? {}), totalPasos },
    respuestas: Array.isArray(s.respuestas) ? s.respuestas : initial.respuestas,
    resultados: Array.isArray(s.resultados) ? s.resultados : initial.resultados,
    prioridades: Array.isArray(s.prioridades) ? s.prioridades : initial.prioridades,
    acciones: Array.isArray(s.acciones) ? s.acciones : initial.acciones,
    actividad: Array.isArray(s.actividad) ? s.actividad : initial.actividad,
    preferencias: { ...initial.preferencias, ...(s.preferencias ?? {}) },
  };
}

function nuevaActividad(tipo: TipoActividad, descripcion: string): Actividad {
  return {
    id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    fecha: new Date().toISOString(),
    tipo,
    descripcion,
  };
}

export function useSesion() {
  const { value, setValue, isHydrated, storageError } = useLocalStorage(
    STORAGE_KEY,
    sesionInicial,
    mergeSesion
  );

  const registrarActividad = useCallback(
    (tipo: TipoActividad, descripcion: string) => {
      setValue((prev) => ({
        ...prev,
        actividad: [nuevaActividad(tipo, descripcion), ...prev.actividad].slice(0, 20),
      }));
    },
    [setValue]
  );

  const updateEmpresa = useCallback(
    (empresa: Empresa) => {
      setValue((prev) => ({
        ...prev,
        empresa: { ...empresa, fechaActualizacion: new Date().toISOString() },
        perfilCompletado: empresa.nombre.trim().length > 0,
        actividad: [
          nuevaActividad("perfil", "Se actualizaron los datos de la empresa."),
          ...prev.actividad,
        ].slice(0, 20),
      }));
      registrarEvento("perfil_guardado");
    },
    [setValue]
  );

  /** Guarda la respuesta del paso y actualiza progreso y paso actual. */
  const guardarPaso = useCallback(
    (respuesta: Respuesta, indicePaso: number) => {
      setValue((prev) => {
        const respuestas = [
          ...prev.respuestas.filter((r) => r.preguntaId !== respuesta.preguntaId),
          respuesta,
        ];
        const completados = respuestas.length;
        const progreso = Math.min(100, Math.round((completados / totalPasos) * 100));
        const completo = completados >= totalPasos;
        return {
          ...prev,
          respuestas,
          diagnostico: {
            ...prev.diagnostico,
            estado: completo ? "completado" : "en_progreso",
            progreso,
            pasoActual: indicePaso,
            totalPasos,
            respuestasRevisadas: completo ? prev.diagnostico.respuestasRevisadas : false,
            fechaActualizacion: new Date().toISOString(),
          },
        };
      });
      registrarEvento("paso_completado", { paso: indicePaso + 1 });
    },
    [setValue]
  );

  const iniciarDiagnostico = useCallback(() => {
    setValue((prev) => ({
      ...prev,
      diagnostico: {
        ...prev.diagnostico,
        estado: prev.diagnostico.estado === "completado" ? "completado" : "en_progreso",
        totalPasos,
        fechaActualizacion: new Date().toISOString(),
      },
      actividad: [
        nuevaActividad("diagnostico", "Se inició el diagnóstico demostrativo."),
        ...prev.actividad,
      ].slice(0, 20),
    }));
    registrarEvento("diagnostico_iniciado");
  }, [setValue]);

  const marcarPasoActual = useCallback(
    (indicePaso: number) => {
      setValue((prev) => ({
        ...prev,
        diagnostico: { ...prev.diagnostico, pasoActual: indicePaso },
      }));
    },
    [setValue]
  );

  /** Genera resultados demostrativos: no aplica lógica de diagnóstico real. */
  const generarResultadosDemostrativos = useCallback(() => {
    setValue((prev) => ({
      ...prev,
      diagnostico: {
        ...prev.diagnostico,
        estado: "completado",
        progreso: 100,
        respuestasRevisadas: true,
        resultadosGenerados: true,
        fechaActualizacion: new Date().toISOString(),
      },
      resultados: sesionDemo.resultados,
      prioridades: sesionDemo.prioridades,
      acciones:
        prev.acciones.length > 0
          ? prev.acciones
          : sesionDemo.acciones.map((a) => ({ ...a, estado: "pendiente" as EstadoAccion })),
      actividad: [
        nuevaActividad("diagnostico", "Se generaron resultados demostrativos."),
        ...prev.actividad,
      ].slice(0, 20),
    }));
    registrarEvento("resultados_generados");
  }, [setValue]);

  const cambiarEstadoAccion = useCallback(
    (id: string, estado: EstadoAccion) => {
      setValue((prev) => {
        const accion = prev.acciones.find((a) => a.id === id);
        return {
          ...prev,
          acciones: prev.acciones.map((a) => (a.id === id ? { ...a, estado } : a)),
          actividad: accion
            ? [
                nuevaActividad(
                  "accion",
                  estado === "completada"
                    ? `Se marcó como completada la acción “${accion.titulo}”.`
                    : `Se actualizó el estado de la acción “${accion.titulo}”.`
                ),
                ...prev.actividad,
              ].slice(0, 20)
            : prev.actividad,
        };
      });
      registrarEvento(estado === "completada" ? "accion_completada" : "accion_iniciada", { id });
    },
    [setValue]
  );

  const updateAccion = useCallback(
    (accion: Accion) => {
      setValue((prev) => ({
        ...prev,
        acciones: prev.acciones.map((a) => (a.id === accion.id ? accion : a)),
      }));
    },
    [setValue]
  );

  const updatePreferencias = useCallback(
    (preferencias: Partial<Preferencias>) => {
      setValue((prev) => ({
        ...prev,
        preferencias: { ...prev.preferencias, ...preferencias },
      }));
    },
    [setValue]
  );

  /** Carga la sesión demostrativa completa (perfil, respuestas, resultados y acciones). */
  const cargarDatosDemostrativos = useCallback(() => {
    setValue({
      ...sesionDemo,
      actividad: [
        nuevaActividad("sistema", "Se cargaron datos demostrativos del prototipo."),
        ...sesionDemo.actividad,
      ].slice(0, 20),
    });
    registrarEvento("datos_demo_cargados");
  }, [setValue]);

  /** Reinicia todo el progreso local. Requiere confirmación explícita en la interfaz. */
  const reiniciarTodo = useCallback(() => {
    setValue(crearSesionVacia());
    registrarEvento("datos_reiniciados");
  }, [setValue]);

  return {
    sesion: value,
    isHydrated,
    storageError,
    registrarActividad,
    updateEmpresa,
    iniciarDiagnostico,
    guardarPaso,
    marcarPasoActual,
    generarResultadosDemostrativos,
    cambiarEstadoAccion,
    updateAccion,
    updatePreferencias,
    cargarDatosDemostrativos,
    reiniciarTodo,
  };
}
