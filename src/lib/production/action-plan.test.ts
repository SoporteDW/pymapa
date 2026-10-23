import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { consolidarPlanDeAccion } from "./action-plan";
import { destinoRutaLegacy, navegacionProductiva } from "./entrada";

const A = "org-a", B = "org-b";
const filas = () => ({
  interventions: [
    { id: "i1", organization_id: A, finding_id: "f1", title: "Calibrar", status: "ACCEPTED", created_at: "t" },
    { id: "i2", organization_id: A, finding_id: "f2", title: "Ordenar datos", status: "ACCEPTED", created_at: "t" },
    { id: "iB", organization_id: B, finding_id: "fB", title: "Ajena", status: "ACCEPTED", created_at: "t" },
  ],
  activities: [
    { id: "a1", organization_id: A, intervention_id: "i1", title: "Documentar", state: "PENDING", responsible_label: "Jefe de planta", due_date: "2026-12-15", done_at: null, created_at: "t" },
    { id: "a1", organization_id: A, intervention_id: "i1", title: "Documentar", state: "PENDING", responsible_label: "Jefe de planta", due_date: "2026-12-15", done_at: null, created_at: "t" },
    { id: "a2", organization_id: A, intervention_id: "i2", title: "Limpiar base", state: "EXECUTING", responsible_label: null, due_date: null, done_at: null, created_at: "t" },
    { id: "aB", organization_id: B, intervention_id: "iB", title: "Ajena", state: "PENDING", responsible_label: null, due_date: null, done_at: null, created_at: "t" },
  ],
  deliverables: [{ id: "d1", organization_id: A, activity_id: "a1", title: "Procedimiento", registered_at: "t" }],
  findings: [
    { id: "f1", organization_id: A, capability_id: "OP-01", finding_ref: "H04", lifecycle_state: "CONFIRMED", detail: { name: "Sin calibración" } },
    { id: "f2", organization_id: A, capability_id: "DG-01", finding_ref: "H02", lifecycle_state: "CANDIDATE", detail: null },
    { id: "fB", organization_id: B, capability_id: "OP-01", finding_ref: "H04", lifecycle_state: "CONFIRMED", detail: null },
  ],
});

describe("PYM-BETA-INT-01-ACT · Plan de Acción consolidado", () => {
  it("consolida actividades de distintas capacidades sin duplicarlas", () => {
    const p = consolidarPlanDeAccion(A, filas());
    expect(p.activities.map((a) => a.id).sort()).toEqual(["a1", "a2"]);
    expect(p.summary.capabilities).toBe(2);
  });
  it("conserva hallazgo e intervención de origen, responsable, plazo y entregables persistidos", () => {
    const a1 = consolidarPlanDeAccion(A, filas()).activities.find((a) => a.id === "a1")!;
    expect(a1.capabilityId).toBe("OP-01");
    expect(a1.finding?.ref).toBe("H04");
    expect(a1.intervention.id).toBe("i1");
    expect(a1.responsibleLabel).toBe("Jefe de planta");
    expect(a1.dueDate).toBe("2026-12-15");
    expect(a1.deliverables.map((d) => d.id)).toEqual(["d1"]);
  });
  it("una organización nunca ve actividades de otra", () => {
    expect(consolidarPlanDeAccion(A, filas()).activities.some((a) => a.id === "aB")).toBe(false);
    expect(consolidarPlanDeAccion(B, filas()).activities.map((a) => a.id)).toEqual(["aB"]);
  });
  it("sin actividades el plan queda vacío", () => {
    expect(consolidarPlanDeAccion("org-c", filas()).summary.total).toBe(0);
  });
  it("/plan-de-accion es productivo y está en la navegación; subrutas legacy siguen redirigidas", () => {
    expect(destinoRutaLegacy("/plan-de-accion")).toBeNull();
    expect(destinoRutaLegacy("/plan-de-accion/workspace/x")).toBe("/plan-de-accion");
    expect(navegacionProductiva.map((n) => n.to as string)).toContain("/plan-de-accion");
  });
  it("el servicio exige sesión y la pantalla no usa mocks, localStorage ni emisión REC-01", () => {
    const fn = readFileSync("src/lib/production/action-plan.functions.ts", "utf8");
    expect(fn).toContain("requireSupabaseAuth");
    expect(fn).not.toContain("client.server");
    const page = readFileSync("src/routes/plan-de-accion.index.tsx", "utf8");
    expect(page).not.toMatch(/localStorage|mocks|useActuar|prescriptive/);
  });
});
