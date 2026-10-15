import test from "node:test";
import assert from "node:assert/strict";
import { authReturnPath } from "../src/lib/auth-redirect";

test("auth return paths cannot escape the app origin", () => {
  for (const value of [
    null,
    "https://example.org",
    "@example.org/",
    "//example.org/",
    "/\\example.org/",
    "/\n/example.org",
    "/\t/example.org",
  ])
    assert.equal(authReturnPath(value), "/dashboard");
  assert.equal(authReturnPath("/daily?from=login"), "/daily?from=login");
  assert.equal(
    new URL(authReturnPath("@example.org/"), "https://study.example").origin,
    "https://study.example",
  );
});
