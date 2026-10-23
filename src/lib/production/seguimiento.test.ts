import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { consolidarSeguimiento, puedeGestionarSeguimiento } from "./seguimiento";
import { destinoRutaLegacy, navegacionProductiva } from "./entrada";

const A = "org-a", B = "org-b";
const act = (id: string, org: string, itv: string, state: string) => ({ id, organization_id: org, intervention_id: itv, title: id, state, responsible_label: null, due_date: null, done_at: "t", created_at: "t" });
const filas = () => ({
  interventions: [
    { id: "i1", organization_id: A, finding_id: "f1", title: "Calibrar", status: "IN_EXECUTION", created_at: "t" },
    { id: "i2", organization_id: A, finding_id: "f2", title: "Ordenar", status: "IN_EXECUTION", created_at: "t" },
    { id: "iB", organization_id: B, finding_id: "fB", title: "Ajena", status: "IN_EXECUTION", created_at: "t" },
  ],
  activities: [act("a1", A, "i1", "VALIDATED"), act("a2", A, "i2", "FOLLOW_UP"), act("a3", A, "i1", "EXECUTING"), act("a1", A, "i1", "VALIDATED"), act("aB", B, "iB", "VALIDATED")],
  deliverables: [{ id: "d1", organization_id: A, activity_id: "a1", title: "Procedimiento", registered_at: "t" }],
  findings: [
    { id: "f1", organization_id: A, capability_id: "OP-01", finding_ref: "H04", lifecycle_state: "CONFIRMED", detail: null },
    { id: "f2", organization_id: A, capability_id: "DG-01", finding_ref: "H02", lifecycle_state: "CONFIRMED", detail: null },
    { id: "fB", organization_id: B, capability_id: "OP-01", finding_ref: "H04", lifecycle_state: "CONFIRMED", detail: null },
  ],
  validations: [
    { id: "v1", organization_id: A, activity_id: "a1", status: "VALIDATED", decision_reason: "CRV", reviewed_at: "2026-10-01", created_at: "2" },
    { id: "v2", organization_id: A, activity_id: "a2", status: "VALIDATED", decision_reason: "CRV", reviewed_at: "2026-10-01", created_at: "1" },
    { id: "vB", organization_id: B, activity_id: "aB", status: "VALIDATED", decision_reason: null, reviewed_at: null, created_at: "1" },
  ],
  followUps: [
    { id: "fu2", organization_id: A, activity_id: "a2", validation_id: "v2", status: "OPEN", note: null, decided_at: null, created_at: "3" },
    { id: "fuB", organization_id: B, activity_id: "a1", validation_id: "vB", status: "OPEN", note: null, decided_at: null, created_at: "3" },
  ],
});

describe("PYM-BETA-INT-02-SEG · Seguimiento consolidado", () => {
  it("solo incluye estados de seguimiento, multi-capacidad y sin duplicados", () => {
    const s = consolidarSeguimiento(A, filas());
    expect(s.activities.map((a) => a.id).sort()).toEqual(["a1", "a2"]);
    expect(s.summary.capabilities).toBe(2);
  });
  it("aísla filas de otra organización (incluido un follow-up ajeno con mismo activity_id)", () => {
    const s = consolidarSeguimiento(A, filas());
    const a1 = s.activities.find((a) => a.id === "a1")!;
    expect(a1.followUps).toEqual([]);
    expect(a1.openFollowUpId).toBeNull();
    expect(s.activities.some((a) => a.id === "aB")).toBe(false);
  });
  it("iniciar solo en VALIDATED con validación VALIDATED y sin seguimiento abierto", () => {
    const s = consolidarSeguimiento(A, filas());
    expect(s.activities.find((a) => a.id === "a1")!.canStartFollowUp).toBe(true);
    const a2 = s.activities.find((a) => a.id === "a2")!;
    expect(a2.canStartFollowUp).toBe(false);
    expect(a2.openFollowUpId).toBe("fu2");
  });
  it("traza capacidad, hallazgo, intervención, entregables y validación", () => {
    const a1 = consolidarSeguimiento(A, filas()).activities.find((a) => a.id === "a1")!;
    expect(a1.capabilityId).toBe("OP-01");
    expect(a1.finding?.ref).toBe("H04");
    expect(a1.intervention.title).toBe("Calibrar");
    expect(a1.deliverables.map((d) => d.id)).toEqual(["d1"]);
    expect(a1.validation?.id).toBe("v1");
  });
  it("solo OWNER/ADMIN gestionan; MEMBER no", () => {
    expect(puedeGestionarSeguimiento("OWNER")).toBe(true);
    expect(puedeGestionarSeguimiento("ADMIN")).toBe(true);
    expect(puedeGestionarSeguimiento("MEMBER")).toBe(false);
    expect(puedeGestionarSeguimiento(null)).toBe(false);
  });
  it("/seguimiento es productivo y está en la navegación; subrutas legacy redirigidas", () => {
    expect(destinoRutaLegacy("/seguimiento")).toBeNull();
    expect(destinoRutaLegacy("/seguimiento/x")).toBe("/seguimiento");
    expect(navegacionProductiva.map((n) => n.to as string)).toContain("/seguimiento");
  });
  it("boundary exige sesión, rol y nota; la pantalla no usa mocks ni localStorage", () => {
    const fn = readFileSync("src/lib/production/seguimiento.functions.ts", "utf8");
    expect(fn.match(/requireSupabaseAuth\]/g)?.length).toBe(3);
    expect(fn.match(/FOLLOW_UP_ROLE_FORBIDDEN/g)?.length).toBe(2);
    expect(fn).toMatch(/note: z\.string\(\)\.trim\(\)\.min\(1\)\.max\(2000\),/);
    expect(fn).not.toMatch(/updateActivityState|\.update\(/);
    const page = readFileSync("src/routes/seguimiento.index.tsx", "utf8");
    expect(page).not.toMatch(/localStorage|mocks|useSeguimiento/);
  });
});
