/**
 * Macroentrega 5 · Marcas del cuestionario: preguntas aplazadas.
 *
 * Se guardan aparte de las respuestas para no contaminar el instrumento: una
 * pregunta aplazada NO es una respuesta y no altera el cálculo del diagnóstico.
 */

export const CLAVE_MARCAS_DIAGNOSTICO = "pyme-digital:diagnostico:marcas:v1";

export interface MarcasCuestionario {
  aplazadas: string[];
  actualizadoEn: string | null;
}

export function marcasVacias(): MarcasCuestionario {
  return { aplazadas: [], actualizadoEn: null };
}

export function leerMarcas(): MarcasCuestionario {
  if (typeof window === "undefined") return marcasVacias();
  try {
    const crudo = window.localStorage.getItem(CLAVE_MARCAS_DIAGNOSTICO);
    if (!crudo) return marcasVacias();
    const datos = JSON.parse(crudo) as Partial<MarcasCuestionario>;
    return {
      aplazadas: Array.isArray(datos.aplazadas) ? datos.aplazadas.filter((x) => typeof x === "string") : [],
      actualizadoEn: datos.actualizadoEn ?? null,
    };
  } catch (error) {
    console.warn("No se pudieron leer las marcas del cuestionario:", error);
    return marcasVacias();
  }
}

export function guardarMarcas(marcas: MarcasCuestionario): MarcasCuestionario {
  const siguiente: MarcasCuestionario = { ...marcas, actualizadoEn: new Date().toISOString() };
  if (typeof window === "undefined") return siguiente;
  try {
    window.localStorage.setItem(CLAVE_MARCAS_DIAGNOSTICO, JSON.stringify(siguiente));
  } catch (error) {
    console.warn("No se pudieron guardar las marcas del cuestionario:", error);
  }
  return siguiente;
}

export function alternarAplazada(marcas: MarcasCuestionario, preguntaId: string): MarcasCuestionario {
  const existe = marcas.aplazadas.includes(preguntaId);
  return {
    ...marcas,
    aplazadas: existe
      ? marcas.aplazadas.filter((id) => id !== preguntaId)
      : [...marcas.aplazadas, preguntaId],
  };
}

export function limpiarMarcas(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(CLAVE_MARCAS_DIAGNOSTICO);
}
