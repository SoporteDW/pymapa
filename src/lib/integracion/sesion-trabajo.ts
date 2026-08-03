/**
 * POC-08 · Sesión de trabajo: persistencia y recuperación del progreso.
 * Centraliza el inventario de claves locales de todos los módulos (POC-01 a
 * POC-07), registra el perfil simulado activo y permite exportar, restaurar o
 * reiniciar el estado completo. La estrategia elegida para el MVP es
 * almacenamiento local versionado por módulo, sin dependencias externas.
 */

import { CLAVE_DIAGNOSTICO } from "@/lib/diagnostico/repositorio";
import { CLAVE_MOTOR } from "@/lib/motor/repositorio";
import { CLAVE_ROADMAP } from "@/lib/roadmap/repositorio";

export const SESSION_VERSION = "sesion-trabajo-1.0.0";

export const CLAVE_SESION_APP = "pyme-digital-sesion-v2";
export const CLAVE_EVENTOS = "pyme-digital-eventos-v1";
export const CLAVE_ESCENARIO_RESULTADOS = "pyme-digital:resultados:escenario";
export const CLAVE_FILTROS_DASHBOARD = "pyme-digital:dashboard:filtros";
export const CLAVE_SESION_TRABAJO = "pyme-digital:sesion-trabajo:v1";

export interface ModuloPersistido {
  id: string;
  nombre: string;
  clave: string;
  /** Almacenamiento usado: los filtros del tablero son de sesión, no persistentes. */
  ambito: "local" | "sesion";
  presente: boolean;
  bytes: number;
}

const MODULOS: Omit<ModuloPersistido, "presente" | "bytes">[] = [
  { id: "sesion", nombre: "Perfil y recorrido", clave: CLAVE_SESION_APP, ambito: "local" },
  { id: "diagnostico", nombre: "Diagnóstico", clave: CLAVE_DIAGNOSTICO, ambito: "local" },
  { id: "motor", nombre: "Ejecuciones del motor", clave: CLAVE_MOTOR, ambito: "local" },
  { id: "roadmap", nombre: "Roadmap", clave: CLAVE_ROADMAP, ambito: "local" },
  { id: "eventos", nombre: "Analítica de interacción", clave: CLAVE_EVENTOS, ambito: "local" },
  {
    id: "escenario",
    nombre: "Escenario de resultados",
    clave: CLAVE_ESCENARIO_RESULTADOS,
    ambito: "local",
  },
  {
    id: "integracion",
    nombre: "Sesión de trabajo",
    clave: CLAVE_SESION_TRABAJO,
    ambito: "local",
  },
  {
    id: "filtros",
    nombre: "Filtros del tablero",
    clave: CLAVE_FILTROS_DASHBOARD,
    ambito: "sesion",
  },
];

export interface SesionTrabajo {
  version: string;
  /** Perfil simulado cargado por última vez, si el recorrido proviene de una demostración. */
  perfilActivoId: string | null;
  perfilActivoNombre: string | null;
  diagnosisId: string | null;
  executionId: string | null;
  ultimaRuta: string | null;
  actualizadaEn: string | null;
}

export function sesionTrabajoInicial(): SesionTrabajo {
  return {
    version: SESSION_VERSION,
    perfilActivoId: null,
    perfilActivoNombre: null,
    diagnosisId: null,
    executionId: null,
    ultimaRuta: null,
    actualizadaEn: null,
  };
}

function almacen(ambito: ModuloPersistido["ambito"]): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return ambito === "sesion" ? window.sessionStorage : window.localStorage;
  } catch {
    return null;
  }
}

export function leerSesionTrabajo(): SesionTrabajo {
  const store = almacen("local");
  if (!store) return sesionTrabajoInicial();
  try {
    const crudo = store.getItem(CLAVE_SESION_TRABAJO);
    if (!crudo) return sesionTrabajoInicial();
    const parseado = JSON.parse(crudo) as Partial<SesionTrabajo>;
    if (parseado.version !== SESSION_VERSION) return sesionTrabajoInicial();
    return { ...sesionTrabajoInicial(), ...parseado, version: SESSION_VERSION };
  } catch (error) {
    console.warn("No se pudo leer la sesión de trabajo:", error);
    return sesionTrabajoInicial();
  }
}

