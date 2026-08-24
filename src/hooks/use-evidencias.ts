import { useCallback, useEffect, useMemo, useState } from "react";
import { mismoRegistro, useVersionEstado } from "@/lib/estado/bus";
import { useSesion } from "./use-sesion";
import { useDelegacion } from "./use-delegacion";
import { useApoyoHumano } from "./use-apoyo-humano";
import { leerEstado } from "@/lib/diagnostico/repositorio";
import { catalogoSuficiencia } from "@/lib/suficiencia/catalogo";
import { evaluarSuficiencia } from "@/lib/suficiencia/motor";
import {
  guardarRegistro,
  leerRegistro,
  limpiarRegistro,
  registroVacio,
} from "@/lib/evidencias/repositorio";
import {
  evidenciasRelacionadas,
  registrarAclaracion,
  registrarAnalisis,
  registrarCarga,
  solicitarEvidencia,
} from "@/lib/evidencias/servicio";
import { registrarEvento } from "@/lib/analytics";
import type { ArchivoEvidencia, RegistroEvidenciasEmpresa } from "@/lib/evidencias/tipos";
import type { DiagnosticAnswer } from "@/lib/diagnostico/tipos";
import type { NecesidadInformacion } from "@/lib/suficiencia/tipos";

/**
 * B2 + B3 · Puente entre la suficiencia del diagnóstico general y el
 * conocimiento documental de la empresa. La interfaz consume solo el resultado
 * ya evaluado: no conoce reglas, condiciones ni textos del catálogo.
 */
export function useEvidencias() {
  const { sesion, isHydrated: sesionHidratada, registrarActividad } = useSesion();
  // Profundización modular: delegar o pedir apoyo también resuelve una
  // necesidad. El motor recibe los mecanismos, no los descubre por su cuenta.
  const { delegaciones } = useDelegacion();
  const { recomendaciones } = useApoyoHumano();

  const empresaId = sesion.empresa.id || "empresa-local";
  const empresaNombre = sesion.empresa.nombre.trim() || "Tu empresa";

  const [registro, setRegistro] = useState<RegistroEvidenciasEmpresa>(() =>
    registroVacio(empresaId, empresaNombre)
  );
  const [respuestas, setRespuestas] = useState<DiagnosticAnswer[]>([]);
  const [diagnosticoId, setDiagnosticoId] = useState<string | null>(null);
  const [hidratado, setHidratado] = useState(false);

  const version = useVersionEstado();

  useEffect(() => {
    if (!sesionHidratada) return;
    const leido = leerRegistro(empresaId, empresaNombre);
    setRegistro((previo) => (mismoRegistro(previo, leido) ? previo : leido));
    try {
      const estado = leerEstado();
      setRespuestas(estado.respuestas);
      setDiagnosticoId(estado.sesion.id ?? null);
    } catch (error) {
      console.warn("No se pudo leer el diagnóstico para evaluar suficiencia:", error);
    }
    setHidratado(true);
  }, [sesionHidratada, empresaId, empresaNombre, version]);

  const persistir = useCallback((siguiente: RegistroEvidenciasEmpresa) => {
    setRegistro(guardarRegistro(siguiente));
  }, []);

  const suficiencia = useMemo(
    () =>
      evaluarSuficiencia({
        respuestas,
        evidencias: registro.evidencias,
        aclaraciones: registro.aclaraciones,
        delegaciones: delegaciones.map((d) => ({
          referenciaId: d.origen.referenciaId,
          resuelto: d.estado === "incorporado",
        })),
        apoyos: recomendaciones.map((r) => ({
          referenciaId: r.origen.referenciaId,
          resuelto: r.estado === "realizada",
        })),
      }),
    [respuestas, registro.evidencias, registro.aclaraciones, delegaciones, recomendaciones]
  );

  /** Abre formalmente la solicitud del documento asociado a una necesidad. */
  const solicitar = useCallback(
    (necesidad: NecesidadInformacion) => {
      const definicion = catalogoSuficiencia.solicitudes.find(
        (s) => s.id === necesidad.referenciaId
      );
      if (!definicion) return null;
      const { registro: siguiente, evidencia } = solicitarEvidencia(registro, definicion, {
        empresaId,
        diagnosticoId,
        preguntaIds: necesidad.preguntaIds,
      });
      persistir(siguiente);
      registrarEvento("evidence_requested", {
        solicitudId: definicion.id,
        dominioId: definicion.dominioId,
      });
      return evidencia;
    },
    [registro, empresaId, diagnosticoId, persistir]
  );

  /** Registra el archivo cargado y ejecuta el análisis simulado. */
  const cargarArchivo = useCallback(
    (evidenciaId: string, archivo: ArchivoEvidencia) => {
      const conArchivo = registrarCarga(registro, evidenciaId, archivo);
      const evidencia = conArchivo.evidencias.find((e) => e.id === evidenciaId);
      const definicion = catalogoSuficiencia.solicitudes.find(
        (s) => s.id === evidencia?.solicitudId
      );
      const { registro: siguiente, analisis } = registrarAnalisis(
        conArchivo,
        evidenciaId,
        definicion
      );
      persistir(siguiente);
      registrarActividad("sistema", `Evidencia recibida y analizada: ${archivo.nombre}`);
      registrarEvento("evidence_analyzed", {
        evidenciaId,
        simulado: true,
        resuelve: analisis?.resuelveSuficiencia ?? false,
      });
      return analisis;
    },
    [registro, persistir, registrarActividad]
  );

  /** Guarda la respuesta a una pregunta de aclaración de Pymapa. */
  const responderAclaracion = useCallback(
    (necesidad: NecesidadInformacion, respuesta: string) => {
      // Profundización modular: cualquier necesidad puede resolverse con una
      // explicación. Si el catálogo no define la pregunta (por ejemplo cuando
      // sugería un documento), se registra contra el id de la necesidad.
      const definicion =
        catalogoSuficiencia.aclaraciones.find((a) => a.id === necesidad.referenciaId) ?? {
          id: necesidad.reglaId,
          dominioId: necesidad.dominioId,
          pregunta: necesidad.titulo,
          motivo: necesidad.porQue,
        };
      persistir(
        registrarAclaracion(registro, definicion, respuesta, necesidad.preguntaIds)
      );
      registrarEvento("clarification_answered", { aclaracionId: definicion.id });
    },
    [registro, persistir]
  );

  const evidenciaDeSolicitud = useCallback(
    (solicitudId: string) =>
      registro.evidencias.find((e) => e.solicitudId === solicitudId && e.estado !== "rechazada"),
    [registro.evidencias]
  );

  const relacionadas = useCallback(
    (filtro: { dominioId?: string; preguntaId?: string; hallazgoId?: string }) =>
      evidenciasRelacionadas(registro, filtro),
    [registro]
  );

  const reiniciar = useCallback(() => {
    setRegistro(limpiarRegistro(empresaId, empresaNombre));
  }, [empresaId, empresaNombre]);

  return {
    hidratado: hidratado && sesionHidratada,
    registro,
    suficiencia,
    solicitar,
    cargarArchivo,
    responderAclaracion,
    evidenciaDeSolicitud,
    relacionadas,
    reiniciar,
  };
}
