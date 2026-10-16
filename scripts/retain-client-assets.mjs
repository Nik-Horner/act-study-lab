import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  copyFileSync,
  lstatSync,
  rmSync,
} from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const safeAsset = (name) =>
  typeof name === "string" &&
  name.startsWith("_next/static/") &&
  !name.split("/").includes("..") &&
  /\.(js|css|woff2?|ttf|otf|svg|png|jpe?g|webp)$/.test(name);

export function rememberClientAssets(root = process.cwd()) {
  const client = join(root, "dist/client"),
    cache = join(root, ".hosting-cache/previous-client");
  const manifest = join(client, ".vite/manifest.json");
  if (!existsSync(manifest) && existsSync(join(cache, "files.json")))
    return JSON.parse(readFileSync(join(cache, "files.json"), "utf8")).filter(
      safeAsset,
    );
  const records = existsSync(manifest)
    ? Object.values(JSON.parse(readFileSync(manifest, "utf8")))
    : [];
  // Vinext emits layout CSS separately from Vite's client manifest.
  const serverManifest = join(
    root,
    "dist/server/__vite_rsc_assets_manifest.js",
  );
  const serverResources = existsSync(serverManifest)
    ? (JSON.parse(
        readFileSync(serverManifest, "utf8")
          .replace(/^export default\s+/, "")
          .replace(/;\s*$/, ""),
      ).serverResources ?? {})
    : {};
  const serverCss = Object.values(serverResources)
    .flatMap((entry) => entry.css ?? [])
    .map((name) => name.replace(/^\//, ""));
  const files = [
    ...new Set(
      [
        ...records.flatMap((entry) => [
          entry.file,
          ...(entry.css ?? []),
          ...(entry.assets ?? []),
        ]),
        ...serverCss,
      ].filter(safeAsset),
    ),
  ];
  rmSync(cache, { recursive: true, force: true });
  mkdirSync(cache, { recursive: true });
  const saved = files.filter(
    (name) =>
      existsSync(join(client, name)) && lstatSync(join(client, name)).isFile(),
  );
  for (const name of saved) {
    mkdirSync(dirname(join(cache, name)), { recursive: true });
    copyFileSync(join(client, name), join(cache, name));
  }
  writeFileSync(join(cache, "files.json"), JSON.stringify(saved));
  return saved;
}

export function restoreClientAssets(root = process.cwd()) {
  const client = join(root, "dist/client"),
    cache = join(root, ".hosting-cache/previous-client");
  const manifest = join(cache, "files.json");
  if (!existsSync(manifest)) return [];
  const files = JSON.parse(readFileSync(manifest, "utf8")).filter(safeAsset);
  for (const name of files) {
    const target = join(client, name),
      previous = join(cache, name);
    if (
      existsSync(target) ||
      !existsSync(previous) ||
      !lstatSync(previous).isFile()
    )
      continue;
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(previous, target);
  }
  return files;
}

// shortcut: retention uses this checkout's last build; keep the release checkout or seed its prior assets when moving hosts.
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  if (process.argv[2] === "prepare") rememberClientAssets();
  else if (process.argv[2] === "restore") restoreClientAssets();
  else throw new Error("Use prepare before Vite and restore after Vite.");
}