export function guardarSesionTrabajo(cambios: Partial<SesionTrabajo>): SesionTrabajo {
  const siguiente: SesionTrabajo = {
    ...leerSesionTrabajo(),
    ...cambios,
    version: SESSION_VERSION,
    actualizadaEn: new Date().toISOString(),
  };
  const store = almacen("local");
  if (store) {
    try {
      store.setItem(CLAVE_SESION_TRABAJO, JSON.stringify(siguiente));
    } catch (error) {
      console.warn("No se pudo guardar la sesión de trabajo:", error);
    }
  }
  return siguiente;
}

/** Inventario del estado persistido: base del panel de recuperación. */
export function inventarioPersistencia(): ModuloPersistido[] {
  return MODULOS.map((modulo) => {
    const store = almacen(modulo.ambito);
    let valor: string | null = null;
    try {
      valor = store?.getItem(modulo.clave) ?? null;
    } catch {
      valor = null;
    }
    return { ...modulo, presente: valor !== null, bytes: valor ? valor.length : 0 };
  });
}

export interface EstadoRecuperacion {
  hayProgreso: boolean;
  modulos: ModuloPersistido[];
  sesion: SesionTrabajo;
  bytesTotales: number;
  /** Falso cuando el navegador bloquea el almacenamiento: la app sigue en memoria. */
  almacenamientoDisponible: boolean;
}

export function estadoRecuperacion(): EstadoRecuperacion {
  const modulos = inventarioPersistencia();
  const store = almacen("local");
  let disponible = false;
  if (store) {
    try {
      store.setItem("pyme-digital:probe", "1");
      store.removeItem("pyme-digital:probe");
      disponible = true;
    } catch {
      disponible = false;
    }
  }
  return {
    modulos,
    sesion: leerSesionTrabajo(),
    hayProgreso: modulos.some((m) => m.presente && m.id !== "integracion"),
    bytesTotales: modulos.reduce((total, m) => total + m.bytes, 0),
    almacenamientoDisponible: disponible,
  };
}

export interface RespaldoSesion {
  version: string;
  exportadoEn: string;
  datos: Record<string, string>;
}

/** Exportación completa del estado local: permite reproducir una sesión. */
export function exportarSesion(): RespaldoSesion {
  const datos: Record<string, string> = {};
  for (const modulo of MODULOS) {
    const store = almacen(modulo.ambito);
    try {
      const valor = store?.getItem(modulo.clave);
      if (valor !== null && valor !== undefined) datos[modulo.clave] = valor;
    } catch {
      /* el módulo simplemente no se incluye en el respaldo */
    }
  }
  return { version: SESSION_VERSION, exportadoEn: new Date().toISOString(), datos };
}

export function importarSesion(respaldo: RespaldoSesion): boolean {
  if (!respaldo || respaldo.version !== SESSION_VERSION || typeof respaldo.datos !== "object") {
    return false;
  }
  for (const modulo of MODULOS) {
    const valor = respaldo.datos[modulo.clave];
    const store = almacen(modulo.ambito);
    if (!store) continue;
    try {
      if (typeof valor === "string") store.setItem(modulo.clave, valor);
      else store.removeItem(modulo.clave);
    } catch (error) {
      console.warn(`No se pudo restaurar "${modulo.clave}":`, error);
    }
  }
  return true;
}

/** Reinicio total del progreso local. La interfaz debe confirmarlo antes. */
export function reiniciarSesionCompleta(): void {
  for (const modulo of MODULOS) {
    const store = almacen(modulo.ambito);
    try {
      store?.removeItem(modulo.clave);
    } catch (error) {
      console.warn(`No se pudo limpiar "${modulo.clave}":`, error);
    }
  }
}
