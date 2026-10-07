// Bundle statico di main, preload e renderer verso dist/. Nessun server, nessun dev server.
import { build } from "esbuild";
import { cpSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
rmSync(dist, { recursive: true, force: true });
mkdirSync(join(dist, "renderer"), { recursive: true });

const common = { bundle: true, sourcemap: false, logLevel: "info", legalComments: "none" };

await Promise.all([
  build({ ...common, entryPoints: [join(root, "src/main/index.ts")], outfile: join(dist, "main.cjs"), platform: "node", format: "cjs", target: "node22", external: ["electron"] }),
  build({ ...common, entryPoints: [join(root, "src/preload/index.ts")], outfile: join(dist, "preload.cjs"), platform: "node", format: "cjs", target: "node22", external: ["electron"] }),
  build({ ...common, entryPoints: [join(root, "src/renderer/entry.ts")], outfile: join(dist, "renderer/app.js"), platform: "browser", format: "iife", target: "chrome130" }),
]);

for (const f of ["index.html", "styles.css"]) cpSync(join(root, "src/renderer", f), join(dist, "renderer", f));
cpSync(join(root, "src/renderer/assets"), join(dist, "renderer/assets"), { recursive: true });
