import { useCallback, useEffect, useMemo, useState } from "react";
import { guardarEstado, limpiarEstado } from "@/lib/diagnostico/repositorio";
import { DEFINITION_VERSION } from "@/lib/diagnostico/definicion";
import { guardarEjecucion } from "@/lib/motor/repositorio";
import { guardarRoadmap } from "@/lib/roadmap/repositorio";
import { integrarPerfil, type EjecucionIntegrada } from "@/lib/integracion/orquestador";
import { verificarConsistencia, type InformeConsistencia } from "@/lib/integracion/consistencia";
import { sincronizarDesdeEjecucion } from "@/lib/integracion/sincronizacion";
import { perfilesSimulados, perfilPorId, type PerfilSimulado } from "@/lib/integracion/perfiles";
import {
  CLAVE_ESCENARIO_RESULTADOS,
  estadoRecuperacion,
  exportarSesion,
  guardarSesionTrabajo,
  importarSesion,
  reiniciarSesionCompleta,
  type EstadoRecuperacion,
  type RespaldoSesion,
} from "@/lib/integracion/sesion-trabajo";
import type { DiagnosticAnswer } from "@/lib/diagnostico/tipos";
import { registrarEvento } from "@/lib/analytics";
import { useSesion } from "./use-sesion";

export type EstadoIntegracion = "cargando" | "listo" | "cargandoPerfil" | "error";

/**
 * Servicio de integración del POC-08: carga perfiles simulados en todos los
 * módulos, verifica la consistencia del recorrido y gestiona la recuperación de
 * la sesión. La lógica de negocio vive en src/lib/integracion; aquí solo se
 * coordinan almacenamiento y estados de interfaz.
 */
