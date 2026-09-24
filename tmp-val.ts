import { readFileSync } from "node:fs";
import { join } from "node:path";
import { rawSourceRegistrationSchema, validateExtractionCandidate, previewCanonicalProjection, validateRuntimeExtensionRegistry } from "./packages/knowledge-pipeline/src/index.ts";
import { ENGINE_SEMVER, ENGINE_SEMANTIC_HISTORY } from "@pymapa/knowledge-engine";
const rj=(p:string)=>JSON.parse(readFileSync(p,"utf8"));
const reg0 = validateRuntimeExtensionRegistry({registry: rj("knowledge/factory/runtime-extensions.json"), engineSemver: ENGINE_SEMVER, engineChangeIds: ENGINE_SEMANTIC_HISTORY.flatMap(v=>v.changes.map(c=>c.id))});
for (const c of process.argv.slice(2)) {
  const d=`knowledge/intake/${c}`; const reg=rawSourceRegistrationSchema.parse(rj(d+"/registration.json"));
  const raw=readFileSync(join(d,reg.text!.ref),"utf8");
  const v=validateExtractionCandidate({candidate: rj(d+"/candidate.json"), registration: reg, rawText: raw, extensionRegistry: reg0.registry});
  const p=previewCanonicalProjection({validation:v, registration:reg, rawRef:"raw/x.txt", sourceRef:"source.json"});
  const by:Record<string,number>={}; v.issues.forEach(i=>by[`${i.severity} ${i.code}`]=(by[`${i.severity} ${i.code}`]??0)+1);
  console.log(c, JSON.stringify(by), "objects", p.baseline?.objects.length, "blockers", p.blockers.length);
  p.blockers.slice(0,8).forEach(b=>console.log("   ",b.slice(0,220)));
}
