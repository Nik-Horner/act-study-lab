import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("Sites refuses a build without browser sign-in configuration", () => {
  const cwd = mkdtempSync(join(tmpdir(), "act-build-env-"));
  const env = { ...process.env };
  delete env.NEXT_PUBLIC_SUPABASE_URL;
  delete env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const script = `import config from ${JSON.stringify(new URL("../vite.config.ts", import.meta.url).href)}; config({mode:"production",command:"build"});`;
  try {
    for (const entries of [
      {},
      { NEXT_PUBLIC_SUPABASE_URL: "https://build-placeholder.supabase.co" },
      { NEXT_PUBLIC_SUPABASE_ANON_KEY: "public-build-placeholder" },
    ]) {
      const result = spawnSync(
        process.execPath,
        [
          "--import",
          new URL("../node_modules/tsx/dist/loader.mjs", import.meta.url)
            .pathname,
          "--input-type=module",
          "-e",
          script,
        ],
        { cwd, env: { ...env, ...entries }, encoding: "utf8" },
      );
      assert.notEqual(result.status, 0);
      assert.match(
        result.stderr,
        /NEXT_PUBLIC_SUPABASE_.*required at build time/,
      );
    }
    const result = spawnSync(
      process.execPath,
      [
        "--import",
        new URL("../node_modules/tsx/dist/loader.mjs", import.meta.url)
          .pathname,
        "--input-type=module",
        "-e",
        script,
      ],
      {
        cwd,
        env: {
          ...env,
          NEXT_PUBLIC_SUPABASE_URL: "https://build-placeholder.supabase.co",
          NEXT_PUBLIC_SUPABASE_ANON_KEY: "public-build-placeholder",
        },
        encoding: "utf8",
      },
    );
    assert.equal(result.status, 0, result.stderr);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});
