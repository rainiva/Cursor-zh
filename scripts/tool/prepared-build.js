'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

/** Transition release: legacy writer must not be used after this tool version. */
const LEGACY_APPLY_EXPIRY_VERSION = '0.3.0';

function createPreparedBuild(input) {
  return Object.freeze({
    buildId: input.buildId,
    rootDir: input.rootDir,
    artifacts: Object.freeze([...(input.artifacts || [])]),
    admission: Object.freeze({ ...(input.admission || {}) }),
    manifest: Object.freeze({ ...(input.manifest || {}) }),
    recoveryCapsule: Object.freeze({ ...(input.recoveryCapsule || {}) }),
    managedTargetSnapshot: Object.freeze([...(input.managedTargetSnapshot || [])]),
  });
}

async function commitPreparedBuild(prepared, writers) {
  if (prepared.admission?.status === 'BLOCKED') {
    throw new Error(`blocked: ${(prepared.admission.blockers || []).join(', ')}`);
  }
  const committedPaths = [];
  const writeArtifact =
    writers?.writeArtifact ||
    (async (preparedPath, targetPath) => {
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      fs.copyFileSync(preparedPath, targetPath);
    });

  for (const artifact of prepared.artifacts || []) {
    await writeArtifact(artifact.preparedPath, artifact.targetPath);
    committedPaths.push(artifact.targetPath);
  }
  return { committedPaths };
}

function printPreparedBuildReport(prepared) {
  const status = prepared?.admission?.status || 'unknown';
  const buildId = prepared?.buildId || '(no-id)';
  console.log(`Prepared build ${buildId}: admission=${status}`);
  if (Array.isArray(prepared?.admission?.blockers) && prepared.admission.blockers.length > 0) {
    console.log(`Blockers: ${prepared.admission.blockers.join(', ')}`);
  }
  if (Array.isArray(prepared?.admission?.fallbacks) && prepared.admission.fallbacks.length > 0) {
    console.log(`Fallbacks: ${prepared.admission.fallbacks.join(', ')}`);
  }
}

function snapshotManagedTargets(entries, { fs: fsRef = fs, sha256OfFile } = {}) {
  return (entries || []).map((entry) => {
    const targetPath = entry.targetPath;
    const existed = Boolean(targetPath && fsRef.existsSync(targetPath));
    let contentHash = null;
    if (existed && typeof sha256OfFile === 'function') {
      try {
        contentHash = sha256OfFile(targetPath);
      } catch {
        contentHash = null;
      }
    }
    return {
      identity: String(entry.identity || targetPath || '').replace(/\\/g, '/'),
      kind: entry.kind || null,
      existed,
      contentHash,
      targetPath,
      backupRelativePath: entry.backupRelativePath || null,
      restoreSource: entry.restoreSource || null,
    };
  });
}

async function publishAcceptedState({
  manifest,
  recoveryCapsule,
  writeManifest,
  buildManifestPath,
  fs: fsRef = fs,
  writeJson,
}) {
  const recoveryCapsuleRef =
    recoveryCapsule?.path ||
    recoveryCapsule?.recoveryCapsulePath ||
    recoveryCapsule?.recoveryCapsuleRef ||
    null;
  const accepted = {
    ...manifest,
    recoveryCapsuleRef,
    recoveryCapsulePath: recoveryCapsuleRef,
  };

  if (typeof writeManifest === 'function') {
    writeManifest(accepted);
    return accepted;
  }

  if (!buildManifestPath || typeof writeJson !== 'function') {
    throw new Error('publishAcceptedState requires writeManifest or writeJson+buildManifestPath');
  }

  const dir = path.dirname(buildManifestPath);
  const tempPath = path.join(dir, `.build-manifest.${process.pid}.${Date.now()}.tmp`);
  writeJson(tempPath, accepted);
  fsRef.renameSync(tempPath, buildManifestPath);
  return accepted;
}

async function rollbackCommittedBuild({
  context,
  backupDir,
  prepared,
  fs: fsRef = fs,
  writeText,
  writeJson,
}) {
  const artifacts = [...(prepared?.artifacts || [])].reverse();
  for (const artifact of artifacts) {
    const rollbackEntry = artifact.rollbackEntry || {};
    const targetPath = artifact.targetPath;
    if (!targetPath) {
      continue;
    }

    try {
      if (rollbackEntry.existed === false || rollbackEntry.removeIfMissing) {
        if (fsRef.existsSync(targetPath)) {
          fsRef.unlinkSync(targetPath);
        }
        continue;
      }

      const restoreSource =
        rollbackEntry.restoreSource ||
        (backupDir && rollbackEntry.backupRelativePath
          ? path.join(backupDir, rollbackEntry.backupRelativePath)
          : null);

      if (restoreSource && fsRef.existsSync(restoreSource)) {
        const contents = fsRef.readFileSync(restoreSource, 'utf8');
        if (typeof writeText === 'function') {
          writeText(targetPath, contents);
        } else if (typeof writeJson === 'function' && targetPath.endsWith('.json')) {
          writeJson(targetPath, JSON.parse(contents));
        } else {
          fsRef.mkdirSync(path.dirname(targetPath), { recursive: true });
          fsRef.writeFileSync(targetPath, contents, 'utf8');
        }
      }
    } catch {
      // Preserve original failure; rollback best-effort.
    }
  }

  // Compatibility restore for legacy mid-apply failures (argv / locale / package / bootstrap).
  if (backupDir && context?.paths) {
    try {
      const argvBackupPath = path.join(backupDir, 'argv.json');
      const localeBackupPath = path.join(backupDir, 'locale.json');
      if (context.paths.argvPath && fsRef.existsSync(argvBackupPath) && writeText) {
        writeText(context.paths.argvPath, fsRef.readFileSync(argvBackupPath, 'utf8'));
      }
      if (
        context.paths.userLocaleMirrorPath &&
        fsRef.existsSync(localeBackupPath) &&
        writeText
      ) {
        writeText(
          context.paths.userLocaleMirrorPath,
          fsRef.readFileSync(localeBackupPath, 'utf8')
        );
      }
    } catch {
      // ignore
    }
  }
}

function resolveDesktopShortcutPath(toolPaths) {
  if (!toolPaths?.desktopShortcutName) {
    return null;
  }
  return path.join(os.homedir(), 'Desktop', toolPaths.desktopShortcutName);
}

function resolvePrepareAdmission(options = {}) {
  if (options.admission) {
    return options.admission;
  }
  const { classifyUpdateAdmission } = require('../lib/compatibility/admission.js');
  return classifyUpdateAdmission({
    drift: options.admissionDrift ?? false,
    outcomes: options.admissionOutcomes ?? [],
    currentProofKey: options.currentProofKey ?? '',
  });
}

function buildLeaseCurrentSnapshot(context, prepared, registryDeps = {}) {
  const { getManagedTransactionTargets } = require('../lib/install/managed-external-files.js');
  const registry = getManagedTransactionTargets(context, registryDeps);
  return snapshotManagedTargets(registry, {
    fs: registryDeps.fs,
    sha256OfFile: registryDeps.sha256OfFile,
  });
}

module.exports = {
  LEGACY_APPLY_EXPIRY_VERSION,
  createPreparedBuild,
  commitPreparedBuild,
  printPreparedBuildReport,
  snapshotManagedTargets,
  publishAcceptedState,
  rollbackCommittedBuild,
  resolveDesktopShortcutPath,
  resolvePrepareAdmission,
  buildLeaseCurrentSnapshot,
};
