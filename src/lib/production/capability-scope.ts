/**
 * PKG-02 · Aislamiento por capacidad dentro de un Assessment compartido.
 *
 * Desde PKG-01 un Assessment BASELINE pinneado a PYMAPA-RUNTIME-MANIFEST cubre
 * las 31 capacidades. Los ids de adquisición (`ACQ·NI01`) y de variable
 * (`VA01`) se repiten entre packs, por lo que sin aislamiento las
 * observaciones de DG-01 contaminarían la evaluación de PC-01.
 *
 * Sin migración: la capacidad se registra en el JSON de la Response
 * (`payload.capabilityId`) y de la Observation (`value.capabilityId`).
 * Filas sin etiqueta son históricas y pertenecen a OP-01 (única capacidad
 * productiva antes de PKG-02). Findings y resolution states ya llevan
 * `capability_id` como columna.
 *
 * Genérico: ningún branching por capacidad salvo la regla histórica.
 */
import type { ProductionRepository } from "./puertos";

export const CAPACIDAD_HISTORICA_SIN_ETIQUETA = "OP-01";

function capacidadDe(etiqueta: unknown): string {
  return typeof etiqueta === "string" && etiqueta.length > 0 ? etiqueta : CAPACIDAD_HISTORICA_SIN_ETIQUETA;
}

export function scopeRepositoryToCapability(
  repo: ProductionRepository,
  capabilityId: string,
): ProductionRepository {
  const scoped: Partial<ProductionRepository> = {
    async insertResponse(input) {
      return repo.insertResponse({ ...input, payload: { ...input.payload, capabilityId } });
    },
    async insertObservation(input) {
      return repo.insertObservation({
        ...input,
        value: { ...input.value, capabilityId } as typeof input.value,
      });
    },
    async listResponses(assessmentId) {
      const filas = await repo.listResponses(assessmentId);
      return filas.filter((r) => capacidadDe(r.payload?.["capabilityId"]) === capabilityId);
    },
    async listObservations(assessmentId) {
      const filas = await repo.listObservations(assessmentId);
      return filas.filter(
        (o) => capacidadDe((o.value as { capabilityId?: unknown }).capabilityId) === capabilityId,
      );
    },
    async listFindings(assessmentId) {
      const filas = await repo.listFindings(assessmentId);
      return filas.filter((f) => f.capabilityId === capabilityId);
    },
    async listFindingResolutionStates(assessmentId) {
      const filas = await repo.listFindingResolutionStates(assessmentId);
      return filas.filter((f) => f.capabilityId === capabilityId);
    },
  };
  return new Proxy(repo, {
    get(target, prop, receiver) {
      if (typeof prop === "string" && prop in scoped) {
        return scoped[prop as keyof ProductionRepository];
      }
      const valor = Reflect.get(target, prop, receiver);
      return typeof valor === "function" ? valor.bind(target) : valor;
    },
  });
}

/** Memoiza lecturas get/list de una petición de solo lectura (hub). */
export function memoizeReads(repo: ProductionRepository): ProductionRepository {
  const cache = new Map<string, Promise<unknown>>();
  return new Proxy(repo, {
    get(target, prop, receiver) {
      const valor = Reflect.get(target, prop, receiver);
      if (typeof valor !== "function") return valor;
      const nombre = String(prop);
      if (!/^(get|list)/.test(nombre)) return valor.bind(target);
      return (...args: unknown[]) => {
        const clave = `${nombre}:${JSON.stringify(args)}`;
        if (!cache.has(clave)) cache.set(clave, (valor as (...a: unknown[]) => Promise<unknown>).apply(target, args));
        return cache.get(clave);
      };
    },
  });
}
