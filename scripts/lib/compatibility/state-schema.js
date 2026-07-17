'use strict';

const path = require('node:path');

const CURRENT_SCHEMA_VERSION = 3;
const CURRENT_READER_VERSION = 3;
const SUPPORTED_SOURCE_SCHEMAS = new Set([0, 1, 2, 3]);

function normalizeInstallDir(installDir) {
  if (!installDir) {
    return null;
  }
  return path.resolve(String(installDir)).replace(/\\/g, '/').toLowerCase();
}

function deriveInstallIdentity(manifest) {
  const installDir = manifest?.installDir || manifest?.installIdentity?.installDir || null;
  if (!installDir) {
    return manifest?.installIdentity || null;
  }
  return {
    installDir: String(installDir),
    normalizedInstallDir: normalizeInstallDir(installDir),
  };
}

function adaptV0Manifest(raw) {
  return {
    ...raw,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    minReaderVersion: 0,
    installIdentity: deriveInstallIdentity(raw),
  };
}

function adaptV1Manifest(raw) {
  return {
    ...raw,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    minReaderVersion: Math.min(raw.minReaderVersion ?? 1, CURRENT_READER_VERSION),
    installIdentity: deriveInstallIdentity(raw),
  };
}

function adaptV2Manifest(raw) {
  return {
    ...raw,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    minReaderVersion: Math.min(raw.minReaderVersion ?? 2, CURRENT_READER_VERSION),
    installIdentity: deriveInstallIdentity(raw),
    recoveryCapsuleRef: raw.recoveryCapsulePath || raw.recoveryCapsuleRef || null,
  };
}

function adaptV3Manifest(raw) {
  return {
    ...raw,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    minReaderVersion: Math.min(raw.minReaderVersion ?? CURRENT_READER_VERSION, CURRENT_READER_VERSION),
    installIdentity: deriveInstallIdentity(raw),
    recoveryCapsuleRef: raw.recoveryCapsuleRef || raw.recoveryCapsulePath || null,
  };
}

const ADAPTERS = {
  0: adaptV0Manifest,
  1: adaptV1Manifest,
  2: adaptV2Manifest,
  3: adaptV3Manifest,
};

function detectSourceSchema(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }
  if (raw.schemaVersion === undefined || raw.schemaVersion === null) {
    return 0;
  }
  const version = Number(raw.schemaVersion);
  return Number.isInteger(version) ? version : null;
}

function parseRawManifest(raw) {
  if (typeof raw === 'string') {
    try {
      return { parsed: JSON.parse(raw), error: null };
    } catch (error) {
      return { parsed: null, error };
    }
  }
  if (raw && typeof raw === 'object') {
    return { parsed: raw, error: null };
  }
  return { parsed: null, error: new Error('manifest must be an object or JSON string') };
}

function readStateManifest(raw, { readerVersion = CURRENT_READER_VERSION } = {}) {
  const { parsed, error } = parseRawManifest(raw);
  if (error || !parsed) {
    return {
      status: 'invalid',
      sourceSchema: null,
      manifest: null,
      guidance: 'State manifest is not valid JSON.',
    };
  }

  const sourceSchema = detectSourceSchema(parsed);
  if (sourceSchema === null) {
    return {
      status: 'invalid',
      sourceSchema: null,
      manifest: null,
      guidance: 'State manifest schemaVersion must be an integer.',
    };
  }

  if (sourceSchema > readerVersion) {
    return {
      status: 'future-unsupported',
      sourceSchema,
      manifest: null,
      guidance: `State schema ${sourceSchema} requires reader ${sourceSchema}; this tool supports up to reader ${readerVersion}. Install a matching or newer cursor-zh release.`,
    };
  }

  if (!SUPPORTED_SOURCE_SCHEMAS.has(sourceSchema)) {
    return {
      status: 'future-unsupported',
      sourceSchema,
      manifest: null,
      guidance: `Unsupported state schema ${sourceSchema}. Install a matching or newer cursor-zh release.`,
    };
  }

  const minReaderVersion = Number(parsed.minReaderVersion ?? (sourceSchema === 0 ? 0 : sourceSchema));
  if (Number.isInteger(minReaderVersion) && minReaderVersion > readerVersion) {
    return {
      status: 'reader-too-new',
      sourceSchema,
      manifest: null,
      guidance: `State manifest requires reader ${minReaderVersion}; this tool is reader ${readerVersion}. Install a matching or newer cursor-zh release.`,
    };
  }

  const adapter = ADAPTERS[sourceSchema];
  return {
    status: 'compatible',
    sourceSchema,
    manifest: adapter(parsed),
    guidance: null,
  };
}

function canRunOperation(operation, stateResult, options = {}) {
  if (!stateResult || stateResult.status !== 'compatible') {
    if (operation === 'uninstall' && stateResult?.status === 'future-unsupported') {
      const validation = options.validation
        || (options.capsule
          ? require('../install/recovery-capsule.js').validateRecoveryCapsule(options.capsule, {
            readerVersion: options.readerVersion,
            installDir: options.installDir,
            fs: options.fs,
          })
          : null);
      return Boolean(validation?.valid);
    }
    return false;
  }

  if (operation === 'uninstall') {
    return true;
  }

  return operation === 'apply' || operation === 'ensure' || operation === 'verify' || operation === 'start';
}

module.exports = {
  CURRENT_SCHEMA_VERSION,
  CURRENT_READER_VERSION,
  SUPPORTED_SOURCE_SCHEMAS,
  normalizeInstallDir,
  readStateManifest,
  canRunOperation,
};
