import type { SesionMVP } from "@/types";
import { empresaDemo, empresaVacia } from "./empresa";
import { diagnosticoDemo, diagnosticoVacio, respuestasDemo } from "./diagnostico";
import { accionesDemo, actividadDemo, prioridadesDemo, resultadosDemo } from "./resultados";

/** Sesión demostrativa completa: útil para presentar el recorrido de extremo a extremo. */
export const sesionDemo: SesionMVP = {
  empresa: empresaDemo,
  perfilCompletado: true,
  diagnostico: diagnosticoDemo,
  respuestas: respuestasDemo,
  resultados: resultadosDemo,
  prioridades: prioridadesDemo,
  acciones: accionesDemo,
  actividad: actividadDemo,
  preferencias: {
    menuColapsado: false,
    ultimaRuta: "/inicio",
    movimientoReducido: false,
  },
};

/** Sesión de primer ingreso: sin perfil, sin respuestas y sin resultados. */
export function crearSesionVacia(): SesionMVP {
  return {
    empresa: { ...empresaVacia },
    perfilCompletado: false,
    diagnostico: { ...diagnosticoVacio, fechaActualizacion: new Date().toISOString() },
    respuestas: [],
    resultados: [],
    prioridades: [],
    acciones: [],
    actividad: [],
    preferencias: {
      menuColapsado: false,
      ultimaRuta: "/inicio",
      movimientoReducido: false,
    },
  };
}

/** Sesión inicial del prototipo: parte de un primer ingreso limpio. */
export const sesionInicial: SesionMVP = crearSesionVacia();
