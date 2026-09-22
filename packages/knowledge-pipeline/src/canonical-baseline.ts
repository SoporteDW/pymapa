/**
 * Baseline canónica de capacidad (M2-OP02-01).
 *
 * Una baseline canónica conserva TODOS los objetos gobernados de la fuente
 * histórica de una capacidad —incluidos los que el runtime genérico todavía no
 * puede ejecutar— con anclaje literal a la transcripción raw.
 *
 * Invariantes verificadas (genéricas, sin branching por capabilityId):
 * - La transcripción raw coincide byte a byte con su sha256 declarado.
 * - Todo valor textual de `fields`, `sourceId`, `status`, provenance y
 *   anotaciones aparece literalmente en su rango de líneas.
 * - La procedencia solo usa el vocabulario declarado por la propia fuente.
 * - Las referencias *Ref resuelven a objetos existentes.
 * - Los conteos de control declarados por la fuente coinciden con los objetos.
 * - La proyección ejecutable (source.json) solo contiene texto literal de la
 *   fuente en sus claves verbatim y preserva los gaps canon-only.
 *
 * La baseline NO interpreta, completa ni normaliza conocimiento.
 */
import { z } from "zod";
import { sha256Hex } from "./checksum.ts";
import { GAP_KINDS, MASTER_IDENTITY, BASELINE_STATUS } from "./master.ts";

const NOT_EXPLICIT = "NOT_EXPLICIT_IN_KNOWLEDGE_MASTER";
const lineRange = z.tuple([z.number().int().positive(), z.number().int().positive()]);

const fieldValue: z.ZodType<unknown> = z.lazy(() =>
  z.union([z.string(), z.array(fieldValue), z.record(z.string(), fieldValue)]),
);

export const canonicalObjectSchema = z.object({
  key: z.string().min(1),
  objectType: z.string().regex(/^[A-Z][A-Z0-9_]*$/),
  sourceId: z.string().min(1).nullable(),
  fields: z.record(z.string(), fieldValue),
  sourceLines: lineRange,
  status: z.string().optional(),
  role: z.string().optional(),
  provenance: z.object({ classes: z.array(z.string().min(1)).min(1), sourceLines: lineRange }).optional(),
  annotations: z
    .array(
      z.object({
        relation: z.string().min(1),
        fields: z.record(z.string(), fieldValue),
        sourceLines: lineRange,
      }),
    )
    .optional(),
});
export type CanonicalObject = z.infer<typeof canonicalObjectSchema>;

const anchoredText = z.object({ text: z.string().min(1), sourceLines: lineRange });

export const canonicalBaselineSchema = z.object({
  $schema: z.string().optional(),
  baselineId: z.string().min(1),
  capabilityId: z.string().min(1),
  master: z.object({
    identity: z.literal(MASTER_IDENTITY),
    version: z.string().min(1),
    baselineStatus: z.literal(BASELINE_STATUS),
  }),
  historicalStatus: z.object({ marker: z.string().min(1), sourceLines: lineRange }),
  rawSource: z.object({
    ref: z.string().min(1),
    sha256: z.string().regex(/^[0-9a-f]{64}$/),
    byteLength: z.number().int().positive(),
    lineCount: z.number().int().positive(),
    transcription: z.object({ tool: z.string().min(1), arguments: z.string() }),
    originalDocument: z.object({
      filename: z.string().min(1),
      byteLength: z.number().int().positive(),
      sha256: z.string().regex(/^[0-9a-f]{64}$/),
    }),
  }),
  provenanceVocabulary: z
    .array(
      z.object({
        code: z.string().min(1),
        label: z.string().min(1),
        meaning: z.string().min(1),
        sourceLines: lineRange,
      }),
    )
    .min(1),
  controlCounts: z.array(
    z.object({
      label: z.string().min(1),
      declared: z.number().int().nonnegative(),
      objectType: z.string().min(1),
      role: z.string().optional(),
      sourceLines: lineRange,
    }),
  ),
  objects: z.array(canonicalObjectSchema).min(1),
  supersessions: z.array(
    z.object({
      relation: z.enum(["SUPERSEDED_BY", "STATUS_SUPERSEDED_BY"]),
      superseded: anchoredText,
      supersededBy: anchoredText.extend({ objectKey: z.string().min(1) }),
    }),
  ),
  executableProjection: z.object({
    sourceRef: z.string().min(1),
    verbatimKeys: z.array(z.string().min(1)).min(1),
    projectedObjectTypes: z.array(z.string().min(1)),
    canonicalOnlyGapRefs: z.array(z.string().min(1)),
  }),
  gaps: z.array(
    z.object({
      id: z.string().min(1),
      kind: z.enum(GAP_KINDS),
      statement: z.string().min(1),
      publicationBlocking: z.boolean(),
      objectTypes: z.array(z.string().min(1)).optional(),
    }),
  ),
  checksum: z.string().regex(/^sha256:[0-9a-f]{64}$/),
});
export type CanonicalBaseline = z.infer<typeof canonicalBaselineSchema>;

