/**
 * Persistencia del Roadmap (POC-06, sección 16).
 * Almacenamiento local versionado, indexado por ejecución del motor para que
 * cada diagnóstico o escenario conserve su propio plan entre sesiones.
 */

import { ROADMAP_VERSION, type Roadmap } from "./tipos";

const CLAVE = "pyme-digital:roadmap:v1";

interface Almacen {
  version: string;
  roadmaps: Record<string, Roadmap>;
}

const vacio: Almacen = { version: ROADMAP_VERSION, roadmaps: {} };

function leerAlmacen(): Almacen {
  if (typeof window === "undefined") return vacio;
  try {
    const bruto = window.localStorage.getItem(CLAVE);
    if (!bruto) return vacio;
    const parseado = JSON.parse(bruto) as Almacen;
    if (!parseado || typeof parseado !== "object" || !parseado.roadmaps) return vacio;
    if (parseado.version !== ROADMAP_VERSION) {
      // Migración conservadora: se descarta el estado de versiones anteriores.
      return vacio;
    }
    return parseado;
  } catch (error) {
    console.warn("No se pudo leer el Roadmap almacenado:", error);
    return vacio;
  }
}

export function leerRoadmap(executionId: string): Roadmap | null {
  return leerAlmacen().roadmaps[executionId] ?? null;
}

export function guardarRoadmap(roadmap: Roadmap): boolean {
  if (typeof window === "undefined") return false;
  try {
    const almacen = leerAlmacen();
    const siguiente: Almacen = {
      version: ROADMAP_VERSION,
      roadmaps: { ...almacen.roadmaps, [roadmap.executionId]: roadmap },
    };
    window.localStorage.setItem(CLAVE, JSON.stringify(siguiente));
    return true;
  } catch (error) {
    console.warn("No se pudo guardar el Roadmap:", error);
    return false;
  }
}

export function borrarRoadmap(executionId: string): void {
  if (typeof window === "undefined") return;
  try {
    const almacen = leerAlmacen();
    const { [executionId]: _descartado, ...resto } = almacen.roadmaps;
    window.localStorage.setItem(
      CLAVE,
      JSON.stringify({ version: ROADMAP_VERSION, roadmaps: resto })
    );
  } catch (error) {
    console.warn("No se pudo reiniciar el Roadmap:", error);
  }
}

export function borrarTodosLosRoadmaps(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(CLAVE);
  } catch (error) {
    console.warn("No se pudo limpiar el almacenamiento del Roadmap:", error);
  }
}
