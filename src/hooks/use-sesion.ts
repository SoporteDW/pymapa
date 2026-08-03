import { useCallback, useEffect } from "react";
import { useLocalStorage } from "./use-local-storage";
import { sesionDemo, crearSesionVacia } from "@/data/mocks/sesion";
import type { Accion, Diagnostico, Empresa, Preferencias, Respuesta } from "@/types";

const STORAGE_KEY = "pyme-digital-sesion-v1";

export function useSesion() {
  const { value, setValue, removeValue, isHydrated } = useLocalStorage(
    STORAGE_KEY,
    sesionDemo
  );

  // Evitar hidratación con datos de servidor inconsistentes
  useEffect(() => {
    if (!isHydrated) return;
    if (typeof window === "undefined") return;
    // Si no hay nada guardado, se queda con la sesión demo inicial
  }, [isHydrated]);

  const updateEmpresa = useCallback(
    (empresa: Empresa) => {
      setValue((prev) => ({
        ...prev,
        empresa: { ...empresa, fechaActualizacion: new Date().toISOString() },
        actividad: [
          {
            id: `act-${Date.now()}`,
            fecha: new Date().toISOString(),
            tipo: "perfil",
            descripcion: "Se actualizaron los datos básicos de la empresa.",
          },
          ...prev.actividad,
        ].slice(0, 20),
      }));
    },
    [setValue]
  );

  const updateDiagnostico = useCallback(
    (diagnostico: Diagnostico) => {
      setValue((prev) => ({
        ...prev,
        diagnostico: { ...diagnostico, fechaActualizacion: new Date().toISOString() },
      }));
    },
    [setValue]
  );

  const saveRespuesta = useCallback(
    (respuesta: Respuesta) => {
      setValue((prev) => {
        const resto = prev.respuestas.filter((r) => r.preguntaId !== respuesta.preguntaId);
        return {
          ...prev,
          respuestas: [...resto, respuesta],
        };
      });
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

  const resetDemo = useCallback(() => {
    setValue(sesionDemo);
  }, [setValue]);

  const resetVacia = useCallback(() => {
    setValue(crearSesionVacia());
  }, [setValue]);

  return {
    sesion: value,
    isHydrated,
    updateEmpresa,
    updateDiagnostico,
    saveRespuesta,
    updateAccion,
    updatePreferencias,
    resetDemo,
    resetVacia,
  };
}
