import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

function walk(dir: string, out: string[] = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next") continue;

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, out);
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      out.push(fullPath);
    }
  }

  return out;
}

describe("action safety", () => {
  it("does not use Supabase upsert in app source", () => {
    const root = process.cwd();
    const files = walk(path.join(root, "src"));
    const offenders = files.filter(
      (file) =>
        !file.endsWith(path.join("src", "lib", "actions", "no-upsert.test.ts")) &&
        fs.readFileSync(file, "utf8").includes(".upsert(")
    );

    expect(offenders).toEqual([]);
  });
});
