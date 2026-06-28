const fs = require('fs');
const path = require('path');

const { harvestInstallDir } = require('../lib/analyzer/string-harvest.js');
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

  function renderHarvestMarkdown({ harvest, reverseCoverage, diff, topUnmapped = 20 }) {
    const lines = [
      `# Harvest report (${harvest.cursorVersion || 'unknown'})`,
      '',
      `- Generated: ${harvest.generatedAt}`,
      `- VS Code: ${harvest.vscodeVersion || 'unknown'}`,
      `- Files scanned: ${harvest.files.length}`,
      `- Strings harvested: ${reverseCoverage.summary.total}`,
      `- Unmapped: ${reverseCoverage.summary.unmapped}`,
      '',
    ];

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

    const harvest = harvestInstallDir({
      resourcesAppDir: context.paths.resourcesAppDir,
      cursorVersion: metadata.pkg.version,
      vscodeVersion: metadata.product.vscodeVersion,
      fs: fsRef,
      readText,
      onProgress,
    });

    const mappingInfo = loadMergedMappings({ seed: false });
    onProgress?.({
      stage: 'mappings',
      mappingCount: mappingInfo.mergedMappings.length,
    });

    const reverseCoverage = analyzeReverseCoverage({
      harvest,
      mappings: mappingInfo.mergedMappings,
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
      diff,
      patchPackVersion: resolvePatchPackId(metadata.pkg.version),
      metadata,
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

    const payload = {
      harvest: report.harvest,
      reverseCoverage: report.reverseCoverage,
      diff: report.diff,
    };

    const outputPath = options.out || paths.reportJsonPath;
    writeJson(outputPath, payload);
    writeText(paths.reportMarkdownPath, renderHarvestMarkdown(report));

    if (options.saveSnapshot) {
      writeJson(paths.snapshotPath, report.harvest);
    }

    console.log(`Harvest report: ${outputPath}`);
    console.log(`Harvest markdown: ${paths.reportMarkdownPath}`);
    console.log(
      `Harvest summary: strings=${report.reverseCoverage.summary.total}, unmapped=${report.reverseCoverage.summary.unmapped}`
    );

    if (report.diff) {
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
    const diffAdded = report.diff?.added?.length || 0;
    return {
      unmapped,
      diffAdded,
      message: `Harvest: 未覆盖 ${unmapped} 条；相较上一版新增 ${diffAdded} 条（见 ${paths.reportMarkdownPath}）`,
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
