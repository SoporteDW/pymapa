/**
 * PYM-NOV-MVP31 · Plan de Transformación integral 6D/31C (consolidación pura).
 *
 * Proyecta propuestas de acción trazables desde dos fuentes con autoridad
 * explícita y distinta:
 *
 * - INSTITUTIONAL_FINDING: hallazgos del Engine con lifecycle CONFIRMED
 *   (hoy solo posible en OP-01/OP-02, los packs con reglas publicadas).
 * - ASSISTED_ANALYSIS: elementos del análisis asistido DEC-053 (provisional,
 *   nunca hallazgo institucional ni puntaje).
 *
 * El módulo no crea recomendaciones ni infiere estados: el texto de cada
 * propuesta proviene literalmente de su fuente y toda decisión empresarial
 * (aceptar, modificar, descartar) se persiste aparte, append-only.
 */

export type AutoridadPropuesta = "INSTITUTIONAL_FINDING" | "ASSISTED_ANALYSIS";
export type DecisionPropuesta = "ACCEPTED" | "MODIFIED" | "DISCARDED";

export interface FilaHallazgoPlan {
  id: string;
  organization_id: string;
  capability_id: string;
  finding_ref: string;
  polarity: string;
  lifecycle_state: string;
  detail: Record<string, unknown> | null;
  created_at: string;
}

export interface ItemAnalisisPlan {
  id: string;
  category: string;
  statement: string;
  quote: string | null;
}

export interface FilaAnalisisPlan {
  id: string;
  organization_id: string;
  capability_id: string;
  contract_version: string;
  model: string;
  items: ItemAnalisisPlan[];
  created_at: string;
}

export interface FilaRevisionPlan {
  analysis_id: string;
  item_id: string;
  decision: string;
}

export interface FilaDecisionPlan {
  organization_id: string;
  proposal_key: string;
  decision: DecisionPropuesta;
  modified_action: string | null;
  note: string;
  created_at: string;
}

export interface EntradaCatalogo {
  capabilityId: string;
  name: string;
  domainId: string;
}

export interface PropuestaTransformacion {
  /** Clave estable y trazable: `FINDING:<uuid>` o `AI:<analysisId>:<itemId>`. */
  key: string;
  capabilityId: string;
  autoridad: AutoridadPropuesta;
  titulo: string;
  accionPropuesta: string;
  categoria: string | null;
  cita: string | null;
  fuente: {
    findingId: string | null;
    findingRef: string | null;
    analysisId: string | null;
    itemId: string | null;
    contractVersion: string | null;
    model: string | null;
  };
  revisionHumana: string | null;
  decision: { decision: DecisionPropuesta; note: string; modifiedAction: string | null; decidedAt: string } | null;
}

export interface CapacidadPlan {
  capabilityId: string;
  name: string;
  propuestas: PropuestaTransformacion[];
}

export interface DominioPlan {
  domainId: string;
  capacidades: CapacidadPlan[];
}

/** Encuadre presentacional por categoría DEC-053; el contenido es siempre literal de la fuente. */
const ENCABEZADO_ACCION_IA: Record<string, string> = {
  SUPPORTED_FACT: "Dar seguimiento al hecho respaldado",
  INFERENCE: "Verificar la inferencia antes de actuar",
  UNCERTAINTY: "Resolver la incertidumbre declarada",
  INFORMATION_GAP: "Completar la información faltante",
  PROVISIONAL_SUGGESTION: "Valorar la sugerencia provisional",
};

export function clavePropuestaHallazgo(findingId: string): string {
  return `FINDING:${findingId}`;
}

export function clavePropuestaAnalisis(analysisId: string, itemId: string): string {
  return `AI:${analysisId}:${itemId}`;
}

/**
 * Consolida el plan. Aislamiento defensivo además de RLS: se descarta
 * cualquier fila ajena a la organización. La decisión vigente por propuesta
 * es la más reciente; el historial completo queda en la tabla.
 */
