#!/usr/bin/env tsx

import { execSync } from "node:child_process";
import { cpSync } from "node:fs";
import { join } from "node:path";

async function main() {
  const ROOT = join(__dirname, "..", "..");
  const run = (cmd: string) =>
    execSync(cmd, { cwd: ROOT, stdio: "inherit", env: process.env });

  // 1) Fetch base snapshot and lists
  run("tsx scripts/models/fetch-base.ts");

  // 2) Fetch extras and generate model-extra.generated.ts
  run("bun scripts/models/fetch-extra.ts");

  // 3) Fetch endpoints and build models.generated.ts
  run("tsx scripts/models/fetch-endpoints.ts");

  // 4) Copy generated files to packages/models
  console.log("Copying generated files to packages/models...");
  cpSync(
    join(ROOT, "lib/models/models.generated.ts"),
    join(ROOT, "packages/models/models.generated.ts")
  );
  cpSync(
    join(ROOT, "lib/models/model-extra.generated.ts"),
    join(ROOT, "packages/models/model-extra.generated.ts")
  );
  cpSync(
    join(ROOT, "lib/models/image-models.ts"),
    join(ROOT, "packages/models/image-models.ts")
  );
  cpSync(
    join(ROOT, "lib/models/image-model-id.ts"),
    join(ROOT, "packages/models/image-model-id.ts")
  );
  console.log("Files copied successfully");

  // 5) Typecheck
  run("bun run test:types");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
