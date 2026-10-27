import { readFileSync, readdirSync } from "node:fs";
import { resolve, relative, dirname } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");
const modules = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const path = resolve(dir, entry.name);
  return entry.isDirectory() ? modules(path) : /\.tsx?$/.test(path) ? [path] : [];
});

describe("PYM-NOV-B01-FIX · frontera real del piloto", () => {
  it("cada dependencia experimental tiene una frontera de servidor por sufijo", () => {
    const paths = modules(resolve(root, "packages/dg01-pilot/src"));
    const coreImports = paths.filter((path) => !path.endsWith(".test.ts") && /@pymapa\/knowledge-(engine|schema)/.test(readFileSync(path, "utf8")));
    expect(coreImports).toHaveLength(3);
    expect(coreImports.every((path) => path.endsWith(".server.ts"))).toBe(true);
  });
  it("el grafo de presentación no alcanza el paquete, el pack ni el motor", () => {
    const visited = new Set<string>();
    const visit = (path: string) => {
      if (visited.has(path)) return;
      visited.add(path);
      const source = readFileSync(path, "utf8");
      // RPC handlers are the intentional server boundary, not presentation dependencies.
      if (path.endsWith(".functions.ts")) {
        expect(source).toContain('await import("./piloto.server")');
        expect(source).not.toMatch(/^import .*\.server/m);
        return;
      }
      expect(source).not.toMatch(/@pymapa\/knowledge|knowledge\/packs|dg01-pilot|evaluador-piloto|interprete-semantico/);
      for (const match of source.matchAll(/(?:from\s+|import\s*\()(["'])([^"']+)\1/g)) {
        const specifier = match[2];
        if (!specifier) continue;
        const base = specifier.startsWith("@/lib/piloto-dg01/") ? resolve(root, "src", specifier.slice(2))
          : specifier.startsWith(".") ? resolve(dirname(path), specifier) : null;
        if (!base) continue;
        const target = modules(dirname(base)).find((file) => file === `${base}.ts` || file === `${base}.tsx`);
        if (target) visit(target);
      }
    };
    // The provenance source path is descriptive data, never an import.
    const provenance = read("src/lib/piloto-dg01/procedencia.ts");
    expect(provenance).not.toMatch(/(?:from\s+|import\s*\()["']/);
    visit(resolve(root, "src/lib/piloto-dg01/escenarios.ts"));
    const route = read("src/routes/piloto-dg01.tsx");
    const imports = [...route.matchAll(/from\s+["'](@\/lib\/piloto-dg01\/[^"']+)["']/g)].map((m) => m[1]);
    expect(imports).toEqual(["@/lib/piloto-dg01/escenarios", "@/lib/piloto-dg01/piloto.functions", "@/lib/piloto-dg01/procedencia"]);
    visit(resolve(root, "src/lib/piloto-dg01/piloto.functions.ts"));
    const appReferences = modules(resolve(root, "src")).filter((path) => readFileSync(path, "utf8").includes("packages/dg01-pilot/src/evaluador-piloto.server"));
    expect(appReferences.map((path) => relative(root, path))).toEqual(["src/lib/piloto-dg01/piloto.server.ts"]);
  });
});