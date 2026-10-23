/**
 * PILOT-READY-01 · PKG-02A · Entrada pública y onboarding de empresa real.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  NOMBRE_ORGANIZACION_PROVISIONAL,
  destinoProductivo,
  esRutaProductiva,
  navegacionProductiva,
  requiereNombreEmpresa,
  rutaCtaPrincipal,
  validarNombreEmpresa,
} from "./entrada";
import { getCompanyHandler, updateCompanyNameHandler, updateCompanyNameInput, type CompanyDeps } from "./company-handlers";

const leer = (...p: string[]) => readFileSync(join(process.cwd(), ...p), "utf8");

/** Cliente falso que emula RLS: el usuario solo ve/actualiza orgs donde es miembro (OWNER/ADMIN para update). */
function falsoDb(estado: {
  orgs: Record<string, string>;
  memberships: { user_id: string; organization_id: string; role: string }[];
  userId: string;
}) {
  const esMiembro = (org: string) => estado.memberships.some((m) => m.user_id === estado.userId && m.organization_id === org);
  const esAdmin = (org: string) =>
    estado.memberships.some((m) => m.user_id === estado.userId && m.organization_id === org && ["OWNER", "ADMIN"].includes(m.role));
  return {
    from(tabla: string) {
      const filtros: Record<string, unknown> = {};
      let cambio: Record<string, unknown> | null = null;
      const q = {
        select: () => q,
        eq: (c: string, v: unknown) => ((filtros[c] = v), q),
        update: (v: Record<string, unknown>) => ((cambio = v), q),
        maybeSingle: async () => {
          if (tabla === "memberships") {
            const m = estado.memberships.find(
              (x) => x.user_id === filtros["user_id"] && x.organization_id === filtros["organization_id"] && x.user_id === estado.userId,
            );
            return { data: m ? { role: m.role } : null, error: null };
          }
          const id = filtros["id"] as string;
          if (cambio) {
            if (!esAdmin(id) || !(id in estado.orgs)) return { data: null, error: null };
            estado.orgs[id] = cambio["name"] as string;
            return { data: { id, name: estado.orgs[id] }, error: null };
          }
          return { data: esMiembro(id) && id in estado.orgs ? { id, name: estado.orgs[id] } : null, error: null };
        },
        then: undefined,
      };
      return q;
    },
  };
}

function deps(orgPorUsuario: Record<string, string>, llamadas: string[] = []): CompanyDeps {
  return {
    asegurar: async (_db, userId) => {
      llamadas.push(userId);
      return { organizationId: orgPorUsuario[userId] ?? "", caseId: `case-${userId}`, id: `as-${userId}` };
    },
  };
}

describe("PKG-02A · A. Entrada pública", () => {
  it("CTA principal sin sesión → /acceso", () => expect(rutaCtaPrincipal(false)).toBe("/acceso"));
  it("CTA principal con sesión → journey productivo (/empresa → hub)", () => {
    expect(rutaCtaPrincipal(true)).toBe("/empresa");
    expect(destinoProductivo(NOMBRE_ORGANIZACION_PROVISIONAL)).toBe("/empresa");
    expect(destinoProductivo("Ferretería Sol")).toBe("/diagnostico-productivo");
  });
  it("La Home no enlaza el CTA principal a /perfil legacy", () => {
    const home = leer("src/routes/index.tsx");
    expect(home).toContain("rutaCtaPrincipal");
    expect(home).not.toContain('to="/perfil"');
    // UX-PROD-FIX-02 · Sin demo simulada aparte: la Home ya no enlaza a Moda Origen.
    expect(home).not.toContain('to="/moda-origen"');
  });
  it("Tras iniciar sesión, /acceso lleva al onboarding productivo", () => {
    expect(leer("src/routes/acceso.tsx")).toContain('navigate({ to: "/empresa"');
  });
});

describe("PKG-02A · B. Empresa nueva", () => {
  it("nombre provisional exige onboarding; nombre real no", () => {
    expect(requiereNombreEmpresa(NOMBRE_ORGANIZACION_PROVISIONAL)).toBe(true);
    expect(requiereNombreEmpresa("")).toBe(true);
    expect(requiereNombreEmpresa("Moda Real SAS")).toBe(false);
  });
  it("validación del nombre: requerido, sin provisional, longitud acotada", () => {
    expect(validarNombreEmpresa("  Ferretería   Sol ")).toEqual({ ok: true, nombre: "Ferretería Sol" });
    expect(validarNombreEmpresa("")).toMatchObject({ ok: false });
    expect(validarNombreEmpresa(NOMBRE_ORGANIZACION_PROVISIONAL)).toMatchObject({ ok: false });
    expect(validarNombreEmpresa("x".repeat(121))).toMatchObject({ ok: false });
    expect(() => updateCompanyNameInput({ name: " " })).toThrow();
  });
  it("OWNER nuevo completa el nombre y queda persistido (sin localStorage)", async () => {
    const estado = { orgs: { o1: NOMBRE_ORGANIZACION_PROVISIONAL }, memberships: [{ user_id: "u1", organization_id: "o1", role: "OWNER" }], userId: "u1" };
    const ctx = { userId: "u1", supabase: falsoDb(estado) };
    const antes = await getCompanyHandler(ctx, deps({ u1: "o1" }));
    expect(antes).toMatchObject({ needsName: true, canEdit: true, role: "OWNER" });
    const r = await updateCompanyNameHandler(ctx, { name: "Ferretería Sol" }, deps({ u1: "o1" }));
    expect(r).toEqual({ name: "Ferretería Sol", needsName: false });
    expect(estado.orgs.o1).toBe("Ferretería Sol");
    const handlers = leer("src/lib/production/company-handlers.ts");
    expect(handlers).not.toMatch(/localStorage|use-sesion|mocks/);
  });
  it("el contexto se resuelve con el bootstrap productivo pinneado al runtime manifest", () => {
    const runtime = leer("src/lib/production/runtime.server.ts");
    expect(leer("src/lib/production/company-handlers.ts")).toContain("asegurarContextoProductivo");
    expect(runtime).toContain(`_name: "${NOMBRE_ORGANIZACION_PROVISIONAL}"`);
    expect(runtime).toContain("KNOWLEDGE_RUNTIME_IDENTIFIER = RUNTIME_MANIFEST_IDENTIFIER");
    expect(runtime).toContain("PYMAPA-RUNTIME-MANIFEST");
  });
});