export interface CanonicalIssue {
  code:
    | "SCHEMA"
    | "RAW_INTEGRITY"
    | "LINE_RANGE"
    | "NOT_VERBATIM"
    | "DUPLICATE_KEY"
    | "UNKNOWN_PROVENANCE_CLASS"
    | "UNRESOLVED_REFERENCE"
    | "CONTROL_COUNT_MISMATCH"
    | "SUPERSESSION"
    | "PROJECTION_NOT_VERBATIM"
    | "PROJECTION_IDENTITY"
    | "GAP_NOT_PRESERVED";
  path: string;
  message: string;
}

export interface CanonicalBaselineSummary {
  capabilityId: string;
  baselineId: string;
  objectCount: number;
  objectTypeCounts: Record<string, number>;
  controlCounts: { label: string; declared: number; materialized: number }[];
  supersessionCount: number;
  gapCount: number;
  genericRuntimeExtensionCount: number;
  notExplicitCount: number;
}

export interface CanonicalBaselineValidation {
  ok: boolean;
  issues: CanonicalIssue[];
  summary: CanonicalBaselineSummary | null;
}

function* hojas(valor: unknown): Generator<string> {
  if (typeof valor === "string") yield valor;
  else if (Array.isArray(valor)) for (const v of valor) yield* hojas(v);
  else if (valor && typeof valor === "object")
    for (const v of Object.values(valor as Record<string, unknown>)) yield* hojas(v);
}

export interface CanonicalBaselineInput {
  baseline: unknown;
  /** Transcripción raw exacta (utf-8). */
  rawText: string;
  /** Bytes de la transcripción raw para verificar identidad. */
  rawBytes: Uint8Array;
  /** Proyección ejecutable (source.json) cuando existe. */
  source?: { capability: { id: string }; sections: Record<string, unknown>; gaps: { id: string; kind: string }[] } | undefined;
}

