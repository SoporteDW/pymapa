import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { mismoRegistro, useVersionEstado } from "@/lib/estado/bus";
import { useSesion } from "./use-sesion";
import { useResultados } from "./use-resultados";
import { leerRegistro as leerRegistroKB } from "@/lib/kb/repositorio";
import {
  guardarRegistro,
  leerRegistro,
  registroVacio,
} from "@/lib/workspace/repositorio";
import {
  guardarRegistro as guardarEvidencias,
  leerRegistro as leerEvidencias,
} from "@/lib/evidencias/repositorio";
import {
  adjuntarEvidenciasDeEntrega,
  evidenciasDeActividad,
} from "@/lib/workspace/puente-evidencias";
import {
  ajustesSolicitados,
  asegurarActividad,
  cambiarEstado,
  borradorDe,
  enlazarEvidenciasDeEntrega,
  guardarBorrador,
  marcarPaso,
  marcarVerificacion,
  obtenerActividad,
  reabrirActividad,
  registrarEntrega,
  retomarEjecucion,
} from "@/lib/workspace/servicio";
import { plantillaDesdeFicha, plantillaDesdeIniciativa } from "@/lib/workspace/plantillas";
import { plantillasEscenarioHero } from "@/lib/workspace/escenario-hero";
import { registrarEvento } from "@/lib/analytics";
import type {
  ActividadWorkspace,
  BorradorEntrega,
  EstadoEjecucion,
  PlantillaActividad,
  RegistroWorkspaceEmpresa,
  VerificacionWorkspace,
} from "@/lib/workspace/tipos";
import type { EntradaEntrega } from "@/lib/workspace/servicio";
import type { EvidenciaEmpresa } from "@/lib/evidencias/tipos";

