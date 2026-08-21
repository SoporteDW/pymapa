import { useCallback, useEffect, useMemo, useState } from "react";
import { useSesion } from "./use-sesion";
import { useResultados } from "./use-resultados";
import { leerRegistro as leerRegistroKB } from "@/lib/kb/repositorio";
import {
  guardarRegistro,
  leerRegistro,
  registroVacio,
} from "@/lib/workspace/repositorio";
import {
  asegurarActividad,
  cambiarEstado,
  marcarPaso,
  marcarVerificacion,
  obtenerActividad,
  registrarEntrega,
  retomarEjecucion,
} from "@/lib/workspace/servicio";
import { plantillaDesdeFicha, plantillaDesdeIniciativa } from "@/lib/workspace/plantillas";
import { plantillasEscenarioHero } from "@/lib/workspace/escenario-hero";
import { registrarEvento } from "@/lib/analytics";
import type {
  ActividadWorkspace,
  EstadoEjecucion,
  PlantillaActividad,
  RegistroWorkspaceEmpresa,
  VerificacionWorkspace,
} from "@/lib/workspace/tipos";
import type { EntradaEntrega } from "@/lib/workspace/servicio";

/**
 * B4 + B5 · Puente entre las actividades ya existentes (fichas del plan,
 * iniciativas del pack, escenario demo) y su estado de ejecución guiada.
 * La interfaz no conoce reglas de revisión ni de estados.
 */
export function useWorkspace(actividadId?: string) {
  const { sesion, isHydrated: sesionHidratada, registrarActividad } = useSesion();
  const { resultado } = useResultados();

  const empresaId = sesion.empresa.id || "empresa-local";
  const empresaNombre = sesion.empresa.nombre.trim() || "Tu empresa";

  const [registro, setRegistro] = useState<RegistroWorkspaceEmpresa>(() =>
    registroVacio(empresaId, empresaNombre)
  );
  const [hidratado, setHidratado] = useState(false);

  useEffect(() => {
    if (!sesionHidratada) return;
    setRegistro(leerRegistro(empresaId, empresaNombre));
    setHidratado(true);
  }, [sesionHidratada, empresaId, empresaNombre]);

  const persistir = useCallback((siguiente: RegistroWorkspaceEmpresa) => {
    setRegistro(guardarRegistro(siguiente));
    return siguiente;
  }, []);

  /** Plantillas disponibles: plan general + iniciativas del pack + escenario demo. */
  const plantillas = useMemo<PlantillaActividad[]>(() => {
    const fichas = (resultado?.actions ?? []).map(plantillaDesdeFicha);
    let iniciativas: PlantillaActividad[] = [];
    try {
      const kb = leerRegistroKB(empresaId, empresaNombre);
      iniciativas = kb.iniciativas.map(plantillaDesdeIniciativa);
    } catch (error) {
      console.warn("No se pudieron leer las iniciativas especializadas:", error);
    }
    return [...fichas, ...iniciativas, ...plantillasEscenarioHero];
  }, [resultado, empresaId, empresaNombre]);

  /** Abre (o recupera) el workspace de una actividad existente. */
  const abrir = useCallback(
    (id: string): ActividadWorkspace | null => {
      const plantilla = plantillas.find((p) => p.id === id);
      const existente = obtenerActividad(registro, id);
      if (existente) return existente;
      if (!plantilla) return null;
      const { registro: siguiente, actividad } = asegurarActividad(registro, plantilla);
      persistir(siguiente);
      registrarEvento("workspace_opened", {
        actividadId: actividad.id,
        instrumentoId: actividad.instrumentoId,
        origen: actividad.origen.tipo,
      });
      return actividad;
    },
    [plantillas, registro, persistir]
  );

  useEffect(() => {
    if (!hidratado || !actividadId) return;
    abrir(actividadId);
  }, [hidratado, actividadId, abrir]);

  const actividad = actividadId ? (obtenerActividad(registro, actividadId) ?? null) : null;
  const plantillaActual = actividadId ? plantillas.find((p) => p.id === actividadId) : undefined;

  const iniciar = useCallback(
    (id: string) => {
      persistir(cambiarEstado(registro, id, "en_ejecucion"));
      registrarEvento("workspace_started", { actividadId: id });
    },
    [registro, persistir]
  );

  const alternarPaso = useCallback(
    (id: string, orden: number, hecho: boolean) => {
      persistir(marcarPaso(registro, id, orden, hecho));
    },
    [registro, persistir]
  );

  const revisarVerificacion = useCallback(
    (id: string, verificacionId: string, estado: VerificacionWorkspace["estado"]) => {
      persistir(marcarVerificacion(registro, id, verificacionId, estado));
    },
    [registro, persistir]
  );

  const entregar = useCallback(
    (id: string, entrada: EntradaEntrega) => {
      const { registro: siguiente, entrega } = registrarEntrega(registro, id, entrada);
      persistir(siguiente);
      if (entrega) {
        registrarActividad(
          "sistema",
          `Entrega ${entrega.numero} revisada: ${entrega.revision.veredicto === "validado" ? "validada" : "requiere ajustes"}.`
        );
        registrarEvento("workspace_delivery_reviewed", {
          actividadId: id,
          entrega: entrega.numero,
          veredicto: entrega.revision.veredicto,
          simulada: true,
        });
      }
      return entrega;
    },
    [registro, persistir, registrarActividad]
  );

  const retomar = useCallback(
    (id: string) => {
      persistir(retomarEjecucion(registro, id));
    },
    [registro, persistir]
  );

  const resumen = useMemo(() => {
    const total = registro.actividades.length;
    const porEstado = registro.actividades.reduce<Record<EstadoEjecucion, number>>(
      (acc, a) => ({ ...acc, [a.estado]: (acc[a.estado] ?? 0) + 1 }),
      {
        pendiente: 0,
        en_ejecucion: 0,
        entregado: 0,
        requiere_ajustes: 0,
        validado: 0,
      }
    );
    return { total, porEstado };
  }, [registro.actividades]);

  return {
    hidratado,
    registro,
    actividades: registro.actividades,
    actividad,
    /** Existe como actividad del recorrido aunque el workspace no esté abierto. */
    existeEnRecorrido: Boolean(plantillaActual),
    plantillas,
    resumen,
    abrir,
    iniciar,
    alternarPaso,
    revisarVerificacion,
    entregar,
    retomar,
  };
}
