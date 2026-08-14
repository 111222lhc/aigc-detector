/**
 * Snapshot, validate, and (only with an explicit confirmation) restore the
 * two files that select and contain the production Iter5 model.  The website
 * currently uses Iter5, so this script is preparation only and is never run
 * by the application or deployment process.
 */

import { createHash, randomUUID } from "node:crypto";
import { access, copyFile, mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const ITER5_FILES = ["server/detectionEngine.ts", "server/models/iter5CharModel.ts"];

function sha256(data) {
  return createHash("sha256").update(data).digest("hex");
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function safeDestination(projectRoot, relPath) {
  const destination = resolve(projectRoot, relPath);
  if (relative(projectRoot, destination).startsWith("..") || isAbsolute(relative(projectRoot, destination))) {
    throw new Error(`unsafe snapshot path: ${relPath}`);
  }
  return destination;
}

async function readIter5File(projectRoot, relPath) {
  const source = safeDestination(projectRoot, relPath);
  const data = await readFile(source);
  if (relPath.endsWith("detectionEngine.ts") && !data.toString("utf8").includes("Iter5")) {
    throw new Error("detectionEngine.ts does not identify the expected Iter5 implementation");
  }
  return { source, data };
}

export async function snapshotIter5({ projectRoot, snapshotDir }) {
  const root = resolve(projectRoot);
  const destination = resolve(snapshotDir);
  if (await exists(destination)) throw new Error(`refusing to overwrite existing snapshot: ${destination}`);

  const files = [];
  for (const relPath of ITER5_FILES) {
    const { data } = await readIter5File(root, relPath);
    files.push({ path: relPath, bytes: data.byteLength, sha256: sha256(data) });
  }

  const temporary = `${destination}.tmp-${randomUUID()}`;
  await mkdir(temporary, { recursive: false });
  try {
    for (const entry of files) {
      const source = safeDestination(root, entry.path);
      const output = safeDestination(temporary, entry.path);
      await mkdir(dirname(output), { recursive: true });
      await copyFile(source, output);
    }
    const manifest = {
      schema: "aigc-detector.iter5-rollback-snapshot.v1",
      createdAtUtc: new Date().toISOString(),
      purpose: "manual rollback preparation; not automatically applied",
      files,
    };
    await writeFile(join(temporary, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    await rename(temporary, destination);
    return manifest;
  } catch (error) {
    await rm(temporary, { recursive: true, force: true });
    throw error;
  }
}

export async function verifyIter5Snapshot({ snapshotDir }) {
  const root = resolve(snapshotDir);
  const manifest = JSON.parse(await readFile(join(root, "manifest.json"), "utf8"));
  if (manifest.schema !== "aigc-detector.iter5-rollback-snapshot.v1" || !Array.isArray(manifest.files)) {
    throw new Error("snapshot manifest schema is invalid");
  }
  if (manifest.files.length !== ITER5_FILES.length) throw new Error("snapshot file list is incomplete");
  for (const entry of manifest.files) {
    if (!ITER5_FILES.includes(entry.path)) throw new Error(`unexpected snapshot file: ${entry.path}`);
    const data = await readFile(safeDestination(root, entry.path));
    if (data.byteLength !== entry.bytes || sha256(data) !== entry.sha256) {
      throw new Error(`snapshot hash mismatch: ${entry.path}`);
    }
  }
  return manifest;
}

export async function restoreIter5({ projectRoot, snapshotDir, backupDir }) {
  const root = resolve(projectRoot);
  const verified = await verifyIter5Snapshot({ snapshotDir });
  const backup = resolve(backupDir);
  if (await exists(backup)) throw new Error(`refusing to overwrite existing backup: ${backup}`);

  const staged = [];
  for (const entry of verified.files) {
    const source = safeDestination(snapshotDir, entry.path);
    const contents = await readFile(source);
    staged.push({ entry, contents, target: safeDestination(root, entry.path) });
  }

  await mkdir(backup, { recursive: false });
  try {
    for (const item of staged) {
      const backupTarget = safeDestination(backup, item.entry.path);
      await mkdir(dirname(backupTarget), { recursive: true });
      await copyFile(item.target, backupTarget);
    }
    for (const item of staged) {
      const temporaryTarget = `${item.target}.restore-${randomUUID()}.tmp`;
      await writeFile(temporaryTarget, item.contents);
      await rename(temporaryTarget, item.target);
    }
    return { restored: verified.files.map((entry) => entry.path), backupDir: backup };
  } catch (error) {
    throw new Error(`restore stopped after creating a pre-restore backup at ${backup}: ${error.message}`);
  }
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  const readFlag = (name) => {
    const index = args.indexOf(name);
    return index >= 0 ? args[index + 1] : undefined;
  };
  const projectRoot = readFlag("--project-root") ?? process.cwd();
  const snapshotDir = readFlag("--snapshot-dir");
  if (!command || !snapshotDir || !["snapshot", "verify", "restore"].includes(command)) {
    throw new Error("usage: node scripts/manage-iter5-rollback.mjs <snapshot|verify|restore> --snapshot-dir <dir> [--project-root <dir>] [--backup-dir <dir>] [--confirm-restore]");
  }
  if (command === "snapshot") {
    console.log(JSON.stringify(await snapshotIter5({ projectRoot, snapshotDir }), null, 2));
    return;
  }
  if (command === "verify") {
    console.log(JSON.stringify(await verifyIter5Snapshot({ snapshotDir }), null, 2));
    return;
  }
  if (!args.includes("--confirm-restore")) {
    throw new Error("restore requires --confirm-restore and is intentionally never automatic");
  }
  const backupDir = readFlag("--backup-dir");
  if (!backupDir) throw new Error("restore requires a fresh --backup-dir");
  console.log(JSON.stringify(await restoreIter5({ projectRoot, snapshotDir, backupDir }), null, 2));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`ITER5_ROLLBACK_REFUSED: ${error.message}`);
    process.exitCode = 2;
  });
}
