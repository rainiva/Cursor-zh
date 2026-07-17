const fs = require('fs');
const path = require('path');

const PACKAGE_BACKUP_RELATIVE = path.join('resources', 'app', 'package.json');
const NLS_BACKUP_RELATIVE = path.join('resources', 'app', 'out', 'nls.messages.json');
const BACKUP_METADATA_RELATIVE = 'backup-metadata.json';

function validateBackupPointer({ backupDir, packageJsonPath, nlsMessagesPath, metadataPath }, fsRef = fs) {
  const issues = [];
  if (!backupDir || !packageJsonPath || !fsRef.existsSync(packageJsonPath)) {
    issues.push('recovery backup pointer is missing package.json backup');
    return { valid: false, issues, metadata: null };
  }

  if (nlsMessagesPath && !fsRef.existsSync(nlsMessagesPath)) {
    issues.push('recovery backup pointer is missing nls.messages.json backup');
  }

  let metadata = null;
  const resolvedMetadataPath = metadataPath || path.join(backupDir, BACKUP_METADATA_RELATIVE);
  if (fsRef.existsSync(resolvedMetadataPath)) {
    try {
      metadata = JSON.parse(fsRef.readFileSync(resolvedMetadataPath, 'utf8'));
    } catch {
      issues.push('recovery backup metadata is not valid JSON');
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    metadata,
  };
}

function readBackupMetadata(backupDir, fsRef = fs) {
  const metadataPath = path.join(backupDir, BACKUP_METADATA_RELATIVE);
  if (!backupDir || !fsRef.existsSync(metadataPath)) {
    return null;
  }
  return JSON.parse(fsRef.readFileSync(metadataPath, 'utf8'));
}

function validateBackupForUninstall({
  backupDir,
  installDir,
  installMetadata,
  deletePaths,
  fs: fsRef = fs,
  existsSync = (filePath) => fsRef.existsSync(filePath),
}) {
  const warnings = [];
  const packageBackupPath = path.join(backupDir, PACKAGE_BACKUP_RELATIVE);
  const nlsBackupPath = path.join(backupDir, NLS_BACKUP_RELATIVE);

  if (!backupDir || !existsSync(packageBackupPath)) {
    throw new Error('Cannot safely uninstall without a package.json backup.');
  }

  const hasInjectedArtifacts =
    Array.isArray(deletePaths) &&
    deletePaths.some(
      (filePath) =>
        typeof filePath === 'string' && filePath.length > 0 && existsSync(filePath)
    );

  if (hasInjectedArtifacts && !existsSync(nlsBackupPath)) {
    throw new Error('Cannot safely uninstall without an nls.messages.json backup.');
  }

  const metadata = readBackupMetadata(backupDir, fsRef);
  const snapshot = metadata?.snapshot;
  if (snapshot?.installDir && path.resolve(snapshot.installDir) !== path.resolve(installDir)) {
    warnings.push(
      `Backup snapshot installDir (${snapshot.installDir}) differs from current install (${installDir}).`
    );
  }
  if (
    snapshot?.cursorVersion &&
    installMetadata?.pkg?.version &&
    snapshot.cursorVersion !== installMetadata.pkg.version
  ) {
    warnings.push(
      `Backup snapshot cursorVersion (${snapshot.cursorVersion}) differs from installed version (${installMetadata.pkg.version}).`
    );
  }

  return {
    warnings,
    metadata,
  };
}

function validateBackupForRecovery({ backup, installDir, fs: fsRef = fs }) {
  const issues = [];
  if (!backup?.backupDir || !backup?.packageJsonPath) {
    issues.push('recovery backup pointer is incomplete');
    return { valid: false, issues, metadata: null };
  }

  const pointer = validateBackupPointer(backup, fsRef);
  issues.push(...pointer.issues);

  if (
    installDir
    && pointer.metadata?.snapshot?.installDir
    && path.resolve(pointer.metadata.snapshot.installDir) !== path.resolve(installDir)
  ) {
    issues.push('recovery backup snapshot installDir does not match capsule install identity');
  }

  return {
    valid: issues.length === 0,
    issues,
    metadata: pointer.metadata,
  };
}

module.exports = {
  PACKAGE_BACKUP_RELATIVE,
  NLS_BACKUP_RELATIVE,
  BACKUP_METADATA_RELATIVE,
  readBackupMetadata,
  validateBackupPointer,
  validateBackupForRecovery,
  validateBackupForUninstall,
};
