import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../src/content/", import.meta.url));
let lessons = 0,
  questions = 0;
function scan(value, path) {
  if (Array.isArray(value))
    return value.forEach((v, i) => scan(v, `${path}[${i}]`));
  if (value && typeof value === "object") {
    if (["stem", "choices", "answer", "explanation"].every((k) => k in value)) {
      questions++;
      assert(
        Number.isInteger(value.answer) &&
          value.answer >= 0 &&
          value.answer < value.choices.length,
        `${path}: invalid key`,
      );
      assert.equal(
        new Set(value.choices).size,
        value.choices.length,
        `${path}: duplicate choices`,
      );
    }
    if (["sections", "check", "intro"].every((k) => k in value)) lessons++;
    return Object.entries(value).forEach(([k, v]) => scan(v, `${path}.${k}`));
  }
  if (typeof value === "string") {
    const sentences = value.split(/(?<=[.!?])\s+/);
    assert(
      !sentences.some(
        (s, i) => i > 0 && s.length > 25 && s === sentences[i - 1],
      ),
      `${path}: repeated sentence filler`,
    );
  }
}
function directory(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) directory(path);
    else if (entry.name.endsWith(".json"))
      scan(JSON.parse(readFileSync(path, "utf8")), path);
  }
}
directory(root);
console.log(
  `Quality validated: ${lessons} bundled lessons and ${questions} question records; valid keys, unique choices, no repeated-sentence filler.`,
);
