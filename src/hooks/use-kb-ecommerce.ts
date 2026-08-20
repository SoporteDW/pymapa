import { useCallback, useEffect, useMemo, useState } from "react";
import { useSesion } from "./use-sesion";
import { knowledgePackEcommerce } from "@/lib/kb/ecommerce";
import { depurarRespuestas, preguntasVisibles } from "@/lib/kb/formulario";
import { evaluarKB } from "@/lib/kb/motor-kb";
import {
  agregarIniciativa,
  guardarRespuestas,
  leerRegistro,
  limpiarRegistro,
  registroVacio,
} from "@/lib/kb/repositorio";
import { crearIniciativaDesdeRecomendacion } from "@/lib/kb/iniciativas";
import { registrarEvento } from "@/lib/analytics";
import type {
  HallazgoDetectadoKB,
  IniciativaKB,
  RegistroEmpresaKB,
  ValorVariable,
} from "@/lib/kb/tipos";

const pack = knowledgePackEcommerce;

/**
 * Puente entre la capa de conocimiento y la interfaz.
 * La UI solo consume el resultado ya evaluado: no conoce reglas ni textos del pack.
 */
export function useKbEcommerce() {
  const { sesion, isHydrated: sesionHidratada, registrarActividad } = useSesion();

  const companyId = sesion.empresa.id || "empresa-local";
  const companyName = sesion.empresa.nombre.trim() || "Tu empresa";

  const [registro, setRegistro] = useState<RegistroEmpresaKB>(() =>
    registroVacio(companyId, companyName)
  );
  const [hidratado, setHidratado] = useState(false);

  /** Recupera el conocimiento previamente declarado por esta empresa. */
  useEffect(() => {
    if (!sesionHidratada) return;
    setRegistro(leerRegistro(companyId, companyName));
    setHidratado(true);
  }, [sesionHidratada, companyId, companyName]);

  const persistir = useCallback(
    (siguiente: RegistroEmpresaKB) => {
      setRegistro(siguiente);
      guardarRespuestas(companyId, companyName, siguiente.respuestas, {
        esDemo: siguiente.esDemo,
        ...(siguiente.datasetDemoId ? { datasetDemoId: siguiente.datasetDemoId } : {}),
      });
    },
    [companyId, companyName]
  );

  /** Guarda una respuesta y depura las preguntas que dejaron de aplicar. */
  const responder = useCallback(
    (preguntaId: string, valor: ValorVariable) => {
      setRegistro((prev) => {
        const respuestas = depurarRespuestas(pack, { ...prev.respuestas, [preguntaId]: valor });
        const siguiente: RegistroEmpresaKB = {
          ...prev,
          companyId,
          companyName,
          respuestas,
          actualizadoEn: new Date().toISOString(),
        };
        guardarRespuestas(companyId, companyName, respuestas, {
          esDemo: siguiente.esDemo,
          ...(siguiente.datasetDemoId ? { datasetDemoId: siguiente.datasetDemoId } : {}),
        });
        return siguiente;
      });
    },
    [companyId, companyName]
  );

  /** Carga el dataset DEMO ficticio del pack (datos claramente identificados). */
  const cargarDatasetDemo = useCallback(() => {
    const respuestas = { ...pack.datasetDemo.respuestas };
    const siguiente: RegistroEmpresaKB = {
      ...registroVacio(companyId, companyName),
      respuestas,
      esDemo: true,
      datasetDemoId: pack.datasetDemo.id,
      iniciativas: registro.iniciativas,
    };
    persistir(siguiente);
    registrarEvento("kb_demo_dataset_loaded", { packId: pack.id, version: pack.version });
    return preguntasVisibles(pack, respuestas).length;
  }, [companyId, companyName, persistir, registro.iniciativas]);

  const limpiar = useCallback(() => {
    setRegistro(limpiarRegistro(companyId, companyName));
    registrarEvento("kb_diagnosis_reset", { packId: pack.id });
  }, [companyId, companyName]);

  const resultado = useMemo(
    () =>
      evaluarKB({
        pack,
        companyId,
        companyName,
        respuestas: registro.respuestas,
        esDemo: registro.esDemo,
      }),
    [companyId, companyName, registro.respuestas, registro.esDemo]
  );

  const visibles = useMemo(() => preguntasVisibles(pack, registro.respuestas), [registro.respuestas]);

  /**
   * Convierte una recomendación en iniciativa reutilizando todo el conocimiento
   * disponible y la integra al Plan de Acción/Roadmap conservando su origen.
   */
  const convertirEnIniciativa = useCallback(
    (detectado: HallazgoDetectadoKB): IniciativaKB => {
      const iniciativa = crearIniciativaDesdeRecomendacion(pack, resultado, detectado);
      const actualizado = agregarIniciativa(companyId, companyName, iniciativa);
      setRegistro(actualizado);
      registrarActividad(
        "accion",
        `Se creó la iniciativa “${iniciativa.accion.titulo}” desde el Diagnóstico Inteligente · E-commerce.`
      );
      registrarEvento("kb_initiative_created", {
        recomendacionId: detectado.recomendacion.id,
        hallazgoId: detectado.hallazgo.id,
      });
      return iniciativa;
    },
    [companyId, companyName, registrarActividad, resultado]
  );

  const iniciativaDe = useCallback(
    (recomendacionId: string) =>
      registro.iniciativas.find((i) => i.origen.recomendacionId === recomendacionId) ?? null,
    [registro.iniciativas]
  );

  return {
    pack,
    isHydrated: hidratado && sesionHidratada,
    empresa: { id: companyId, nombre: companyName },
    registro,
    respuestas: registro.respuestas,
    preguntasVisibles: visibles,
    resultado,
    iniciativas: registro.iniciativas,
    esDemo: registro.esDemo,
    responder,
    cargarDatasetDemo,
    limpiar,
    convertirEnIniciativa,
    iniciativaDe,
  };
}

/** Lectura de solo consulta para otras pantallas (por ejemplo Plan de Acción). */
export function useIniciativasKb() {
  const { sesion, isHydrated } = useSesion();
  const companyId = sesion.empresa.id || "empresa-local";
  const companyName = sesion.empresa.nombre.trim() || "Tu empresa";
  const [iniciativas, setIniciativas] = useState<IniciativaKB[]>([]);

  useEffect(() => {
    if (!isHydrated) return;
    setIniciativas(leerRegistro(companyId, companyName).iniciativas);
  }, [isHydrated, companyId, companyName]);

  return { iniciativas, packVersion: pack.version };
}
