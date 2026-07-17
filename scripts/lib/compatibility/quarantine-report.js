'use strict';

const EPHEMERAL_RECORD_KEYS = new Set([
  'hmacKey',
  'sessionKey',
  'ephemeralKey',
  'key',
]);

function shouldDropRuntimeRawText(record) {
  return (
    record?.source === 'runtime' &&
    record.text &&
    record.capturePolicy !== 'allowlisted-chrome'
  );
}

function sanitizeQuarantineRecord(record) {
  if (!record || typeof record !== 'object') {
    return record;
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(record)) {
    if (EPHEMERAL_RECORD_KEYS.has(key)) {
      continue;
    }
    if (key === 'text' && shouldDropRuntimeRawText(record)) {
      continue;
    }
    sanitized[key] = value;
  }
  return sanitized;
}

function buildQuarantineReport(records) {
  const report = {
    blockers: [],
    changedAliases: [],
    criticalUnknown: [],
    visibleUnknown: [],
    noise: [],
    privacyDrops: 0,
  };

  for (const input of records || []) {
    if (shouldDropRuntimeRawText(input)) {
      report.privacyDrops += 1;
      continue;
    }

    const record = sanitizeQuarantineRecord(input);
    if (record.kind === 'blocked') {
      report.blockers.push(record);
    } else if (record.kind === 'changed-alias') {
      report.changedAliases.push(record);
    } else if (record.kind === 'unknown' && record.critical) {
      report.criticalUnknown.push(record);
    } else if (record.kind === 'unknown') {
      report.visibleUnknown.push(record);
    } else {
      report.noise.push(record);
    }
  }

  return report;
}

function serializeQuarantineReport(report) {
  const serialized = {
    blockers: (report.blockers || []).map(sanitizeQuarantineRecord),
    changedAliases: (report.changedAliases || []).map(sanitizeQuarantineRecord),
    criticalUnknown: (report.criticalUnknown || []).map(sanitizeQuarantineRecord),
    visibleUnknown: (report.visibleUnknown || []).map(sanitizeQuarantineRecord),
    noise: (report.noise || []).map(sanitizeQuarantineRecord),
    privacyDrops: report.privacyDrops || 0,
  };

  const reserialized = JSON.stringify(serialized);
  if (reserialized.includes('"hmacKey"') || reserialized.includes('"sessionKey"')) {
    throw new Error('quarantine report must not serialize ephemeral HMAC keys');
  }

  return serialized;
}

function writeQuarantineReport({ records, reportPath, writeJson }) {
  const report = buildQuarantineReport(records);
  const payload = serializeQuarantineReport(report);
  writeJson(reportPath, payload);
  return report;
}

function summarizeUpdateAdmission(manifest) {
  const units = manifest?.updateProfile?.units || [];
  const admission = manifest?.admission || null;
  const quarantineReport = manifest?.quarantineReport || null;

  const resolved = units
    .filter((unit) => unit.outcome === 'resolved')
    .map((unit) => unit.translationId);
  const fallback = units
    .filter((unit) => unit.outcome === 'fallback')
    .map((unit) => ({
      translationId: unit.translationId,
      proofKey: unit.fallbackProof?.proofKey || null,
    }));
  const blockedFromUnits = units
    .filter((unit) => unit.outcome === 'blocked')
    .map((unit) => unit.translationId);
  const blocked = [
    ...new Set([...(admission?.blockers || []), ...blockedFromUnits]),
  ];

  const unknown = {
    critical: quarantineReport?.criticalUnknown?.length || 0,
    visible: quarantineReport?.visibleUnknown?.length || 0,
    fingerprints: (quarantineReport?.visibleUnknown || []).filter((item) => item.fingerprint).length,
    privacyDrops: quarantineReport?.privacyDrops || 0,
  };

  const issues = blocked.map((translationId) => `Translation unit blocked: ${translationId}`);
  const warnings = [];

  if (admission?.status === 'DEGRADED') {
    for (const entry of fallback) {
      const proofSuffix = entry.proofKey ? ` (proof: ${entry.proofKey})` : ' (proof: missing)';
      warnings.push(`DEGRADED fallback ${entry.translationId}${proofSuffix}`);
    }
  }

  return {
    admissionStatus: admission?.status || null,
    resolved,
    fallback,
    blocked,
    unknown,
    issues,
    warnings,
  };
}

module.exports = {
  buildQuarantineReport,
  sanitizeQuarantineRecord,
  serializeQuarantineReport,
  writeQuarantineReport,
  summarizeUpdateAdmission,
};
