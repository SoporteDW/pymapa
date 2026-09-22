import { readFileSync } from "node:fs";
import { extractDocxText } from "../../packages/knowledge-pipeline/src/raw-source.ts";
const bytes = new Uint8Array(readFileSync("/mnt/user-uploads/OP-02_Completo.docx"));
const t0 = performance.now();
const r = extractDocxText(bytes);
console.log("ms", Math.round(performance.now()-t0), r.stats, r.warnings, "outline", r.outline.length, r.outline.slice(0,8));
const r2 = extractDocxText(bytes);
console.log("deterministic", r.text === r2.text, "lines", r.text!.split("\n").length, "bytes", r.text!.length);
const raw = readFileSync("knowledge/master/v1.0/capabilities/OP-02/raw/OP-02_Completo.txt","utf8");
for (const needle of ["OP02-K4-v1.0 · K4-VALIDATED · CLOSED","origen + receptor + necesidad + momento + mecanismo + responsabilidad + respuesta ante excepción", "Planificar, coordinar y ejecutar procesos y recursos de manera consistente"]) console.log(needle.slice(0,30), r.text!.includes(needle), raw.includes(needle));
// token coverage vs pandoc
const words = (s:string)=> new Set(s.split(/\s+/).filter(w=>w.length>3));
const a = words(raw), b = words(r.text!);
let miss=0; const ex:string[]=[]; for (const w of a) if(!b.has(w)){miss++; if(ex.length<15) ex.push(w);} 
console.log("pandoc words", a.size, "missing in ts", miss, ex);
require("node:fs").writeFileSync("/tmp/op02_ts.txt", r.text!);
