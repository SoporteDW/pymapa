/**
 * Dataset DEMO del Knowledge Pack E-commerce v0.1 (sección 16).
 * DATOS FICTICIOS: sirven para recorrer la experiencia sin diligenciar el
 * formulario. Nunca deben presentarse como información real de una empresa.
 */

import type { DatasetDemoKB } from "../tipos";

export const datasetDemo: DatasetDemoKB = {
  id: "kb-ec-demo-01",
  nombreEmpresa: "Empresa DEMO E-commerce",
  descripcion:
    "Tienda online activa B2C, canal digital importante, capacidad técnica básica, inventario en Excel y varias integraciones requeridas.",
  ficticio: true,
  respuestas: {
    "EC-Q01": "si",
    "EC-Q02": "consumidor_final",
    "EC-Q03": "importante",
    "TEC-Q01": "basica",
    "TEC-Q02": ["inventario", "facturacion", "logistica", "pagos"],
    "TEC-Q03": "excel",
    "TEC-Q04": "media",
    "SS-Q01": ["contenido", "servicio", "conversaciones"],
    "SS-Q02": "parcialmente",
    "SS-Q03": "depende_vendedor",
    "SS-Q04": "algunas_veces",
    "SS-Q05": "metricas_redes",
    "CRO-Q01": "general",
    "CRO-Q02": "no",
    "CRO-Q03": "percepcion",
    "CRO-Q04": "checkout",
  },
};
