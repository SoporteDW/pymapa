import type { SesionMVP } from "@/types";
import { empresaDemo } from "./empresa";
import { diagnosticoDemo } from "./diagnostico";
import { resultadosDemo, accionesDemo, actividadDemo } from "./resultados";

export const sesionDemo: SesionMVP = {
  empresa: empresaDemo,
  diagnostico: diagnosticoDemo,
  respuestas: [],
  resultados: resultadosDemo,
  acciones: accionesDemo,
  actividad: actividadDemo,
  preferencias: {
    menuColapsado: false,
    ultimaRuta: "/inicio",
    movimientoReducido: false,
  },
};

export function crearSesionVacia(): SesionMVP {
  return {
    empresa: { ...empresaDemo, nombre: "" },
    diagnostico: {
      id: "diag-vacio-001",
      estado: "no_iniciado",
      progreso: 0,
      pasoActual: 0,
      totalPasos: 5,
      fechaActualizacion: new Date().toISOString(),
    },
    respuestas: [],
    resultados: [],
    acciones: [],
    actividad: [],
    preferencias: {
      menuColapsado: false,
      ultimaRuta: "/inicio",
      movimientoReducido: false,
    },
  };
}