describe("PKG-02A · C. Empresa existente", () => {
  it("login repetido reutiliza la misma organización (no duplica) y no renombra", async () => {
    const estado = { orgs: { o1: "Moda Real SAS" }, memberships: [{ user_id: "u1", organization_id: "o1", role: "OWNER" }], userId: "u1" };
    const ctx = { userId: "u1", supabase: falsoDb(estado) };
    const llamadas: string[] = [];
    const a = await getCompanyHandler(ctx, deps({ u1: "o1" }, llamadas));
    const b = await getCompanyHandler(ctx, deps({ u1: "o1" }, llamadas));
    expect(a).toEqual(b);
    expect(a.needsName).toBe(false);
    expect(estado.orgs).toEqual({ o1: "Moda Real SAS" });
  });
  it("bootstrap y contexto son get-or-create (no crean org/case por login)", () => {
    const runtime = leer("src/lib/production/runtime.server.ts");
    const bloque = runtime.slice(runtime.indexOf("export async function asegurarContextoProductivo"));
    expect(bloque).toContain('.from("cases")');
    expect(bloque).toContain("if (!caseId)");
  });
});

describe("PKG-02A · D. Navegación productiva", () => {
  it("solo rutas productivas, sin legacy ni mocks", () => {
    const rutas = navegacionProductiva.map((n) => n.to as string);
    for (const legacy of ["/perfil", "/diagnostico", "/resultados", "/dashboard", "/roadmap"]) {
      expect(rutas).not.toContain(legacy);
    }
    expect(rutas).toContain("/diagnostico-productivo");
  });
  it("detección de contexto productivo", () => {
    expect(esRutaProductiva("/diagnostico-productivo")).toBe(true);
    expect(esRutaProductiva("/capacidad/dg-01")).toBe(true);
    expect(esRutaProductiva("/empresa")).toBe(true);
    expect(esRutaProductiva("/perfil")).toBe(false);
    expect(esRutaProductiva("/diagnostico")).toBe(false);
    expect(esRutaProductiva("/moda-origen")).toBe(false);
  });
  it("sidebar productivo sin 'MVP Alfa'; resultados marcados como preliminares", () => {
    const sb = leer("src/components/layout/production-sidebar.tsx");
    expect(sb).not.toMatch(/>\s*MVP Alfa/);
    expect(navegacionProductiva.find((n) => n.id === "resultados")?.label).toBe("Avance y resultados");
    const root = leer("src/routes/__root.tsx");
    expect(root).toContain("<ProductionSidebar");
    expect(root).toContain("{!produccion && <DemoBanner />}");
  });
});

describe("PKG-02A · E. Aislamiento demo", () => {
  it("Moda Origen sigue en su sandbox legacy y no toca el boundary productivo", () => {
    const demo = leer("src/routes/moda-origen.tsx");
    expect(demo).not.toMatch(/company\.functions|capabilities\.functions|supabase/);
  });
  it("el onboarding productivo no lee estado demo/localStorage", () => {
    const pagina = leer("src/routes/_authenticated/empresa.tsx");
    expect(pagina).not.toMatch(/useSesion|useModoDemo|localStorage|mocks/);
  });
});

describe("PKG-02A · F. Seguridad", () => {
  it("usuario no autorizado (MEMBER) no puede renombrar", async () => {
    const estado = { orgs: { o1: "Real" }, memberships: [{ user_id: "u2", organization_id: "o1", role: "MEMBER" }], userId: "u2" };
    await expect(updateCompanyNameHandler({ userId: "u2", supabase: falsoDb(estado) }, { name: "Hack" }, deps({ u2: "o1" }))).rejects.toThrow("FORBIDDEN");
    expect(estado.orgs.o1).toBe("Real");
  });
  it("no puede actualizar otra empresa: la org se resuelve en servidor y RLS filtra", async () => {
    const estado = { orgs: { o1: "Ajena", o2: NOMBRE_ORGANIZACION_PROVISIONAL }, memberships: [{ user_id: "u3", organization_id: "o2", role: "OWNER" }], userId: "u3" };
    // Aunque el bootstrap apuntara a una org ajena, la membresía verificada lo impide.
    await expect(updateCompanyNameHandler({ userId: "u3", supabase: falsoDb(estado) }, { name: "X" }, deps({ u3: "o1" }))).rejects.toThrow("MEMBERSHIP_REQUIRED");
    expect(estado.orgs.o1).toBe("Ajena");
  });
  it("el boundary exige sesión y no acepta organizationId del browser", () => {
    const fns = leer("src/lib/production/company.functions.ts");
    expect(fns.match(/requireSupabaseAuth\]/g)?.length).toBe(2);
    expect(updateCompanyNameInput({ name: "Ok SAS", organizationId: "o-ajena" })).toEqual({ name: "Ok SAS" });
    expect(leer("src/lib/production/company-handlers.ts")).not.toMatch(/client\.server|supabaseAdmin/);
  });
});