/**
 * B4 + B5 · Puente entre las actividades ya existentes (fichas del plan,
 * iniciativas del pack, escenario demo) y su estado de ejecución guiada.
 * La interfaz no conoce reglas de revisión ni de estados.
 *
 * Macroentrega 3 · además conecta cada entregable con el modelo de evidencias
 * de la empresa y permite reabrir o complementar actividades validadas.
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

  const version = useVersionEstado();

  useEffect(() => {
    if (!sesionHidratada) return;
    const leido = leerRegistro(empresaId, empresaNombre);
    setRegistro((previo) => (mismoRegistro(previo, leido) ? previo : leido));
    setHidratado(true);
  }, [sesionHidratada, empresaId, empresaNombre, version]);

  /**
   * P0.3 · Causa raíz de la pérdida de checks: cada callback escribía a partir
   * del `registro` capturado en su clausura, de modo que dos interacciones
   * seguidas (marcar un paso y luego tocar evidencias) descartaban la primera.
   * Ahora toda escritura es una actualización funcional sobre el estado vigente.
   */
  /**
   * La persistencia NO puede ocurrir dentro del updater de `setRegistro`: ese
   * callback corre en fase de render y `guardarRegistro` avisa al bus de
   * estado, lo que actualizaría otros componentes durante el render. Se calcula
   * el nuevo registro en render y se persiste después del commit.
   */
  const porPersistir = useRef<RegistroWorkspaceEmpresa | null>(null);

  const aplicar = useCallback(
    (transformar: (actual: RegistroWorkspaceEmpresa) => RegistroWorkspaceEmpresa) => {
      setRegistro((actual) => {
        const siguiente = transformar(actual);
        porPersistir.current = siguiente;
        return siguiente;
      });
    },
    []
  );

  useEffect(() => {
    if (!porPersistir.current) return;
    const pendiente = porPersistir.current;
    porPersistir.current = null;
    guardarRegistro(pendiente);
  });

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
      aplicar(() => siguiente);
      registrarEvento("workspace_opened", {
        actividadId: actividad.id,
        instrumentoId: actividad.instrumentoId,
        origen: actividad.origen.tipo,
      });
      return actividad;
    },
    [plantillas, registro, aplicar]
  );

  useEffect(() => {
    if (!hidratado || !actividadId) return;
    abrir(actividadId);
  }, [hidratado, actividadId, abrir]);

  const actividad = actividadId ? (obtenerActividad(registro, actividadId) ?? null) : null;
  const plantillaActual = actividadId ? plantillas.find((p) => p.id === actividadId) : undefined;

  const iniciar = useCallback(
    (id: string) => {
      aplicar((actual) => cambiarEstado(actual, id, "en_ejecucion"));
      registrarEvento("workspace_started", { actividadId: id });
    },
    [aplicar]
  );

  const alternarPaso = useCallback(
    (id: string, orden: number, hecho: boolean) => {
      aplicar((actual) => marcarPaso(actual, id, orden, hecho));
    },
    [aplicar]
  );

  const revisarVerificacion = useCallback(
    (id: string, verificacionId: string, estado: VerificacionWorkspace["estado"]) => {
      aplicar((actual) => marcarVerificacion(actual, id, verificacionId, estado));
    },
    [aplicar]
  );

  const entregar = useCallback(
    (id: string, entrada: EntradaEntrega) => {
      const { registro: siguiente, entrega } = registrarEntrega(registro, id, entrada);
      if (!entrega) {
        aplicar(() => siguiente);
        return null;
      }
      const actividadEntregada = obtenerActividad(siguiente, id)!;

      // Deuda 0.1 · el entregable se incorpora al modelo de evidencias.
      const { registro: evidencias, evidenciaIds } = adjuntarEvidenciasDeEntrega(
        leerEvidencias(empresaId, empresaNombre),
        actividadEntregada,
        entrega
      );
      if (evidenciaIds.length > 0) guardarEvidencias(evidencias);

      aplicar(() => enlazarEvidenciasDeEntrega(siguiente, id, entrega.id, evidenciaIds));

      registrarActividad(
        "sistema",
        `Entrega ${entrega.numero} revisada: ${entrega.revision.veredicto === "validado" ? "validada" : "requiere ajustes"}.`
      );
      registrarEvento("workspace_delivery_reviewed", {
        actividadId: id,
        entrega: entrega.numero,
        veredicto: entrega.revision.veredicto,
        evidencias: evidenciaIds.length,
        simulada: true,
      });
      return { ...entrega, evidenciaIds };
    },
    [registro, aplicar, registrarActividad, empresaId, empresaNombre]
  );

  /** P0.3 · criterios declarados, nota y adjuntos persisten en la actividad. */
  const actualizarBorrador = useCallback(
    (id: string, cambios: Partial<BorradorEntrega>) => {
      aplicar((actual) => guardarBorrador(actual, id, cambios));
    },
    [aplicar]
  );

  const retomar = useCallback(
    (id: string) => {
      aplicar((actual) => retomarEjecucion(actual, id));
    },
    [aplicar]
  );

  /** B7 · reapertura por resultado de seguimiento. */
  const reabrir = useCallback(
    (id: string, motivo: string, seguimientoId: string | null = null) => {
      aplicar((actual) => reabrirActividad(actual, id, motivo, seguimientoId));
      registrarEvento("workspace_activity_reopened", { actividadId: id });
    },
    [aplicar]
  );

  /** B7 · crea (idempotente) una actividad complementaria derivada. */
  const crearDerivada = useCallback(
    (plantilla: PlantillaActividad) => {
      const { registro: siguiente, actividad: creada } = asegurarActividad(registro, plantilla);
      aplicar(() => siguiente);
      registrarEvento("workspace_followup_activity_created", { actividadId: creada.id });
      return creada;
    },
    [registro, aplicar]
  );

  /** Evidencias de la empresa producidas por la ejecución de esta actividad. */
  const evidencias = useCallback(
    (id: string): EvidenciaEmpresa[] =>
      evidenciasDeActividad(leerEvidencias(empresaId, empresaNombre), id),
    [empresaId, empresaNombre]
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
    empresaId,
    empresaNombre,
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
    borrador: actividad ? borradorDe(actividad) : null,
    actualizarBorrador,
    retomar,
    reabrir,
    crearDerivada,
    evidencias,
    ajustesDe: (a: ActividadWorkspace) => ajustesSolicitados(a),
  };
}
