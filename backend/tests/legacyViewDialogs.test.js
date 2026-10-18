import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const viewsDirectory = fileURLToPath(new URL("../views", import.meta.url));

test("server-rendered pages use styled notifications instead of native alerts", () => {
  const offenders = readdirSync(viewsDirectory)
    .filter((filename) => filename.endsWith(".pug"))
    .filter((filename) => {
      const source = readFileSync(path.join(viewsDirectory, filename), "utf8");
      return /\b(?:window\.)?alert\s*\(/.test(source);
    });

  assert.deepEqual(offenders, []);
});
