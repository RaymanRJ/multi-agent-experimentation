// Gives beds and chests a shape in the browser viewer (prismarine-viewer). The real game draws them with
// special code, so the viewer's block models for them are empty and a placed bed or chest showed as
// nothing at all. Each bed becomes a half-height block of its colour's wool, each chest a block of planks
// a little smaller than a full one. Run after `npm install` (package.json "postinstall"); safe to run again.
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
let root;
try {
  root = dirname(require.resolve("prismarine-viewer/package.json"));
} catch {
  console.log("patch-viewer: prismarine-viewer is not installed, nothing to patch");
  process.exit(0);
}
const dir = join(root, "public", "blocksStates");
const CHESTS = { chest: "oak_planks", trapped_chest: "oak_planks", ender_chest: "obsidian" };

/** A copy of a full-cube model, cut to the given box (in 1/16ths). */
function shaped(template, from, to) {
  const model = structuredClone(template.variants[""]?.model ?? Object.values(template.variants)[0].model);
  for (const element of model.elements ?? []) {
    element.from = from;
    element.to = to;
  }
  return model;
}

let patched = 0;
for (const file of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
  const path = join(dir, file);
  const states = JSON.parse(readFileSync(path, "utf8"));
  let changed = false;
  for (const [name, state] of Object.entries(states)) {
    let model = null;
    const bed = /^(\w+)_bed$/.exec(name);
    if (bed && states[`${bed[1]}_wool`]?.variants) model = shaped(states[`${bed[1]}_wool`], [0, 0, 0], [16, 9, 16]);
    if (CHESTS[name] && states[CHESTS[name]]?.variants) model = shaped(states[CHESTS[name]], [1, 0, 1], [15, 14, 15]);
    if (!model || !state?.variants) continue;
    const empty = Object.values(state.variants).every((v) => !(v.model?.elements?.length));
    if (!empty) continue; // drawn already (patched before, or a viewer that draws them)
    for (const key of Object.keys(state.variants)) state.variants[key] = { ...state.variants[key], model };
    changed = true;
    patched++;
  }
  if (changed) writeFileSync(path, JSON.stringify(states));
}
console.log(`patch-viewer: gave ${patched} bed and chest models a shape`);