export function validateCanonicalBaseline(input: CanonicalBaselineInput): CanonicalBaselineValidation {
  const issues: CanonicalIssue[] = [];
  const parsed = canonicalBaselineSchema.safeParse(input.baseline);
  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.map((i) => ({
        code: "SCHEMA" as const,
        path: i.path.join("."),
        message: i.message,
      })),
      summary: null,
    };
  }
  const b = parsed.data;
  const lineas = input.rawText.split("\n");

  // Identidad de la transcripción raw.
  const sha = sha256Hex(input.rawText);
  if (sha !== b.rawSource.sha256) {
    issues.push({ code: "RAW_INTEGRITY", path: "rawSource.sha256", message: `sha256 raw ${sha} ≠ declarado` });
  }
  if (input.rawBytes.byteLength !== b.rawSource.byteLength) {
    issues.push({ code: "RAW_INTEGRITY", path: "rawSource.byteLength", message: "longitud raw ≠ declarada" });
  }
  if (lineas.length !== b.rawSource.lineCount) {
    issues.push({ code: "RAW_INTEGRITY", path: "rawSource.lineCount", message: "número de líneas raw ≠ declarado" });
  }

  const tramo = (rango: [number, number], path: string): string | null => {
    const [a, z2] = rango;
    if (a > z2 || z2 > lineas.length) {
      issues.push({ code: "LINE_RANGE", path, message: `rango de líneas inválido ${a}-${z2}` });
      return null;
    }
    return lineas.slice(a - 1, z2).join("\n");
  };
  const literal = (valores: Iterable<string>, rango: [number, number], path: string) => {
    const texto = tramo(rango, path);
    if (texto === null) return;
    for (const v of valores) {
      if (!texto.includes(v)) {
        issues.push({
          code: "NOT_VERBATIM",
          path,
          message: `"${v.slice(0, 80)}" no aparece literalmente en líneas ${rango[0]}-${rango[1]}`,
        });
      }
    }
  };

  literal([b.historicalStatus.marker], b.historicalStatus.sourceLines, "historicalStatus");
  b.provenanceVocabulary.forEach((p, i) =>
    literal([p.code, p.label, p.meaning], p.sourceLines, `provenanceVocabulary.${i}`),
  );
  const codigos = new Set(b.provenanceVocabulary.map((p) => p.code));

  const porClave = new Map<string, CanonicalObject>();
  const porSourceId = new Map<string, CanonicalObject[]>();
  b.objects.forEach((o, i) => {
    const path = `objects.${i}(${o.key})`;
    if (porClave.has(o.key)) issues.push({ code: "DUPLICATE_KEY", path, message: `clave duplicada ${o.key}` });
    porClave.set(o.key, o);
    if (o.sourceId) porSourceId.set(o.sourceId, [...(porSourceId.get(o.sourceId) ?? []), o]);
    const extra = [o.sourceId, o.status].filter((x): x is string => typeof x === "string");
    literal([...hojas(o.fields), ...extra], o.sourceLines, `${path}.fields`);
    if (o.provenance) {
      literal(o.provenance.classes, o.provenance.sourceLines, `${path}.provenance`);
      o.provenance.classes.forEach((c) => {
        if (!codigos.has(c)) {
          issues.push({
            code: "UNKNOWN_PROVENANCE_CLASS",
            path: `${path}.provenance`,
            message: `clase de procedencia fuera del vocabulario de la fuente: ${c}`,
          });
        }
      });
    }
    (o.annotations ?? []).forEach((an, j) =>
      literal(hojas(an.fields), an.sourceLines, `${path}.annotations.${j}`),
    );
  });

  // Referencias *Ref → sourceId existente.
  b.objects.forEach((o, i) => {
    for (const [campo, valor] of Object.entries(o.fields)) {
      if (!campo.endsWith("Ref") || typeof valor !== "string") continue;
      if (!porSourceId.has(valor)) {
        issues.push({
          code: "UNRESOLVED_REFERENCE",
          path: `objects.${i}(${o.key}).fields.${campo}`,
          message: `referencia sin objeto: ${valor}`,
        });
      }
    }
  });

  // Conteos de control declarados por la fuente.
  const conteos = b.controlCounts.map((c, i) => {
    literal([c.label, String(c.declared)], c.sourceLines, `controlCounts.${i}`);
    const materializados = b.objects.filter(
      (o) => o.objectType === c.objectType && (c.role === undefined || o.role === c.role),
    ).length;
    if (materializados !== c.declared) {
      issues.push({
        code: "CONTROL_COUNT_MISMATCH",
        path: `controlCounts.${i}`,
        message: `${c.label}: la fuente declara ${c.declared} y hay ${materializados} objetos ${c.objectType}`,
      });
    }
    return { label: c.label, declared: c.declared, materialized: materializados };
  });

  b.supersessions.forEach((s, i) => {
    literal([s.superseded.text], s.superseded.sourceLines, `supersessions.${i}.superseded`);
    literal([s.supersededBy.text], s.supersededBy.sourceLines, `supersessions.${i}.supersededBy`);
    if (!porClave.has(s.supersededBy.objectKey)) {
      issues.push({
        code: "SUPERSESSION",
        path: `supersessions.${i}`,
        message: `objeto vigente inexistente: ${s.supersededBy.objectKey}`,
      });
    }
  });

  const gapIds = new Set(b.gaps.map((g) => g.id));
  b.executableProjection.canonicalOnlyGapRefs.forEach((ref) => {
    if (!gapIds.has(ref)) {
      issues.push({ code: "GAP_NOT_PRESERVED", path: "executableProjection", message: `gap inexistente ${ref}` });
    }
  });

  if (input.source) {
    if (input.source.capability.id !== b.capabilityId) {
      issues.push({ code: "PROJECTION_IDENTITY", path: "source.capability.id", message: "identidad ≠ baseline" });
    }
    const verbatim = new Set(b.executableProjection.verbatimKeys);
    const recorrer = (valor: unknown, path: string, clave: string | null) => {
      if (typeof valor === "string") {
        if (clave && verbatim.has(clave) && valor !== NOT_EXPLICIT && !input.rawText.includes(valor)) {
          issues.push({
            code: "PROJECTION_NOT_VERBATIM",
            path,
            message: `"${valor.slice(0, 80)}" no es texto literal de la fuente`,
          });
        }
      } else if (Array.isArray(valor)) {
        valor.forEach((v, k) => recorrer(v, `${path}[${k}]`, clave));
      } else if (valor && typeof valor === "object") {
        for (const [k, v] of Object.entries(valor as Record<string, unknown>)) recorrer(v, `${path}.${k}`, k);
      }
    };
    for (const [k, v] of Object.entries(input.source.sections)) {
      if (k === "governanceNote") continue;
      recorrer(v, `source.sections.${k}`, k);
    }
    const fuenteGaps = new Set(input.source.gaps.map((g) => g.id));
    b.gaps.forEach((g) => {
      if (!fuenteGaps.has(g.id)) {
        issues.push({
          code: "GAP_NOT_PRESERVED",
          path: `gaps.${g.id}`,
          message: "gap de la baseline ausente en la proyección ejecutable",
        });
      }
    });
  }

  const objectTypeCounts: Record<string, number> = {};
  b.objects.forEach((o) => (objectTypeCounts[o.objectType] = (objectTypeCounts[o.objectType] ?? 0) + 1));

  return {
    ok: issues.length === 0,
    issues,
    summary: {
      capabilityId: b.capabilityId,
      baselineId: b.baselineId,
      objectCount: b.objects.length,
      objectTypeCounts,
      controlCounts: conteos,
      supersessionCount: b.supersessions.length,
      gapCount: b.gaps.length,
      genericRuntimeExtensionCount: b.gaps.filter((g) => g.kind === "GENERIC_RUNTIME_EXTENSION_REQUIRED").length,
      notExplicitCount: b.gaps.filter((g) => g.kind === "NOT_EXPLICIT_IN_KNOWLEDGE_MASTER").length,
    },
  };
}
