'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const { normalizeInstallDir } = require('../compatibility/state-schema.js');
const { validateBackupForRecovery } = require('./validate-backup.js');

const CURRENT_CAPSULE_VERSION = 1;
const CURRENT_RECOVERY_READER_VERSION = 1;

function readToolVersion() {
  try {
    const packageJsonPath = path.join(__dirname, '..', '..', '..', 'package.json');
    return JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')).version;
  } catch {
    return '0.0.0';
  }
}

function normalizeManagedTarget(target) {
  return {
    identity: String(target.identity).replace(/\\/g, '/'),
    existed: Boolean(target.existed),
    contentHash: target.contentHash ? String(target.contentHash) : null,
    restoreSource: target.restoreSource ? String(target.restoreSource) : null,
  };
}

function buildRecoveryCapsule({
  operation,
  buildId,
  installIdentity,
  backup,
  managedTargets,
  toolVersion = readToolVersion(),
}) {
  return {
    capsuleVersion: CURRENT_CAPSULE_VERSION,
    minRecoveryReaderVersion: CURRENT_RECOVERY_READER_VERSION,
    toolVersion: String(toolVersion),
    operation: String(operation),
    buildId: String(buildId),
    installIdentity: {
      installDir: String(installIdentity.installDir),
      normalizedInstallDir:
        installIdentity.normalizedInstallDir || normalizeInstallDir(installIdentity.installDir),
    },
    backup: {
      backupDir: String(backup.backupDir),
      packageJsonPath: String(backup.packageJsonPath),
      nlsMessagesPath: backup.nlsMessagesPath ? String(backup.nlsMessagesPath) : null,
      metadataPath: backup.metadataPath ? String(backup.metadataPath) : null,
    },
    managedTargets: [...managedTargets].map(normalizeManagedTarget),
  };
}

function sha256File(filePath, fsRef) {
  return crypto.createHash('sha256').update(fsRef.readFileSync(filePath)).digest('hex');
}

function validateManagedTargets(managedTargets, backupValidation, fsRef) {
  const issues = [];
  if (!Array.isArray(managedTargets) || managedTargets.length === 0) {
    issues.push('recovery capsule managedTargets must be a non-empty array');
    return issues;
  }

  for (const target of managedTargets) {
    if (!target?.identity) {
      issues.push('managed target is missing identity');
      continue;
    }
    if (target.existed && !target.restoreSource) {
      issues.push(`managed target ${target.identity} is missing restoreSource`);
      continue;
    }
    if (target.existed && target.restoreSource && !fsRef.existsSync(target.restoreSource)) {
      issues.push(`managed target ${target.identity} restoreSource does not exist`);
      continue;
    }
    if (target.existed && target.contentHash && target.restoreSource && fsRef.existsSync(target.restoreSource)) {
      const actualHash = sha256File(target.restoreSource, fsRef);
      if (actualHash !== target.contentHash) {
        issues.push(`managed target ${target.identity} contentHash does not match restoreSource`);
      }
    }
  }

  if (backupValidation?.metadata?.snapshot?.hashes) {
    for (const target of managedTargets) {
      const snapshotHash = backupValidation.metadata.snapshot.hashes[target.identity];
      if (snapshotHash && target.contentHash && snapshotHash !== target.contentHash) {
        issues.push(`managed target ${target.identity} contentHash does not match backup snapshot`);
      }
    }
  }

  return issues;
}

function isFullRecoveryCapsule(capsule) {
  return (
    capsule &&
    typeof capsule === 'object' &&
    capsule.capsuleVersion != null &&
    Array.isArray(capsule.managedTargets)
  );
}

function resolveRecoveryCapsulePath(capsuleOrRef) {
  if (!capsuleOrRef) {
    return null;
  }
  if (typeof capsuleOrRef === 'string') {
    return capsuleOrRef;
  }
  return (
    capsuleOrRef.path ||
    capsuleOrRef.recoveryCapsuleRef ||
    capsuleOrRef.recoveryCapsulePath ||
    null
  );
}

function resolveRecoveryCapsule(capsuleOrRef, { readJsonIfExists, fs: fsRef = fs } = {}) {
  if (!capsuleOrRef) {
    return null;
  }
  if (isFullRecoveryCapsule(capsuleOrRef)) {
    return capsuleOrRef;
  }

  const capsulePath = resolveRecoveryCapsulePath(capsuleOrRef);
  if (!capsulePath) {
    return null;
  }

  if (typeof readJsonIfExists === 'function') {
    return readJsonIfExists(capsulePath, null);
  }

  try {
    if (!fsRef.existsSync(capsulePath)) {
      return null;
    }
    return JSON.parse(fsRef.readFileSync(capsulePath, 'utf8'));
  } catch {
    return null;
  }
}

function validateRecoveryCapsule(capsule, context = {}) {
  const issues = [];
  const fsRef = context.fs || fs;
  const readerVersion = context.readerVersion ?? CURRENT_RECOVERY_READER_VERSION;

  if (!capsule || typeof capsule !== 'object') {
    return { valid: false, issues: ['recovery capsule must be an object'], recovery: null };
  }

  const requiredFields = [
    'capsuleVersion',
    'minRecoveryReaderVersion',
    'toolVersion',
    'operation',
    'buildId',
    'installIdentity',
    'backup',
    'managedTargets',
  ];
  for (const field of requiredFields) {
    if (capsule[field] === undefined || capsule[field] === null) {
      issues.push(`recovery capsule is missing ${field}`);
    }
  }

  if (issues.length > 0) {
    return { valid: false, issues, recovery: null };
  }

  if (Number(capsule.capsuleVersion) > CURRENT_CAPSULE_VERSION) {
    issues.push(
      `recovery capsule version ${capsule.capsuleVersion} requires a newer cursor-zh release`
    );
  }

  if (Number(capsule.minRecoveryReaderVersion) > readerVersion) {
    issues.push(
      `recovery capsule requires reader ${capsule.minRecoveryReaderVersion}; this tool is reader ${readerVersion}`
    );
  }

  const expectedInstallDir = context.installDir || capsule.installIdentity.installDir;
  const expectedNormalized = normalizeInstallDir(expectedInstallDir);
  const capsuleNormalized =
    capsule.installIdentity.normalizedInstallDir
    || normalizeInstallDir(capsule.installIdentity.installDir);
  if (expectedNormalized && capsuleNormalized && expectedNormalized !== capsuleNormalized) {
    issues.push('recovery capsule installIdentity does not match the target install');
  }

  const backupValidation = validateBackupForRecovery({
    backup: capsule.backup,
    installDir: capsule.installIdentity.installDir,
    fs: fsRef,
  });
  issues.push(...backupValidation.issues);

  issues.push(...validateManagedTargets(capsule.managedTargets, backupValidation, fsRef));

  const valid = issues.length === 0;
  return {
    valid,
    issues,
    recovery: valid
      ? {
          operation: capsule.operation,
          buildId: capsule.buildId,
          backupDir: capsule.backup.backupDir,
          installIdentity: capsule.installIdentity,
          managedTargets: capsule.managedTargets,
        }
      : null,
  };
}

module.exports = {
  CURRENT_CAPSULE_VERSION,
  CURRENT_RECOVERY_READER_VERSION,
  buildRecoveryCapsule,
  resolveRecoveryCapsule,
  validateRecoveryCapsule,
};
