import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { restoreIter5, snapshotIter5, verifyIter5Snapshot } from "../scripts/manage-iter5-rollback.mjs";

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

async function createFixture() {
  const root = await mkdtemp(join(tmpdir(), "iter5-rollback-"));
  temporaryRoots.push(root);
  await mkdir(join(root, "server", "models"), { recursive: true });
  await writeFile(join(root, "server", "detectionEngine.ts"), "export const model = 'Iter5';\n", "utf8");
  await writeFile(join(root, "server", "models", "iter5CharModel.ts"), "export const weights = 'fixture';\n", "utf8");
  return root;
}

describe("Iter5 rollback snapshot", () => {
  it("creates a hash-verified, non-overwriting snapshot", async () => {
    const root = await createFixture();
    const snapshot = join(root, "iter5-snapshot");
    const manifest = await snapshotIter5({ projectRoot: root, snapshotDir: snapshot });

    expect(manifest.files).toHaveLength(2);
    await expect(verifyIter5Snapshot({ snapshotDir: snapshot })).resolves.toMatchObject({ files: manifest.files });
    await expect(snapshotIter5({ projectRoot: root, snapshotDir: snapshot })).rejects.toThrow("refusing to overwrite");
  });

  it("rejects a snapshot whose saved model file has changed", async () => {
    const root = await createFixture();
    const snapshot = join(root, "iter5-snapshot");
    await snapshotIter5({ projectRoot: root, snapshotDir: snapshot });
    await writeFile(join(snapshot, "server", "models", "iter5CharModel.ts"), "tampered\n", "utf8");

    await expect(verifyIter5Snapshot({ snapshotDir: snapshot })).rejects.toThrow("snapshot hash mismatch");
    expect(await readFile(join(root, "server", "models", "iter5CharModel.ts"), "utf8")).toContain("fixture");
  });

  it("restores both Iter5 files and preserves the pre-restore state in a fresh backup", async () => {
    const root = await createFixture();
    const snapshot = join(root, "iter5-snapshot");
    const backup = join(root, "pre-restore-backup");
    await snapshotIter5({ projectRoot: root, snapshotDir: snapshot });

    await writeFile(join(root, "server", "detectionEngine.ts"), "export const model = 'candidate';\n", "utf8");
    await writeFile(join(root, "server", "models", "iter5CharModel.ts"), "export const weights = 'candidate';\n", "utf8");

    await expect(restoreIter5({ projectRoot: root, snapshotDir: snapshot, backupDir: backup })).resolves.toMatchObject({
      restored: ["server/detectionEngine.ts", "server/models/iter5CharModel.ts"],
      backupDir: backup,
    });
    await expect(readFile(join(root, "server", "detectionEngine.ts"), "utf8")).resolves.toContain("Iter5");
    await expect(readFile(join(root, "server", "models", "iter5CharModel.ts"), "utf8")).resolves.toContain("fixture");
    await expect(readFile(join(backup, "server", "detectionEngine.ts"), "utf8")).resolves.toContain("candidate");
    await expect(readFile(join(backup, "server", "models", "iter5CharModel.ts"), "utf8")).resolves.toContain("candidate");
  });
});
