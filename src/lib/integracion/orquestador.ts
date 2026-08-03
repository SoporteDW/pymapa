/**
 * POC-08 · Orquestador de integración de extremo a extremo.
 * Ejecuta la cadena completa Diagnóstico → Motor de Conocimiento → Resultados →
 * Fichas de Acción → Roadmap → Dashboard con una sola entrada de respuestas.
 * Función pura y determinista: no lee ni escribe almacenamiento.
 */

import { DEFINITION_VERSION } from "@/lib/diagnostico/definicion";
import { calcularResultado } from "@/lib/diagnostico/calculo";
import { ejecutarMotor } from "@/lib/motor/motor";
import { generarResultados } from "@/lib/resultados/generador";
import { generarRoadmap } from "@/lib/roadmap/generador";
import { construirDashboard } from "@/lib/dashboard/servicio";
import { filtrosDashboardIniciales } from "@/lib/dashboard/filtros";
import type { DiagnosticAnswer, DiagnosticResult } from "@/lib/diagnostico/tipos";
import type { SalidaMotor } from "@/lib/motor/tipos";
import type { ResultadoPyme } from "@/lib/resultados/tipos";
import type { Roadmap } from "@/lib/roadmap/tipos";
import type { DashboardSnapshot } from "@/lib/dashboard/tipos";
import type { PerfilSimulado } from "./perfiles";

export const INTEGRATION_VERSION = "integracion-1.0.0";

export type ModuloIntegracion =
  | "diagnostico"
  | "motor"
  | "resultados"
  | "roadmap"
  | "dashboard";

export interface EntradaIntegracion {
  diagnosisId: string;
  companyId?: string | null;
  respuestas: DiagnosticAnswer[];
  /** Fecha base para fechas sugeridas del Roadmap; permite pruebas deterministas. */
  hoy?: string;
}

export interface EjecucionIntegrada {
  diagnosisId: string;
  companyId: string | null;
  respuestas: DiagnosticAnswer[];
  diagnostico: DiagnosticResult | null;
  salidaMotor: SalidaMotor | null;
  resultado: ResultadoPyme | null;
  roadmap: Roadmap | null;
  dashboard: DashboardSnapshot | null;
  /** Módulos que no pudieron completarse: habilitan la degradación parcial. */
  modulosConError: ModuloIntegracion[];
  integrationVersion: string;
}

/**
 * Ejecuta la cadena completa. Cada etapa se aísla: si una falla, se registra el
 * módulo afectado y las etapas siguientes se omiten sin lanzar excepción.
 */
export function integrar(entrada: EntradaIntegracion): EjecucionIntegrada {
  const modulosConError: ModuloIntegracion[] = [];

  let diagnostico: DiagnosticResult | null = null;
  try {
    diagnostico = calcularResultado(entrada.diagnosisId, entrada.respuestas);
  } catch (error) {
    console.warn("Integración: falló el cálculo del diagnóstico.", error);
    modulosConError.push("diagnostico");
  }

  let salidaMotor: SalidaMotor | null = null;
  try {
    salidaMotor = ejecutarMotor({
      diagnosisId: entrada.diagnosisId,
      companyId: entrada.companyId ?? null,
      definitionVersion: DEFINITION_VERSION,
      respuestas: entrada.respuestas,
    });
  } catch (error) {
    console.warn("Integración: falló la ejecución del motor.", error);
    modulosConError.push("motor");
  }

  let resultado: ResultadoPyme | null = null;
  if (salidaMotor) {
    try {
      resultado = generarResultados(salidaMotor);
    } catch (error) {
      console.warn("Integración: falló la generación de resultados.", error);
      modulosConError.push("resultados");
    }
  }

  let roadmap: Roadmap | null = null;
  if (resultado) {
    try {
      roadmap = generarRoadmap(resultado, {
        ...(entrada.companyId ? { empresaId: entrada.companyId } : {}),
        ...(entrada.hoy ? { hoy: entrada.hoy } : {}),
      });
    } catch (error) {
      console.warn("Integración: falló la generación del Roadmap.", error);
      modulosConError.push("roadmap");
    }
  }

  let dashboard: DashboardSnapshot | null = null;
  if (resultado) {
    try {
      dashboard = construirDashboard({
        resultado,
        roadmap,
        filtros: filtrosDashboardIniciales,
        ...(entrada.companyId ? { empresaId: entrada.companyId } : {}),
        ...(entrada.hoy ? { hoy: entrada.hoy } : {}),
        modulosConError,
      });
    } catch (error) {
      console.warn("Integración: falló la construcción del tablero.", error);
      modulosConError.push("dashboard");
    }
  }

  return {
    diagnosisId: entrada.diagnosisId,
    companyId: entrada.companyId ?? null,
    respuestas: entrada.respuestas,
    diagnostico,
    salidaMotor,
    resultado,
    roadmap,
    dashboard,
    modulosConError,
    integrationVersion: INTEGRATION_VERSION,
  };
}

/** Atajo para los perfiles simulados del POC-08. */
export function integrarPerfil(
  perfil: PerfilSimulado,
  opciones: { hoy?: string } = {}
): EjecucionIntegrada {
  return integrar({
    diagnosisId: perfil.diagnosisId,
    companyId: perfil.empresa.id,
    respuestas: perfil.respuestas,
    ...(opciones.hoy ? { hoy: opciones.hoy } : {}),
  });
}
