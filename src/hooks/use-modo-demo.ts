import { useCallback, useEffect, useMemo, useState } from "react";
import {
  activarModoDemo,
  leerModoDemo,
  limpiarDatosRecorrido,
  modoDemoInicial,
  restaurarEmpresaReal,
  type EstadoModoDemo,
  type ModoDemo,
} from "@/lib/demo/modo-demo";
import { perfilPorId, type PerfilSimulado } from "@/lib/integracion/perfiles";
import { registrarEvento } from "@/lib/analytics";

/**
 * Servicio del Modo Demostración: activa una demo (completa o paso a paso),
 * expone el dataset de la empresa simulada para autocompletar etapas y permite
 * salir restaurando la información real previa.
 */
export function useModoDemo() {
  const [estado, setEstado] = useState<EstadoModoDemo>(modoDemoInicial);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setEstado(leerModoDemo());
    setIsHydrated(true);
  }, []);

  const perfil = useMemo<PerfilSimulado | null>(
    () => (estado.perfilId ? perfilPorId(estado.perfilId) ?? null : null),
    [estado.perfilId]
  );

  /** Marca el inicio de una demostración respaldando antes los datos reales. */
  const iniciarDemo = useCallback((perfilId: string, modo: ModoDemo) => {
    const simulado = perfilPorId(perfilId);
    if (!simulado) return null;
    const siguiente = activarModoDemo(modo, { id: simulado.id, nombre: simulado.nombre });
    if (modo === "paso_a_paso") {
      // Solo se limpian los datos del recorrido: el respaldo real queda intacto.
      limpiarDatosRecorrido();
    }
    setEstado(siguiente);
    registrarEvento("demo_mode_started", { profileId: simulado.id, mode: modo });
    return simulado;
  }, []);

  /** Sale de la demostración y devuelve la información real respaldada. */
  const salirDemo = useCallback(() => {
    restaurarEmpresaReal();
    setEstado(modoDemoInicial());
    registrarEvento("demo_mode_exited", {});
    if (typeof window !== "undefined") window.location.assign("/inicio");
  }, []);

  return {
    isHydrated,
    demoActiva: estado.activo,
    modo: estado.modo,
    estado,
    perfil,
    /** Solo en el recorrido paso a paso se ofrece autocompletar cada etapa. */
    puedeAutocompletar: estado.activo && estado.modo === "paso_a_paso" && perfil !== null,
    iniciarDemo,
    salirDemo,
  };
}
