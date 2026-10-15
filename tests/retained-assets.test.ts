import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  rmSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import {
  rememberClientAssets,
  restoreClientAssets,
} from "../scripts/retain-client-assets.mjs";

test("a release retains previous page assets without replacing new files or carrying older generations", () => {
  const root = mkdtempSync(join(tmpdir(), "act-retained-assets-"));
  const client = join(root, "dist/client");
  const write = (name: string, text: string) => {
    mkdirSync(dirname(join(client, name)), { recursive: true });
    writeFileSync(join(client, name), text);
  };
  try {
    write(
      ".vite/manifest.json",
      JSON.stringify({
        entry: {
          file: "_next/static/chunks/old.js",
          css: ["_next/static/css/old.css"],
          assets: ["../.env.local"],
        },
        shared: { file: "_next/static/chunks/shared.js" },
      }),
    );
    write("_next/static/chunks/old.js", "old entry");
    write("_next/static/css/old.css", "old style");
    write("_next/static/chunks/shared.js", "old shared");
    write("_next/static/chunks/older.js", "older retained generation");
    assert.equal(rememberClientAssets(root).length, 3);
    rmSync(client, { recursive: true });
    write(
      ".vite/manifest.json",
      JSON.stringify({
        entry: { file: "_next/static/chunks/new.js" },
        shared: { file: "_next/static/chunks/shared.js" },
      }),
    );
    write("_next/static/chunks/new.js", "new entry");
    write("_next/static/chunks/shared.js", "new shared");
    restoreClientAssets(root);
    assert.equal(
      readFileSync(join(client, "_next/static/chunks/old.js"), "utf8"),
      "old entry",
    );
    assert.equal(
      readFileSync(join(client, "_next/static/chunks/shared.js"), "utf8"),
      "new shared",
    );
    assert(!existsSync(join(client, "_next/static/chunks/older.js")));
    assert(!existsSync(join(root, ".hosting-cache/.env.local")));
    assert.deepEqual(rememberClientAssets(root).sort(), [
      "_next/static/chunks/new.js",
      "_next/static/chunks/shared.js",
    ]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a first build with no previous output needs no retained assets", () => {
  const root = mkdtempSync(join(tmpdir(), "act-first-assets-"));
  try {
    assert.deepEqual(rememberClientAssets(root), []);
    assert.deepEqual(restoreClientAssets(root), []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
