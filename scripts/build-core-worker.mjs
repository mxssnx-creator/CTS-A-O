#!/usr/bin/env node
// Package the CPU worker beside Nitro's server entry, never in browser/public output. Vite compiles its explicit
// TypeScript imports into one standalone ESM file; deployment needs no source checkout or strip-types flag.
import { isBuiltin } from "node:module";
import { mkdtemp, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const CORE_WORKER_FILENAME = "cts-core-worker.mjs";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function file(path) {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

/** Nitro's node-server output, or its generated Vercel Node SSR functions (the current build uses __server.func). */
export async function coreWorkerOutputDirs(root = ROOT) {
  const out = [];
  const node = join(root, ".output/server");
  if (await file(join(node, "index.mjs"))) out.push(node);
  const functions = join(root, ".vercel/output/functions");
  let entries = [];
  try {
    entries = await readdir(functions, { withFileTypes: true });
  } catch {
    /* node-server or no build yet */
  }
  for (const entry of entries) {
    if (!entry.isDirectory() || !entry.name.endsWith(".func")) continue;
    const dir = join(functions, entry.name);
    let config;
    try {
      config = JSON.parse(await readFile(join(dir, ".vc-config.json"), "utf8"));
    } catch {
      continue;
    }
    // The runtime marker identifies actual Nitro SSR function output, including an adapter-renamed function.
    // Edge functions and unrelated standalone API functions never receive this Node worker asset.
    if (
      !String(config.runtime ?? "").startsWith("nodejs") ||
      !(await file(join(dir, "_runtime.mjs")))
    )
      continue;
    const handler = resolve(dir, String(config.handler ?? ""));
    if (dirname(handler) !== dir || !(await file(handler))) continue;
    out.push(dir);
  }
  return out.sort();
}

/** outputRoot is separate only so the real production bundle can be tested in a disposable deployment layout. */
export async function buildCoreWorker({ root = ROOT, outputRoot = root } = {}) {
  const outputs = await coreWorkerOutputDirs(outputRoot);
  if (!outputs.length)
    throw new Error(
      "No built Nitro Node server entry found; build the application before packaging its core worker.",
    );
  const temporary = await mkdtemp(join(tmpdir(), "cts-core-worker-build-"));
  try {
    const { build } = await import("vite");
    await build({
      configFile: false,
      root,
      publicDir: false,
      logLevel: "warn",
      ssr: { target: "node", noExternal: true },
      build: {
        ssr: join(root, "src/core/server/tapes.worker.ts"),
        target: "node22",
        outDir: temporary,
        emptyOutDir: false,
        copyPublicDir: false,
        minify: false,
        sourcemap: false,
        reportCompressedSize: false,
        rolldownOptions: {
          external: (id) => isBuiltin(id),
          output: {
            format: "es",
            entryFileNames: CORE_WORKER_FILENAME,
            codeSplitting: false,
          },
        },
      },
    });
    const files = await readdir(temporary);
    if (files.length !== 1 || files[0] !== CORE_WORKER_FILENAME)
      throw new Error(`Core worker must be one standalone ESM asset; produced ${files.join(", ")}`);
    const bundle = await readFile(join(temporary, CORE_WORKER_FILENAME));
    for (const directory of outputs) {
      // A same-directory rename publishes the complete new file atomically. Never point Vite at Nitro's directory:
      // even a failed build cannot empty or replace its existing server entry, chunks or runtime assets.
      const staging = join(directory, `.${CORE_WORKER_FILENAME}.${process.pid}.tmp`);
      try {
        await writeFile(staging, bundle, { flag: "wx", mode: 0o644 });
        await rename(staging, join(directory, CORE_WORKER_FILENAME));
      } finally {
        await rm(staging, { force: true });
      }
    }
    return outputs.map((directory) => join(directory, CORE_WORKER_FILENAME));
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const paths = await buildCoreWorker();
    for (const path of paths)
      console.info(`[core-worker] packaged ${basename(path)} in ${dirname(path)}`);
  } catch (error) {
    console.error(`[core-worker] ${error instanceof Error ? error.message : error}`);
    process.exitCode = 1;
  }
}
