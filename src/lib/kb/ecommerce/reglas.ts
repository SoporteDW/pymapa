/**
 * Reglas experimentales del Knowledge Pack E-commerce v0.1 (secciones 5, 8 y 9).
 * Cada regla enlaza variables → evaluación → hallazgo → recomendación.
 * No constituyen scoring validado ni reglas definitivas del producto.
 */

import type { ReglaKB } from "../tipos";
import {
  integracionesDeclaradas,
  tiendaActiva,
  usosSociales,
  valorUnico,
} from "./condicionales";

const CAPACIDAD_BAJA = ["terceros", "basica"];
const MEDICION_INSUFICIENTE = ["general", "solo_ventas", "no", "no_sabemos"];

export const reglas: ReglaKB[] = [
  {
    id: "TEC-R-01",
    dominio: "TEC",
    variables: ["technical_capacity"],
    preguntas: ["TEC-Q01"],
    condicionTexto: "TEC-Q01 indica capacidad técnica interna baja o dependiente de terceros.",
    evaluacion: "Administración tecnológica del canal con dependencia externa.",
    hallazgoId: "TEC-H01",
    recomendacionId: "TEC-R01",
    fuente: "SRC-TEC-01",
    condicion: (v) => CAPACIDAD_BAJA.includes(valorUnico(v, "technical_capacity") ?? ""),
  },
  {
    id: "TEC-R-02",
    dominio: "TEC",
    variables: ["integration_needs"],
    preguntas: ["TEC-Q02"],
    condicionTexto: "TEC-Q02 declara dos o más sistemas que requieren intercambio de información.",
    evaluacion: "Ecosistema con múltiples integraciones requeridas.",
    hallazgoId: "TEC-H02",
    recomendacionId: "TEC-R02",
    fuente: "SRC-TEC-01",
    condicion: (v) => integracionesDeclaradas(v).length >= 2,
  },
  {
    id: "TEC-R-03",
    dominio: "TEC",
    variables: ["inventory_management"],
    preguntas: ["TEC-Q03"],
    condicionTexto: "TEC-Q03 indica gestión de inventario manual o en hoja de cálculo.",
    evaluacion: "Gestión de inventario con bajo nivel de integración.",
    hallazgoId: "TEC-H03",
    recomendacionId: "TEC-R03",
    fuente: "SRC-TEC-01",
    condicion: (v) => ["manual", "excel"].includes(valorUnico(v, "inventory_management") ?? ""),
  },
  {
    id: "SS-R-01",
    dominio: "SS",
    variables: ["social_use", "followup_process"],
    preguntas: ["SS-Q01", "SS-Q02"],
    condicionTexto:
      "SS-Q01 muestra uso comunicacional de redes sin identificación de oportunidades, o SS-Q02 indica que no existe proceso definido de seguimiento.",
    evaluacion: "Uso social sin capacidad comercial estructurada.",
    hallazgoId: "SS-H01",
    recomendacionId: "SS-R01",
    fuente: "SRC-SS-01",
    condicion: (v) => {
      const usos = usosSociales(v);
      if (usos.length === 0) return false;
      const comercial = usos.some((u) => ["prospectos", "venta", "senales"].includes(u));
      const proceso = valorUnico(v, "followup_process");
      return !comercial || proceso === "no" || proceso === "parcialmente";
    },
  },
  {
    id: "SS-R-02",
    dominio: "SS",
    variables: ["opportunity_tracking"],
    preguntas: ["SS-Q03"],
    condicionTexto:
      "SS-Q03 indica que las oportunidades no se registran, dependen del vendedor o solo quedan en mensajería (LC-04).",
    evaluacion: "Uso social sin trazabilidad comercial.",
    hallazgoId: "SS-H02",
    recomendacionId: "SS-R02",
    fuente: "SRC-SS-01",
    condicion: (v) =>
      ["no_registran", "depende_vendedor", "whatsapp"].includes(
        valorUnico(v, "opportunity_tracking") ?? ""
      ),
  },
  {
    id: "SS-R-03",
    dominio: "SS",
    variables: ["outcome_measurement"],
    preguntas: ["SS-Q05"],
    condicionTexto:
      "SS-Q05 indica que solo se miden métricas de redes o que no se mide el resultado posterior.",
    evaluacion: "Actividad social medida sin trazabilidad hasta oportunidad o resultado.",
    hallazgoId: "SS-H03",
    recomendacionId: "SS-R03",
    fuente: "SRC-SS-01",
    condicion: (v) =>
      ["metricas_redes", "no"].includes(valorUnico(v, "outcome_measurement") ?? ""),
  },
  {
    id: "SS-R-04",
    dominio: "SS",
    variables: ["useful_content"],
    preguntas: ["SS-Q04"],
    condicionTexto:
      "SS-Q04 indica contenido principalmente promocional o solo ocasionalmente útil para decidir.",
    evaluacion: "Contenido con aporte parcial a la comprensión y decisión del cliente.",
    hallazgoId: "SS-H04",
    recomendacionId: "SS-R04",
    fuente: "SRC-SS-01",
    condicion: (v) =>
      ["promocional", "algunas_veces"].includes(valorUnico(v, "useful_content") ?? ""),
  },
  {
    id: "CRO-R-01",
    dominio: "CRO",
    variables: ["ecommerce_status", "conversion_measurement", "abandonment_analysis"],
    preguntas: ["EC-Q01", "CRO-Q01", "CRO-Q02"],
    condicionTexto:
      "Con tienda activa, CRO-Q01 no reporta medición por etapas o CRO-Q02 indica que no se analiza el abandono (LC-05).",
    evaluacion: "E-commerce activo con medición insuficiente del journey.",
    hallazgoId: "CRO-H01",
    recomendacionId: "CRO-R01",
    fuente: "SRC-CRO-01",
    condicion: (v) => {
      if (!tiendaActiva(v)) return false;
      const conversion = valorUnico(v, "conversion_measurement");
      const abandono = valorUnico(v, "abandonment_analysis");
      if (!conversion && !abandono) return false;
      return (
        MEDICION_INSUFICIENTE.includes(conversion ?? "") ||
        ["no", "ocasionalmente", "no_sabemos"].includes(abandono ?? "")
      );
    },
  },
  {
    id: "CRO-R-02",
    dominio: "CRO",
    variables: ["optimization_practice"],
    preguntas: ["CRO-Q03"],
    condicionTexto:
      "CRO-Q03 indica que las mejoras se realizan por percepción, de forma ocasional o no se realizan.",
    evaluacion: "Optimización sin ciclo sistemático basado en evidencia.",
    hallazgoId: "CRO-H02",
    recomendacionId: "CRO-R02",
    fuente: "SRC-CRO-01",
    condicion: (v) =>
      ["percepcion", "ocasionalmente", "no"].includes(
        valorUnico(v, "optimization_practice") ?? ""
      ),
  },
  {
    id: "CRO-R-03",
    dominio: "CRO",
    variables: ["perceived_friction_stage", "conversion_measurement", "abandonment_analysis"],
    preguntas: ["CRO-Q04", "CRO-Q01", "CRO-Q02"],
    condicionTexto:
      "CRO-Q04 señala una etapa problemática, pero la medición declarada no permite confirmar la fricción.",
    evaluacion:
      "Percepción de fricción en una etapa concreta sin evidencia suficiente para concluir causas.",
    hallazgoId: "CRO-H03",
    recomendacionId: "CRO-R03",
    fuente: "SRC-CRO-01",
    condicion: (v) => {
      const etapa = valorUnico(v, "perceived_friction_stage");
      if (!etapa || etapa === "no_sabemos") return false;
      const conversion = valorUnico(v, "conversion_measurement");
      const abandono = valorUnico(v, "abandonment_analysis");
      return (
        MEDICION_INSUFICIENTE.includes(conversion ?? "") ||
        ["no", "ocasionalmente", "no_sabemos"].includes(abandono ?? "")
      );
    },
  },
];
