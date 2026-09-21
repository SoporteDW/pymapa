/**
 * M1-D · Architecture tests.
 * Garantizan la dirección obligatoria de dependencias:
 *   React → AssessmentClient → Application boundary → Knowledge Engine → PostgreSQL
 * y nunca React → Knowledge Engine.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const RAIZ = process.cwd();
const SRC = join(RAIZ, "src");

function archivos(dir: string, extensiones = [".ts", ".tsx"]): string[] {
  const salida: string[] = [];
  for (const entrada of readdirSync(dir)) {
    const ruta = join(dir, entrada);
    if (statSync(ruta).isDirectory()) {
      if (entrada === "node_modules") continue;
      salida.push(...archivos(ruta, extensiones));
    } else if (extensiones.some((e) => entrada.endsWith(e))) {
      salida.push(ruta);
    }
  }
  return salida;
}

const ARCHIVOS_SRC = archivos(SRC);

/** Módulos autorizados a tocar el runtime de conocimiento. */
const AUTORIZADOS = [
  "src/lib/production/runtime.server.ts",
  "src/lib/production/caso-uso.ts",
  "src/lib/production/puertos.ts",
  "src/lib/production/vertical-op01.test.ts",
  "src/lib/production/arquitectura.test.ts",
  "src/lib/production/activacion-op01.test.ts",
  "src/lib/production/colaborativo-evidencia.test.ts",
];

describe("arquitectura · separación frontend / knowledge-engine", () => {
  it("ningún componente, ruta o hook importa @pymapa/knowledge-engine", () => {
    const infractores = ARCHIVOS_SRC.filter((ruta) => {
      const rel = relative(RAIZ, ruta).replace(/\\/g, "/");
      if (AUTORIZADOS.includes(rel)) return false;
      return /@pymapa\/knowledge-(engine|schema)/.test(readFileSync(ruta, "utf8"));
    });
    expect(infractores.map((f) => relative(RAIZ, f))).toEqual([]);
  });

  it("caso-uso solo usa el engine como tipo, nunca lo instancia", () => {
    const fuente = readFileSync(join(SRC, "lib", "production", "caso-uso.ts"), "utf8");
    expect(fuente).toMatch(/import type \{[\s\S]*?\} from "@pymapa\/knowledge-engine"/);
    expect(fuente).not.toMatch(/createKnowledgeEngine/);
  });

  it("el cliente productivo no importa el engine, el pack ni Supabase", () => {
    const fuente = readFileSync(join(SRC, "services", "production", "production-client.ts"), "utf8");
    expect(fuente).not.toMatch(/knowledge-engine|knowledge\/packs|supabase/);
    expect(fuente).toMatch(/op01\.functions/);
  });

  it("el application boundary carga el runtime server-only de forma dinámica", () => {
    const fuente = readFileSync(join(SRC, "lib", "production", "op01.functions.ts"), "utf8");
    expect(fuente).toMatch(/await import\("\.\/runtime\.server"\)/);
    expect(fuente).not.toMatch(/^import .*runtime\.server/m);
  });

  it("no existe conocimiento OP-01 hardcodeado fuera del Knowledge Pack", () => {
    const pregunta = "¿qué tan clara está actualmente la forma en que debe realizarse?";
    const infractores = ARCHIVOS_SRC.filter((ruta) => {
      const rel = relative(RAIZ, ruta).replace(/\\/g, "/");
      if (rel.endsWith(".test.ts")) return false;
      return readFileSync(ruta, "utf8").includes(pregunta);
    });
    expect(infractores.map((f) => relative(RAIZ, f))).toEqual([]);
  });

  it("solo OP-01 está migrada a PRODUCTION_ENGINE", async () => {
    const { PRODUCTION_CAPABILITY_IDS, resolveExecutionSource } = await import(
      "@/services/production/execution-source"
    );
    expect([...PRODUCTION_CAPABILITY_IDS]).toEqual(["OP-01"]);
    expect(resolveExecutionSource("OP-01")).toBe("PRODUCTION_ENGINE");
    expect(resolveExecutionSource("CAP-01")).toBe("MVP_ENGINE");
    expect(resolveExecutionSource(null)).toBe("MVP_ENGINE");
  });

  it("el motor del MVP permanece sin referencias al core productivo", () => {
    const motor = archivos(join(SRC, "lib", "motor"));
    const infractores = motor.filter((ruta) =>
      /@pymapa\/knowledge|production\/(runtime|caso-uso|op01)/.test(readFileSync(ruta, "utf8")),
    );
    expect(infractores.map((f) => relative(RAIZ, f))).toEqual([]);
  });
});
