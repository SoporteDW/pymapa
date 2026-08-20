/**
 * Biblioteca semilla de hallazgos del Knowledge Pack E-commerce v0.1 (sección 9).
 * Textos transcritos del pack: evidencia indicativa e interpretación.
 */

import type { HallazgoKB } from "../tipos";

export const hallazgos: HallazgoKB[] = [
  {
    id: "TEC-H01",
    dominio: "TEC",
    titulo: "Dependencia tecnológica",
    evidencia: "Baja capacidad técnica interna.",
    interpretacion:
      "La empresa presenta dependencia de terceros para la administración tecnológica del canal e-commerce.",
  },
  {
    id: "TEC-H02",
    dominio: "TEC",
    titulo: "Complejidad de integración",
    evidencia: "Múltiples sistemas requieren intercambio.",
    interpretacion:
      "El ecosistema requiere capacidades de integración superiores a las de una tienda aislada.",
  },
  {
    id: "TEC-H03",
    dominio: "TEC",
    titulo: "Fragmentación operativa",
    evidencia: "Inventario manual/Excel.",
    interpretacion:
      "Parte de la operación digital depende de procesos manuales o desacoplados.",
  },
  {
    id: "SS-H01",
    dominio: "SS",
    titulo: "Redes comunicacionales",
    evidencia: "Publica, pero no identifica o registra oportunidades.",
    interpretacion:
      "Las redes funcionan principalmente como canal de comunicación y todavía no como capacidad comercial estructurada.",
  },
  {
    id: "SS-H02",
    dominio: "SS",
    titulo: "Conversaciones sin trazabilidad",
    evidencia: "Interacciones comerciales sin registro sistemático.",
    interpretacion: "Existen conversaciones de valor, pero no se registra su evolución.",
  },
  {
    id: "SS-H03",
    dominio: "SS",
    titulo: "Actividad sin resultado",
    evidencia: "Métricas sociales sin trazabilidad comercial.",
    interpretacion:
      "La empresa mide actividad o visibilidad, pero no la evolución hasta oportunidad/resultado.",
  },
  {
    id: "SS-H04",
    dominio: "SS",
    titulo: "Contenido promocional",
    evidencia: "Contenido predominantemente promocional.",
    interpretacion:
      "Existe oportunidad de complementar promoción con contenido que ayude a comprender y decidir.",
  },
  {
    id: "CRO-H01",
    dominio: "CRO",
    titulo: "Baja visibilidad de conversión",
    evidencia: "E-commerce activo sin medición suficiente.",
    interpretacion:
      "No existe suficiente visibilidad para localizar pérdidas dentro del journey.",
  },
  {
    id: "CRO-H02",
    dominio: "CRO",
    titulo: "Optimización no sistemática",
    evidencia: "Mejoras principalmente por percepción.",
    interpretacion: "La optimización no sigue un ciclo sistemático basado en evidencia.",
  },
  {
    id: "CRO-H03",
    dominio: "CRO",
    titulo: "Auditoría especializada requerida",
    evidencia: "Etapa percibida como problemática sin evidencia suficiente.",
    interpretacion: "Se requiere profundización antes de concluir causas específicas.",
  },
];
