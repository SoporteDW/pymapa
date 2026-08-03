/**
 * MC-04 · Síntesis de hallazgos (POC-04, secciones 4 y 12).
 * Agrupa reglas activadas en hallazgos únicos por capacidad, evita duplicados,
 * detecta capacidades parciales y marca hipótesis de baja confianza.
 */

import {
  CONFIANZA_HIPOTESIS,
  nombreDimension,
  obtenerCapacidad,
  severidadNumerica,
} from "./catalogo";
import { mensajeDe } from "./mensajes";
import type { Hallazgo, NombreSeveridad, ReglaActivada } from "./tipos";

const TIPOS_NEGATIVOS = new Set(["brecha", "riesgo", "oportunidad", "dependencia"]);

function severidadMayor(a: NombreSeveridad, b: NombreSeveridad): NombreSeveridad {
  return (severidadNumerica[a] ?? 0) >= (severidadNumerica[b] ?? 0) ? a : b;
}

/** Agrupa por dimensión, capacidad y tipo de salida: una conclusión por capacidad. */
export function sintetizarHallazgos(activadas: ReglaActivada[]): Hallazgo[] {
  const grupos = new Map<string, ReglaActivada[]>();
  for (const regla of activadas) {
    const clave = `${regla.dimensionId}|${regla.capacidadId ?? "GEN"}|${regla.outputType}`;
    const lista = grupos.get(clave) ?? [];
    lista.push(regla);
    grupos.set(clave, lista);
  }

  const hallazgos: Hallazgo[] = [];

  for (const [clave, reglas] of grupos) {
    const [dimensionId, capacidadClave, outputType] = clave.split("|") as [
      string,
      string,
      Hallazgo["tipo"],
    ];
    const capacidad = capacidadClave === "GEN" ? undefined : obtenerCapacidad(capacidadClave);
    // Se conserva el mensaje de la regla de mayor severidad como hallazgo principal.
    const principal = [...reglas].sort(
      (a, b) => (severidadNumerica[b.severity] ?? 0) - (severidadNumerica[a.severity] ?? 0)
    )[0]!;
    const mensaje = mensajeDe(principal.messageKey);
    const severidad = reglas.reduce<NombreSeveridad>(
      (acumulada, r) => severidadMayor(acumulada, r.severity),
      "informativa"
    );
    // Confianza conservadora: la menor de las reglas agrupadas (no sobrediagnóstico).
    const confianza = Math.min(...reglas.map((r) => r.confianza));
    const evidencia = [...new Set(reglas.flatMap((r) => r.evidencia))].sort();
    const senales = [...new Set(reglas.flatMap((r) => r.senales))].sort();
    const habilitadaPor = reglas.find((r) => r.habilitadaPor)?.habilitadaPor;

    hallazgos.push({
      id: `H-${dimensionId}-${capacidadClave}-${outputType.toUpperCase()}`,
      tipo: outputType,
      dimensionId,
      dimensionNombre: nombreDimension(dimensionId),
      capacidadId: capacidad?.id ?? null,
      capacidadNombre: capacidad?.nombre ?? null,
      titulo: mensaje.titulo,
      estadoActual: mensaje.estadoActual,
      implicacion: mensaje.implicacion,
      severidad,
      severidadNivel: severidadNumerica[severidad] ?? 1,
      confianza: Math.round(confianza * 100) / 100,
      esHipotesis: confianza < CONFIANZA_HIPOTESIS,
      evidencia,
      senales,
      reglas: reglas
        .map((r) => ({ ruleId: r.ruleId, version: r.ruleVersion }))
        .sort((a, b) => a.ruleId.localeCompare(b.ruleId)),
      escalaCritica: reglas.some((r) => r.escalaCritica),
      ...(habilitadaPor ? { habilitadaPor } : {}),
    });
  }

  // Fortaleza y brecha sobre la misma capacidad → capacidad parcial (POC-04, 12).
  const capacidadesNegativas = new Set(
    hallazgos.filter((h) => TIPOS_NEGATIVOS.has(h.tipo) && h.capacidadId).map((h) => h.capacidadId!)
  );
  for (const hallazgo of hallazgos) {
    if (hallazgo.tipo !== "fortaleza" || !hallazgo.capacidadId) continue;
    if (!capacidadesNegativas.has(hallazgo.capacidadId)) continue;
    hallazgo.tipo = "capacidad_parcial";
    hallazgo.titulo = `${hallazgo.titulo} (capacidad parcial)`;
    hallazgo.estadoActual = `${hallazgo.estadoActual} Al mismo tiempo, se detectaron carencias en la misma capacidad.`;
    hallazgo.implicacion =
      "La práctica existe de forma incompleta: conviene explicar la diferencia entre lo que ya funciona y lo que falta.";
  }

  return hallazgos.sort(
    (a, b) => b.severidadNivel - a.severidadNivel || a.id.localeCompare(b.id)
  );
}
