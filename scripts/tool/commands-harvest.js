const fs = require('fs');
const path = require('path');

const { harvestInstallDir } = require('../lib/analyzer/string-harvest.js');
const { DEFAULT_HARVEST_TIER } = require('../lib/analyzer/harvest-string-quality.js');
const { mergeMarketplaceDescriptionsCatalog, pluginsFromHarvestSnapshot } = require('../lib/analyzer/harvest-marketplace.js');
const { analyzeReverseCoverage } = require('../lib/analyzer/coverage-reverse.js');
const { diffHarvestSnapshots } = require('../lib/analyzer/harvest-diff.js');
const { createHarvestProgressReporter } = require('../lib/analyzer/harvest-progress.js');
const {
  loadEmbeddedPatchesForVersion,
  diffEmbeddedPatchOrphans,
  resolvePatchPackId,
} = require('../lib/mapping/versioned-patches.js');

function stripHarvestRuntimeFields(harvest = {}) {
  const { sourcesByPath, ...payload } = harvest;
  return payload;
}

function createHarvestModule({
  toolPaths,
  fs: fsModule,
  readText,
  writeJson,
  writeText,
  readJsonIfExists,
  loadMergedMappings,
  loadInstallMetadata,
  ensureDir,
}) {
  const fsRef = fsModule || fs;

  function resolveHarvestPaths(cursorVersion) {
    const versionLabel = cursorVersion || 'unknown';
    return {
      snapshotPath: path.join(toolPaths.harvestSnapshotsDir, `${versionLabel}.json`),
      reportJsonPath: path.join(toolPaths.harvestReportsDir, `harvest-${versionLabel}.json`),
      reportMarkdownPath: path.join(toolPaths.harvestReportsDir, `harvest-${versionLabel}.md`),
      ledgerJsonPath: path.join(toolPaths.harvestReportsDir, `coverage-ledger-${versionLabel}.json`),
    };
  }

  function findPreviousSnapshotPath(currentVersion) {
    if (!fsRef.existsSync(toolPaths.harvestSnapshotsDir)) {
      return null;
    }

    const candidates = fsRef
      .readdirSync(toolPaths.harvestSnapshotsDir)
      .filter((name) => name.endsWith('.json') && name !== `${currentVersion}.json`)
      .map((name) => path.join(toolPaths.harvestSnapshotsDir, name))
      .sort();

    return candidates.length > 0 ? candidates[candidates.length - 1] : null;
  }

  function resolveProgressReporter(options = {}) {
    if (options.quiet) {
      return null;
    }
    if (options.onProgress) {
      return options.onProgress;
    }
    return createHarvestProgressReporter();
  }

  function renderHarvestMarkdown({
    harvest,
    reverseCoverage,
    diff,
    harvestTier = DEFAULT_HARVEST_TIER,
    topUnmapped = 20,
    topOrphans = 10,
  }) {
    const lines = [
      `# Harvest report (${harvest.cursorVersion || 'unknown'})`,
      '',
      `- Generated: ${harvest.generatedAt}`,
      `- VS Code: ${harvest.vscodeVersion || 'unknown'}`,
      `- Harvest tier: ${harvestTier}`,
      `- Files scanned: ${harvest.files.length}`,
      `- Actionable UI strings harvested: ${reverseCoverage.summary.total}`,
      `- Unmapped actionable strings: ${reverseCoverage.summary.unmapped}`,
      `- Policy: only UI-context strings (title/label/children/...) and glass anchors; literal and source-map original strings excluded; actionable tier applies a strict children gate (badges, length >= 20, or >= 3 readable words)`,
      `- Note: runtime errors, DOM tokens, and implementation identifiers are filtered out`,
      '',
    ];

    const coveredCount =
      (reverseCoverage.summary.covered_static || 0) +
      (reverseCoverage.summary.covered_runtime || 0) +
      (reverseCoverage.summary.covered_dynamic || 0) +
      (reverseCoverage.summary.covered_anchor || 0) +
      (reverseCoverage.summary.covered_contract || 0);

    lines.push('## Coverage ledger', '');
    lines.push(`- Covered: ${coveredCount}`);
    lines.push(
      `- Breakdown: static ${reverseCoverage.summary.covered_static || 0}, runtime ${reverseCoverage.summary.covered_runtime || 0}, dynamic ${reverseCoverage.summary.covered_dynamic || 0}, anchor ${reverseCoverage.summary.covered_anchor || 0}`
    );
    if (reverseCoverage.summary.ambiguous) {
      lines.push(`- Ambiguous: ${reverseCoverage.summary.ambiguous}`);
    }
    const mappedByLayer = reverseCoverage.summary.mappedByLayer || {};
    const layerSummary = Object.entries(mappedByLayer)
      .sort((left, right) => right[1] - left[1])
      .map(([layer, count]) => `${layer} ${count}`)
      .join(', ');
    if (layerSummary) {
      lines.push(`- By layer: ${layerSummary}`);
    }
    lines.push('');

    const mappedSamples = (reverseCoverage.entries || []).filter(
      (entry) => entry.matchedRules?.length > 0
    );
    if (mappedSamples.length > 0) {
      lines.push('## Top mapped samples', '');
      for (const entry of mappedSamples.slice(0, 10)) {
        const rule = entry.matchedRules[0];
        lines.push(
          `- \`${entry.text}\` → \`${rule.changeText}\` [${rule.layer}] (${entry.path}, ${entry.context})`
        );
      }
      lines.push('');
    }

    const orphanRules = (reverseCoverage.ruleUsage || []).filter((entry) => entry.status === 'orphan');
    if (orphanRules.length > 0) {
      lines.push('## Top orphan rules', '');
      for (const entry of orphanRules.slice(0, topOrphans)) {
        lines.push(`- \`${entry.ruleKey}\` [${entry.layer}]`);
      }
      lines.push('');
    }

    const contractStatus = reverseCoverage.contractStatus || [];
    const missingContracts = contractStatus.filter((entry) => entry.status !== 'satisfied');
    if (contractStatus.length > 0) {
      lines.push('## Contract gate (P0)', '');
      lines.push(`- Satisfied: ${contractStatus.filter((entry) => entry.status === 'satisfied').length}`);
      lines.push(`- Missing: ${contractStatus.filter((entry) => entry.status === 'missing').length}`);
      lines.push(`- Drift: ${contractStatus.filter((entry) => entry.status === 'drift').length}`);
      for (const entry of missingContracts.slice(0, 10)) {
        lines.push(`- missing \`${entry.id}\``);
      }
      lines.push('');
    }

    if (diff) {
      lines.push(
        '## Diff',
        `- Added: ${diff.added.length}`,
        `- Removed: ${diff.removed.length}`,
        `- Anchor-stable changes: ${diff.changed_anchor_stable.length}`,
        ''
      );
    }

    lines.push('## Top unmapped strings', '');
    for (const entry of reverseCoverage.unmapped.slice(0, topUnmapped)) {
      lines.push(`- \`${entry.text}\` (${entry.path}, ${entry.context})`);
    }
    lines.push('');

    const unmappedBySurface = reverseCoverage.unmappedBySurface || {};
    const surfaceIds = Object.keys(unmappedBySurface).sort();
    if (surfaceIds.length > 0) {
      lines.push('## Unmapped by surface', '');
      for (const surfaceId of surfaceIds) {
        const entries = unmappedBySurface[surfaceId] || [];
        lines.push(`### ${surfaceId} (${entries.length})`, '');
        for (const entry of entries.slice(0, 10)) {
          lines.push(`- \`${entry.text}\` (${entry.path}, ${entry.context})`);
        }
        if (entries.length > 10) {
          lines.push(`- … and ${entries.length - 10} more`);
        }
        lines.push('');
      }
    }

    return lines.join('\n');
  }

  function buildHarvestReport(context, options = {}) {
    const onProgress = resolveProgressReporter(options);
    const metadata = loadInstallMetadata(context);

    onProgress?.({
      stage: 'start',
      cursorVersion: metadata.pkg.version,
    });
    onProgress?.({
      stage: 'metadata',
      cursorVersion: metadata.pkg.version,
      vscodeVersion: metadata.product.vscodeVersion,
    });

    const harvestTier = options.harvestTier || DEFAULT_HARVEST_TIER;

    const harvest = harvestInstallDir({
      resourcesAppDir: context.paths.resourcesAppDir,
      cursorVersion: metadata.pkg.version,
      vscodeVersion: metadata.product.vscodeVersion,
      fs: fsRef,
      readText,
      onProgress,
      harvestTier,
    });

    const mappingInfo = loadMergedMappings({ seed: false });
    onProgress?.({
      stage: 'mappings',
      mappingCount: mappingInfo.mergedMappings.length,
    });

    const reverseCoverage = analyzeReverseCoverage({
      harvest,
      mappingsByLayer: {
        baseMappings: mappingInfo.baseMappings,
        overlayMappings: mappingInfo.overlayMappings,
        cursorWinCommonMappings: mappingInfo.cursorWinCommonMappings,
        anchorMappings: mappingInfo.anchorMappings,
        dynamicMappings: mappingInfo.dynamicMappings,
      },
      onProgress,
    });

    const harvestPayload = stripHarvestRuntimeFields(harvest);
    const sourcesByPath = harvest.sourcesByPath || new Map();

    let diff = null;
    const previousSnapshotPath = options.diff ? findPreviousSnapshotPath(metadata.pkg.version) : null;
    if (previousSnapshotPath) {
      const baseline = readJsonIfExists(previousSnapshotPath, null);
      if (baseline) {
        diff = diffHarvestSnapshots(baseline, harvestPayload);
        onProgress?.({
          stage: 'diff',
          added: diff.added.length,
          removed: diff.removed.length,
          anchorChanged: diff.changed_anchor_stable.length,
        });
      }
    }

    const embeddedPatches = loadEmbeddedPatchesForVersion(metadata.pkg.version);
    onProgress?.({
      stage: 'patch-orphans',
      patchCount: embeddedPatches.length,
    });

    const patch_orphaned = [];
    const seenOrphanFrom = new Set();
    for (const file of harvestPayload.files || []) {
      const source = sourcesByPath.get(file.path);
      if (!source) {
        continue;
      }
      for (const orphan of diffEmbeddedPatchOrphans(source, embeddedPatches)) {
        if (seenOrphanFrom.has(orphan.from)) {
          continue;
        }
        seenOrphanFrom.add(orphan.from);
        patch_orphaned.push(orphan);
      }
    }

    onProgress?.({
      stage: 'patch-orphans-done',
      orphanCount: patch_orphaned.length,
    });

    if (diff) {
      diff.patch_orphaned = patch_orphaned;
    } else {
      diff = { added: [], removed: [], changed: [], changed_anchor_stable: [], patch_orphaned };
    }

    return {
      harvest: harvestPayload,
      reverseCoverage,
      coverageLedger: reverseCoverage.coverageLedger || reverseCoverage,
      diff,
      patchPackVersion: resolvePatchPackId(metadata.pkg.version),
      metadata,
      harvestTier,
    };
  }

  function runMarketplaceHarvest(context, options = {}) {
    const snapshotPath = path.join(toolPaths.stateDir, 'marketplace-api-snapshot.json');
    const snapshot = readJsonIfExists(snapshotPath, { plugins: [] });
    let plugins = Array.isArray(snapshot.plugins) ? snapshot.plugins : [];
    let pluginSource = plugins.length > 0 ? 'api-snapshot' : 'none';

    if ((plugins.length === 0 || options.fromWorkbench) && loadInstallMetadata) {
      const metadata = loadInstallMetadata(context);
      const harvestPaths = resolveHarvestPaths(metadata.pkg.version);
      const harvestReport = readJsonIfExists(harvestPaths.reportJsonPath, null);
      const harvestPayload =
        harvestReport?.harvest ||
        readJsonIfExists(harvestPaths.snapshotPath, null) ||
        readJsonIfExists(
          path.join(toolPaths.harvestSnapshotsDir, `${metadata.pkg.version}.json`),
          null
        );
      if (harvestPayload) {
        const fromWorkbench = pluginsFromHarvestSnapshot(harvestPayload);
        if (fromWorkbench.length > 0) {
          plugins = fromWorkbench;
          pluginSource = 'workbench-harvest';
        }
      }
    }

    const existing = readJsonIfExists(toolPaths.marketplaceDescriptionsCachePath, {
      version: 0,
      generatedAt: null,
      entries: [],
    });
    const merged = mergeMarketplaceDescriptionsCatalog(existing, plugins);
    writeJson(toolPaths.marketplaceDescriptionsCachePath, merged);
    console.log(
      `Marketplace catalog updated (${pluginSource}): ${merged.entries.length} entries -> ${toolPaths.marketplaceDescriptionsCachePath}`
    );
    if (options.out) {
      writeJson(options.out, merged);
      console.log(`Marketplace catalog copy: ${options.out}`);
    }
    return { catalog: merged, pluginCount: plugins.length };
  }

  function runHarvest(context, options = {}) {
    if (options.marketplace) {
      return runMarketplaceHarvest(context, options);
    }

    ensureDir(toolPaths.harvestSnapshotsDir);
    ensureDir(toolPaths.harvestReportsDir);

    const onProgress = resolveProgressReporter(options);
    const report = buildHarvestReport(context, { ...options, onProgress });
    const paths = resolveHarvestPaths(report.metadata.pkg.version);

    onProgress?.({ stage: 'write' });

    const ledgerPayload = {
      cursorVersion: report.metadata.pkg.version,
      generatedAt: report.harvest.generatedAt,
      summary: report.reverseCoverage.summary,
      records: report.reverseCoverage.entries,
      ruleUsage: report.reverseCoverage.ruleUsage || [],
      contractStatus: report.reverseCoverage.contractStatus || [],
      forwardRuleHits: report.reverseCoverage.forwardRuleHits || null,
    };

    if (!options.ledgerOnly) {
      const payload = {
        harvest: report.harvest,
        reverseCoverage: report.reverseCoverage,
        diff: report.diff,
      };

      const outputPath = options.out || paths.reportJsonPath;
      writeJson(outputPath, payload);
      writeText(paths.reportMarkdownPath, renderHarvestMarkdown(report));
    }

    writeJson(paths.ledgerJsonPath, ledgerPayload);

    if (options.orphans) {
      const orphanRules = (report.reverseCoverage.ruleUsage || []).filter(
        (entry) => entry.status === 'orphan'
      );
      for (const entry of orphanRules.slice(0, 20)) {
        console.log(`[harvest orphan] ${entry.ruleKey} [${entry.layer}]`);
      }
    }

    if (!options.ledgerOnly) {
      console.log(`Harvest report: ${options.out || paths.reportJsonPath}`);
      console.log(`Harvest markdown: ${paths.reportMarkdownPath}`);
    }
    console.log(`Coverage ledger: ${paths.ledgerJsonPath}`);
    console.log(
      `Harvest summary: strings=${report.reverseCoverage.summary.total}, unmapped=${report.reverseCoverage.summary.unmapped}`
    );

    if (!options.ledgerOnly && options.saveSnapshot) {
      writeJson(paths.snapshotPath, report.harvest);
    }

    if (!options.ledgerOnly && report.diff) {
      console.log(
        `Harvest diff: added=${report.diff.added.length}, removed=${report.diff.removed.length}, anchor_changed=${report.diff.changed_anchor_stable.length}`
      );
      if (report.diff.patch_orphaned?.length) {
        console.log(`Harvest patch_orphaned: ${report.diff.patch_orphaned.length}`);
      }
    }

    return report;
  }

  function summarizeHarvestForVerify(cursorVersion) {
    const paths = resolveHarvestPaths(cursorVersion);
    const report = readJsonIfExists(paths.reportJsonPath, null);
    if (!report?.reverseCoverage?.summary) {
      const previousSnapshotPath = findPreviousSnapshotPath(cursorVersion);
      if (!previousSnapshotPath) {
        return null;
      }
      return {
        message: 'Harvest snapshot 可用，运行 `node scripts/cursor-zh-tool.js harvest --save-snapshot --diff` 生成报告',
      };
    }

    const unmapped = report.reverseCoverage.summary.unmapped || 0;
    const covered =
      (report.reverseCoverage.summary.covered_static || 0) +
      (report.reverseCoverage.summary.covered_runtime || 0) +
      (report.reverseCoverage.summary.covered_dynamic || 0) +
      (report.reverseCoverage.summary.covered_anchor || 0);
    const orphanCount = (report.reverseCoverage.ruleUsage || []).filter(
      (entry) => entry.status === 'orphan'
    ).length;
    const missingContracts = (report.reverseCoverage.contractStatus || []).filter(
      (entry) => entry.status === 'missing'
    ).length;
    const diffAdded = report.diff?.added?.length || 0;
    const ledgerPath = paths.ledgerJsonPath;
    return {
      unmapped,
      covered,
      orphanCount,
      missingContracts,
      diffAdded,
      message: `Harvest: 未覆盖 ${unmapped} 条；已建档命中 ${covered} 条；合同未满足 ${missingContracts} 条；孤儿规则 ${orphanCount} 条（见 ${paths.reportMarkdownPath}，台账 ${ledgerPath}）`,
    };
  }

  return {
    runHarvest,
    buildHarvestReport,
    summarizeHarvestForVerify,
    renderHarvestMarkdown,
  };
}

module.exports = {
  createHarvestModule,
};
