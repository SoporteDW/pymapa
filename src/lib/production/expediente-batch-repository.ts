import type { ProductionRepository } from "./puertos";

/** Solo lecturas estables durante el lote; observaciones/evaluaciones siempre frescas. */
export function expedienteBatchRepository(repo: ProductionRepository): ProductionRepository {
  const cache = new Map<string, Promise<unknown>>();
  const estables = new Set(["getAssessment", "getKnowledgeVersion", "getMembershipRole", "listAssignments"]);
  return new Proxy(repo, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof value !== "function") return value;
      const name = String(prop);
      return (...args: unknown[]) => {
        if (name === "insertAssignment" || name === "updateAssignment" || name === "updateAssessment") cache.clear();
        if (!estables.has(name)) return value.apply(target, args);
        const key = `${name}:${JSON.stringify(args)}`;
        let result = cache.get(key);
        if (!result) { result = value.apply(target, args) as Promise<unknown>; cache.set(key, result); }
        return result;
      };
    },
  });
}