export function consolidarPlanTransformacion(
  organizationId: string,
  catalogo: readonly EntradaCatalogo[],
  filas: {
    findings: FilaHallazgoPlan[];
    analyses: FilaAnalisisPlan[];
    reviews: FilaRevisionPlan[];
    decisions: FilaDecisionPlan[];
  },
): { dominios: DominioPlan[]; resumen: { total: number; institucionales: number; asistidas: number; decididas: number; porDecision: Record<string, number> } } {
  const deOrg = <T extends { organization_id: string }>(xs: T[]) => xs.filter((x) => x.organization_id === organizationId);

  // Decisión vigente por clave (la más reciente gana; append-only en base).
  const decisiones = new Map<string, FilaDecisionPlan>();
  for (const d of deOrg(filas.decisions).slice().sort((a, b) => a.created_at.localeCompare(b.created_at))) {
    decisiones.set(d.proposal_key, d);
  }
  const decisionDe = (key: string): PropuestaTransformacion["decision"] => {
    const d = decisiones.get(key);
    return d ? { decision: d.decision, note: d.note, modifiedAction: d.modified_action, decidedAt: d.created_at } : null;
  };

  const revisiones = new Map<string, string>();
  for (const r of filas.reviews) revisiones.set(`${r.analysis_id}:${r.item_id}`, r.decision);

  const propuestas: PropuestaTransformacion[] = [];

  // Hallazgos institucionales: solo CONFIRMED (autoridad gobernada).
  for (const f of deOrg(filas.findings)) {
    if (f.lifecycle_state !== "CONFIRMED") continue;
    const nombre = (f.detail?.["name"] as string | undefined) ?? f.finding_ref;
    propuestas.push({
      key: clavePropuestaHallazgo(f.id),
      capabilityId: f.capability_id,
      autoridad: "INSTITUTIONAL_FINDING",
      titulo: nombre,
      accionPropuesta: `Atender el hallazgo institucional «${nombre}» (${f.finding_ref}) en ${f.capability_id}.`,
      categoria: null,
      cita: null,
      fuente: { findingId: f.id, findingRef: f.finding_ref, analysisId: null, itemId: null, contractVersion: null, model: null },
      revisionHumana: null,
      decision: null,
    });
  }

  // Análisis asistido: solo el más reciente por capacidad (los anteriores
  // quedan como historial append-only, no alimentan el plan vigente).
  const ultimoPorCapacidad = new Map<string, FilaAnalisisPlan>();
  for (const a of deOrg(filas.analyses)) {
    const prev = ultimoPorCapacidad.get(a.capability_id);
    if (!prev || a.created_at > prev.created_at) ultimoPorCapacidad.set(a.capability_id, a);
  }
  for (const a of ultimoPorCapacidad.values()) {
    for (const item of a.items) {
      const encabezado = ENCABEZADO_ACCION_IA[item.category] ?? "Valorar el elemento del análisis asistido";
      propuestas.push({
        key: clavePropuestaAnalisis(a.id, item.id),
        capabilityId: a.capability_id,
        autoridad: "ASSISTED_ANALYSIS",
        titulo: item.statement,
        accionPropuesta: `${encabezado}: ${item.statement}`,
        categoria: item.category,
        cita: item.quote,
        fuente: { findingId: null, findingRef: null, analysisId: a.id, itemId: item.id, contractVersion: a.contract_version, model: a.model },
        revisionHumana: revisiones.get(`${a.id}:${item.id}`) ?? null,
        decision: null,
      });
    }
  }

  for (const p of propuestas) p.decision = decisionDe(p.key);

  // Proyección 6D/31C: todos los dominios y capacidades del catálogo,
  // aunque no tengan propuestas todavía.
  const dominios: DominioPlan[] = [];
  const porDominio = new Map<string, DominioPlan>();
  for (const c of catalogo) {
    let d = porDominio.get(c.domainId);
    if (!d) {
      d = { domainId: c.domainId, capacidades: [] };
      porDominio.set(c.domainId, d);
      dominios.push(d);
    }
    d.capacidades.push({
      capabilityId: c.capabilityId,
      name: c.name,
      propuestas: propuestas
        .filter((p) => p.capabilityId === c.capabilityId)
        .sort((x, y) => (x.autoridad === y.autoridad ? x.titulo.localeCompare(y.titulo) : x.autoridad === "INSTITUTIONAL_FINDING" ? -1 : 1)),
    });
  }

  const porDecision: Record<string, number> = {};
  let decididas = 0;
  for (const p of propuestas) {
    if (!p.decision) continue;
    decididas++;
    porDecision[p.decision.decision] = (porDecision[p.decision.decision] ?? 0) + 1;
  }

  return {
    dominios,
    resumen: {
      total: propuestas.length,
      institucionales: propuestas.filter((p) => p.autoridad === "INSTITUTIONAL_FINDING").length,
      asistidas: propuestas.filter((p) => p.autoridad === "ASSISTED_ANALYSIS").length,
      decididas,
      porDecision,
    },
  };
}
