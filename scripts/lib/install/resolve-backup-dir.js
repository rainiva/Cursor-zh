const fs = require('fs');
const path = require('path');
const { readBackupMetadata, BACKUP_METADATA_RELATIVE } = require('./validate-backup.js');

function listBackupDirectories(backupRoot, fsRef = fs) {
  if (!backupRoot || !fsRef.existsSync(backupRoot)) {
    return [];
  }

  return fsRef
    .readdirSync(backupRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(backupRoot, entry.name));
}

function resolveBackupDir({
  backupRoot,
  installDir,
  manifest,
  fs: fsRef = fs,
}) {
  const warnings = [];
  const normalizedInstallDir = path.resolve(installDir);

  function matchesInstallDir(backupDir) {
    const metadata = readBackupMetadata(backupDir, fsRef);
    if (!metadata?.snapshot?.installDir) {
      return null;
    }
    return path.resolve(metadata.snapshot.installDir) === normalizedInstallDir;
  }

  if (manifest?.backupDir && fsRef.existsSync(manifest.backupDir)) {
    const match = matchesInstallDir(manifest.backupDir);
    if (match === false) {
      warnings.push(
        `Manifest backupDir does not match current installDir: ${manifest.backupDir}`
      );
    }
    return { backupDir: manifest.backupDir, warnings };
  }

  const candidates = listBackupDirectories(backupRoot, fsRef)
    .map((backupDir) => ({
      backupDir,
      metadata: readBackupMetadata(backupDir, fsRef),
      mtimeMs: fsRef.statSync(backupDir).mtimeMs,
    }))
    .sort((left, right) => right.mtimeMs - left.mtimeMs);

  const snapshotMatches = candidates.filter(
    (entry) =>
      entry.metadata?.snapshot?.installDir &&
      path.resolve(entry.metadata.snapshot.installDir) === normalizedInstallDir
  );
  if (snapshotMatches.length === 1) {
    return { backupDir: snapshotMatches[0].backupDir, warnings };
  }
  if (snapshotMatches.length > 1) {
    throw new Error(
      `Multiple backups match installDir ${installDir}: ${snapshotMatches
        .map((entry) => entry.backupDir)
        .join(', ')}`
    );
  }

  if (candidates.length === 1) {
    warnings.push(`Using legacy backup without installDir snapshot: ${candidates[0].backupDir}`);
    return { backupDir: candidates[0].backupDir, warnings };
  }
  if (candidates.length > 1) {
    throw new Error(
      `Cannot choose backup for installDir ${installDir}. Candidates: ${candidates
        .map((entry) => entry.backupDir)
        .join(', ')}`
    );
  }

  return { backupDir: null, warnings };
}

module.exports = {
  listBackupDirectories,
  resolveBackupDir,
  BACKUP_METADATA_RELATIVE,
};