export function useIntegracion() {
  const {
    updateEmpresa,
    registrarActividad,
    sincronizarRecorrido,
    reiniciarTodo: reiniciarRecorrido,
  } = useSesion();
  const [estado, setEstado] = useState<EstadoIntegracion>("cargando");
  const [recuperacion, setRecuperacion] = useState<EstadoRecuperacion | null>(null);
  const [ejecucion, setEjecucion] = useState<EjecucionIntegrada | null>(null);
  const [informe, setInforme] = useState<InformeConsistencia | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const refrescar = useCallback(() => {
    setRecuperacion(estadoRecuperacion());
  }, []);

  useEffect(() => {
    refrescar();
    setEstado("listo");
  }, [refrescar]);

  /** Escribe la ejecución integrada en los repositorios de cada módulo. */
  const cargarPerfil = useCallback(
    (perfilId: string, opciones: { respuestas?: DiagnosticAnswer[] } = {}) => {
      const base = perfilPorId(perfilId);
      if (!base) {
        setMensaje("El perfil solicitado no existe.");
        return null;
      }
      // Un escenario puede exigir el instrumento completo (Macroentrega 4.1):
      // se respeta el perfil del catálogo y solo se sustituyen las respuestas.
      const perfil: PerfilSimulado = opciones.respuestas
        ? { ...base, respuestas: opciones.respuestas, cobertura: "completa" }
        : base;
      setEstado("cargandoPerfil");
      try {
        const salida = integrarPerfil(perfil);
        if (!salida.resultado || !salida.roadmap) {
          setEstado("error");
          setMensaje("No se pudo completar la cadena de integración para este perfil.");
          return null;
        }

        const ahora = new Date().toISOString();
        guardarEstado({
          sesion: {
            id: perfil.diagnosisId,
            definitionVersion: DEFINITION_VERSION,
            companyProfileId: perfil.empresa.id,
            status: "completed",
            currentQuestionId: null,
            currentDimensionId: null,
            startedAt: ahora,
            updatedAt: ahora,
            completedAt: ahora,
            errorCode: null,
          },
          respuestas: perfil.respuestas,
          resultado: salida.diagnostico,
        });
        guardarEjecucion(salida.salidaMotor!);
        guardarRoadmap(salida.roadmap);

        // El recorrido usa el diagnóstico cargado, no un escenario de validación.
        try {
          window.localStorage.removeItem(CLAVE_ESCENARIO_RESULTADOS);
        } catch {
          /* sin efecto: el escenario ya no está activo en memoria */
        }

        updateEmpresa(perfil.empresa);
        // POC-09 (D-01): el recorrido general se sincroniza en el mismo paso,
        // de modo que Inicio y el tablero no queden desfasados del perfil cargado.
        const recorrido = sincronizarDesdeEjecucion(salida);
        if (recorrido) sincronizarRecorrido(recorrido);
        registrarActividad(
          "sistema",
          `Se cargó el perfil simulado “${perfil.nombre}” en todos los módulos.`
        );
        guardarSesionTrabajo({
          perfilActivoId: perfil.id,
          perfilActivoNombre: perfil.nombre,
          diagnosisId: perfil.diagnosisId,
          executionId: salida.resultado.executionId,
        });

        const verificacion = verificarConsistencia(salida);
        setEjecucion(salida);
        setInforme(verificacion);
        setEstado("listo");
        setMensaje(
          verificacion.aprobado
            ? `Perfil “${perfil.nombre}” cargado: ${verificacion.correctas} de ${verificacion.total} verificaciones correctas.`
            : `Perfil “${perfil.nombre}” cargado con ${verificacion.fallas} inconsistencia(s) detectada(s).`
        );
        refrescar();
        registrarEvento("integration_profile_loaded", {
          profileId: perfil.id,
          executionId: salida.resultado.executionId,
          checksOk: verificacion.correctas,
          checksFail: verificacion.fallas,
        });
        return salida;
      } catch (error) {
        console.warn("No se pudo cargar el perfil simulado:", error);
        setEstado("error");
        setMensaje("Ocurrió un error al integrar el perfil simulado.");
        registrarEvento("integration_error", { errorCode: "INT-500", profileId: perfilId });
        return null;
      }
    },
    [refrescar, registrarActividad, sincronizarRecorrido, updateEmpresa]
  );

  /** Verificación de consistencia sobre todos los perfiles, sin tocar el estado guardado. */
  const verificarTodos = useCallback((): InformeConsistencia[] => {
    const informes = perfilesSimulados.map((perfil) =>
      verificarConsistencia(integrarPerfil(perfil))
    );
    registrarEvento("integration_consistency_checked", {
      perfiles: informes.length,
      fallas: informes.reduce((total, i) => total + i.fallas, 0),
    });
    return informes;
  }, []);

  const exportar = useCallback((): RespaldoSesion => {
    const respaldo = exportarSesion();
    registrarEvento("integration_session_exported", { modulos: Object.keys(respaldo.datos).length });
    return respaldo;
  }, []);

  const importar = useCallback(
    (texto: string) => {
      try {
        const respaldo = JSON.parse(texto) as RespaldoSesion;
        const ok = importarSesion(respaldo);
        setMensaje(
          ok
            ? "Sesión restaurada. Vuelve a abrir el recorrido para verla actualizada."
            : "El archivo no corresponde a un respaldo compatible."
        );
        if (ok) {
          refrescar();
          registrarEvento("integration_session_restored", {});
        }
        return ok;
      } catch (error) {
        console.warn("No se pudo restaurar la sesión:", error);
        setMensaje("El archivo no se pudo interpretar.");
        return false;
      }
    },
    [refrescar]
  );

  const reiniciarTodo = useCallback(() => {
    reiniciarSesionCompleta();
    limpiarEstado();
    // POC-09: el recorrido general también vuelve a su estado inicial.
    reiniciarRecorrido();
    setEjecucion(null);
    setInforme(null);
    setMensaje("Se reinició todo el progreso guardado en este navegador.");
    refrescar();
    registrarEvento("integration_session_reset", {});
  }, [refrescar, reiniciarRecorrido]);

  const perfilActivo = useMemo<PerfilSimulado | null>(() => {
    const id = recuperacion?.sesion.perfilActivoId;
    return id ? perfilPorId(id) ?? null : null;
  }, [recuperacion]);

  return {
    estado,
    perfiles: perfilesSimulados,
    perfilActivo,
    recuperacion,
    ejecucion,
    informe,
    mensaje,
    limpiarMensaje: () => setMensaje(null),
    cargarPerfil,
    verificarTodos,
    exportar,
    importar,
    reiniciarTodo,
    refrescar,
  };
}
