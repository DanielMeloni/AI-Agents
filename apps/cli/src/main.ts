import { runCli } from "./cli";

try {
  const result = runCli(process.argv.slice(2));
  console.log(JSON.stringify(result, null, 2));
  // 0 = completed / needs_input / handed_off; 2 = blocked / failed
  process.exitCode = result.status === "blocked" || result.status === "failed" ? 2 : 0;
} catch (e) {
  console.error((e as Error).message);
  process.exitCode = 1;
}
