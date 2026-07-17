'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {
  validateRolloutPromotion,
  loadRolloutEvidence,
  ROLLOUT_EVIDENCE_FILENAME,
} = require('./rollout-state.js');

function readArg(argv, flag) {
  const index = argv.indexOf(flag);
  if (index === -1) {
    return null;
  }
  return argv[index + 1] ?? null;
}

function main(argv = process.argv.slice(2)) {
  const requirePromotable =
    argv.includes('--require-promotable') || process.env.CURSOR_ZH_REQUIRE_ROLLOUT_PROMOTION === '1';
  const fileArg = readArg(argv, '--file') || readArg(argv, '--rollout-evidence');
  const evidencePath =
    fileArg ||
    path.join(process.cwd(), 'state', 'reports', ROLLOUT_EVIDENCE_FILENAME);

  if (!fs.existsSync(evidencePath)) {
    console.error(`Missing rollout evidence: ${evidencePath}`);
    return 1;
  }

  let evidence;
  try {
    evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
  } catch (error) {
    console.error(`Invalid rollout evidence JSON: ${error.message}`);
    return 1;
  }

  const result = validateRolloutPromotion(evidence);
  if (result.issues.length > 0) {
    console.log('Rollout promotion issues:');
    for (const issue of result.issues) {
      console.log(`- ${issue}`);
    }
  }

  if (evidence.liveOperation?.status === 'fail') {
    console.error('Rollout evidence records a failed live operation.');
    return 1;
  }

  if (result.issues.some((issue) => /legacy writer dependency expired/i.test(issue))) {
    console.error('Release blocked: expired legacy writer dependency.');
    return 1;
  }

  if (!evidence.rolloutMode) {
    console.error('Rollout evidence missing rolloutMode.');
    return 1;
  }

  if (requirePromotable && !result.promotable) {
    console.error('Rollout promotion blocked: evidence is not promotable to enforced.');
    return 1;
  }

  if (evidence.rolloutMode === 'enforced' && !result.promotable) {
    console.error('Release blocked: rolloutMode=enforced but promotion gates failed.');
    return 1;
  }

  console.log(
    result.promotable
      ? 'Rollout promotion: promotable to enforced.'
      : `Rollout promotion: not yet promotable (mode=${evidence.rolloutMode}).`
  );
  return 0;
}

if (require.main === module) {
  process.exitCode = main();
}

module.exports = {
  main,
  loadRolloutEvidence,
  validateRolloutPromotion,
};
