const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { createToolPaths } = require('../../tool/paths.js');
const { createVerifyModule } = require('../../tool/verify.js');
const { findLanguagePackCacheMessagePaths } = require('../../tool/language-pack-cache.js');

function createCleanInstall(workspaceRoot) {
  const installDir = path.join(workspaceRoot, 'cursor');
  const resourcesAppDir = path.join(installDir, 'resources', 'app');
  const outDir = path.join(resourcesAppDir, 'out');
  const workbenchDir = path.join(outDir, 'vs', 'workbench');

  fs.mkdirSync(workbenchDir, { recursive: true });
  fs.writeFileSync(
    path.join(resourcesAppDir, 'package.json'),
    JSON.stringify({ main: './out/main.js', version: '3.9.8' }, null, 2)
  );
  fs.writeFileSync(path.join(outDir, 'main.js'), 'main');
  fs.writeFileSync(path.join(outDir, 'nls.messages.json'), '["&&File"]');
  fs.writeFileSync(path.join(workbenchDir, 'workbench.desktop.main.js'), 'desktop');

  return {
    paths: {
      installDir,
      resourcesAppDir,
      packageJsonPath: path.join(resourcesAppDir, 'package.json'),
      translatorBootstrapPath: path.join(outDir, 'cursorTranslatorMain.js'),
      mainOriginalPath: path.join(outDir, 'main.js'),
      mainTranslatedPath: path.join(outDir, 'main_translated.js'),
      nlsMessagesPath: path.join(outDir, 'nls.messages.json'),
      workbenchOriginalPath: path.join(workbenchDir, 'workbench.desktop.main.js'),
      workbenchTranslatedPath: path.join(workbenchDir, 'workbench.desktop.main_translated.js'),
      argvPath: path.join(workspaceRoot, 'argv.json'),
      userLocaleMirrorPath: null,
    },
  };
}

function createVerifyHarness(workspaceRoot, overrides = {}) {
  const toolPaths = createToolPaths(workspaceRoot);
  const isolatedAppDataRoot = path.join(workspaceRoot, 'isolated-appdata');
  fs.mkdirSync(isolatedAppDataRoot, { recursive: true });
  return createVerifyModule({
    toolPaths,
    fs,
    env: overrides.env || { APPDATA: isolatedAppDataRoot },
    getManagedExtensionTranslationFiles:
      overrides.getManagedExtensionTranslationFiles || (() => []),
    findLanguagePackCacheMessagePaths:
      overrides.findLanguagePackCacheMessagePaths || findLanguagePackCacheMessagePaths,
    readText: (filePath) => fs.readFileSync(filePath, 'utf8'),
    readJson: (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8')),
    readJsonIfExists: (filePath, fallback) => {
      if (!fs.existsSync(filePath)) {
        return fallback;
      }
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    },
    sha256OfFile: () => 'hash',
    compareLanguagePackVersion: () => ({ compatible: true }),
    readArgvConfig: (argvPath) => {
      if (!fs.existsSync(argvPath)) {
        return {};
      }
      return JSON.parse(fs.readFileSync(argvPath, 'utf8'));
    },
    loadMergedMappings: () => ({
      baseMappings: [],
      overlayMappings: [],
      cursorWinCommonMappings: [],
      dynamicMappings: [],
      mergedMappings: [],
    }),
    buildCursorWinCoverage: () => ({
      totalTargetCount: 0,
      bundleTargetCount: 0,
      mappedTargetCount: 0,
      missingTargets: [],
      sourceAvailable: true,
    }),
    buildDynamicCoverage: () => ({
      totalRuleCount: 0,
      bundleRuleCount: 0,
      mappedRuleCount: 0,
      missingRules: [],
      sourceAvailable: true,
    }),
    buildProductTipsCoverage: () => ({
      totalTipCount: 0,
      mappedTipCount: 0,
      missingTips: [],
    }),
    defaultCursorWinDynamicMappings: () => [],
    detectAppliedRuntimeMode: () => 'performance',
    buildRuntimeMappingsInfo: () => ({ workbenchSource: '', runtimeMappings: [] }),
    buildRuntimeStrategyReport: () => ({
      mode: 'performance',
      runtimeMappingCount: 0,
      runtimeHeaderChars: 0,
      runtimeHeaderKB: 0,
      prunedMappingCount: 0,
    }),
    parseInstalledRuntimeArtifact: () => null,
    hasInstalledRuntimeHeader: () => false,
    summarizeStaticPatchContractsFromTranslatedSource: () => ({}),
    evaluatePatchContracts: () => ({ issues: [], warnings: [] }),
    summarizeRuntimeFootprint: () => ({
      runtimeMappingCount: 0,
      runtimeHeaderChars: 0,
      runtimeHeaderKB: 0,
    }),
    isTranslatorBootstrapSource: () => false,
    createBootstrapSource: () => '',
    createStageTimer: () => ({
      start() {},
      end() {},
      printSummary: () => ({ label: '耗时', totalMs: 0, stages: [] }),
    }),
    createSessionCache: () => ({
      readTextCached: (filePath) => fs.readFileSync(filePath, 'utf8'),
      readTextPrefix: () => '',
      sha256Cached: () => 'hash',
      filesEqualByHash: () => true,
    }),
  });
}

test('verifyCleanState passes on a clean install without zh-cn artifacts', () => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-verify-clean-'));
  const context = createCleanInstall(workspaceRoot);
  const { verifyCleanState } = createVerifyHarness(workspaceRoot);

  const result = verifyCleanState(context, { pkg: { main: './out/main.js', version: '3.9.8' } });

  assert.deepEqual(result.issues, []);
  assert.ok(result.info.some((line) => /package\.json/.test(line)));
});

test('verifyCleanState fails when bootstrap or translated workbench files remain', () => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-verify-clean-'));
  const context = createCleanInstall(workspaceRoot);
  fs.writeFileSync(context.paths.translatorBootstrapPath, 'bootstrap');
  fs.writeFileSync(context.paths.workbenchTranslatedPath, 'translated');
  fs.writeFileSync(
    context.paths.argvPath,
    JSON.stringify({ locale: 'zh-cn' }, null, 2)
  );

  const { verifyCleanState } = createVerifyHarness(workspaceRoot);
  const result = verifyCleanState(context, { pkg: { main: './out/main.js', version: '3.9.8' } });

  assert.ok(result.issues.length >= 3);
  assert.ok(result.issues.some((issue) => /bootstrap|cursorTranslatorMain/i.test(issue)));
  assert.ok(result.issues.some((issue) => /translated/i.test(issue)));
  assert.ok(result.issues.some((issue) => /zh-cn/i.test(issue)));
});

test('verifyCleanState fails when package.json still points at translator bootstrap', () => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-verify-clean-'));
  const context = createCleanInstall(workspaceRoot);
  fs.writeFileSync(
    context.paths.packageJsonPath,
    JSON.stringify({ main: './out/cursorTranslatorMain.js' }, null, 2)
  );

  const { verifyCleanState } = createVerifyHarness(workspaceRoot);
  const result = verifyCleanState(context, {
    pkg: { main: './out/cursorTranslatorMain.js', version: '3.9.8' },
  });

  assert.ok(result.issues.some((issue) => /package\.json/i.test(issue)));
});

test('verifyCleanState fails when locale mirror still forces zh-cn', () => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-verify-clean-'));
  const context = createCleanInstall(workspaceRoot);
  const localeMirrorPath = path.join(workspaceRoot, 'locale.json');
  context.paths.userLocaleMirrorPath = localeMirrorPath;
  fs.writeFileSync(
    localeMirrorPath,
    JSON.stringify({ locale: 'zh-cn', source: 'cursor-zh-tool' }, null, 2)
  );

  const { verifyCleanState } = createVerifyHarness(workspaceRoot);
  const result = verifyCleanState(context, { pkg: { main: './out/main.js', version: '3.9.8' } });

  assert.ok(result.issues.some((issue) => /locale/i.test(issue)));
});

test('verifyCleanState fails when managed extension zh-cn nls remains', () => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-verify-clean-'));
  const context = createCleanInstall(workspaceRoot);
  const extensionNlsPath = path.join(
    context.paths.resourcesAppDir,
    'extensions',
    'cursor-always-local',
    'package.nls.zh-cn.json'
  );
  fs.mkdirSync(path.dirname(extensionNlsPath), { recursive: true });
  fs.writeFileSync(extensionNlsPath, '{"displayName":"test"}');

  const { verifyCleanState } = createVerifyHarness(workspaceRoot, {
    getManagedExtensionTranslationFiles: () => [
      {
        kind: 'extensionTranslation',
        targetPath: extensionNlsPath,
      },
    ],
  });
  const result = verifyCleanState(context, { pkg: { main: './out/main.js', version: '3.9.8' } });

  assert.ok(result.issues.some((issue) => /package\.nls\.zh-cn|扩展/i.test(issue)));
});

test('verifyCleanState fails when clp zh-cn cache messages remain', () => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-verify-clean-'));
  const appDataRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-verify-clean-appdata-'));
  const context = createCleanInstall(workspaceRoot);
  const clpMessagePath = path.join(
    appDataRoot,
    'Cursor',
    'clp',
    'ms-ceintl.vscode-language-pack-zh-hans-1.105.0.zh-cn',
    '1.105.0',
    'nls.messages.json'
  );
  fs.mkdirSync(path.dirname(clpMessagePath), { recursive: true });
  fs.writeFileSync(clpMessagePath, '["translated"]');

  const { verifyCleanState } = createVerifyHarness(workspaceRoot, {
    env: { APPDATA: appDataRoot },
    findLanguagePackCacheMessagePaths: (env, fsModule) =>
      findLanguagePackCacheMessagePaths(env, fsModule),
  });
  const result = verifyCleanState(context, { pkg: { main: './out/main.js', version: '3.9.8' } });

  assert.ok(result.issues.some((issue) => /clp/i.test(issue)));
});

test('verifyCleanState fails when restored nls hash does not match backup snapshot', () => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-verify-clean-'));
  const backupDir = path.join(workspaceRoot, 'backup');
  const context = createCleanInstall(workspaceRoot);
  const nlsBackupPath = path.join(backupDir, 'resources', 'app', 'out', 'nls.messages.json');
  fs.mkdirSync(path.dirname(nlsBackupPath), { recursive: true });
  fs.writeFileSync(nlsBackupPath, '["&&File","&&Edit"]', 'utf8');

  const { sha256OfFile } = require('../../tool/io.js');
  const expectedHash = sha256OfFile(nlsBackupPath);
  fs.writeFileSync(context.paths.nlsMessagesPath, '["文件","编辑"]', 'utf8');

  const { verifyCleanState } = createVerifyHarness(workspaceRoot);
  const result = verifyCleanState(
    context,
    { pkg: { main: './out/main.js', version: '3.9.8' } },
    {
      backupDir,
      backupMetadata: {
        snapshot: {
          hashes: {
            nlsMessages: expectedHash,
          },
        },
      },
    }
  );

  assert.ok(result.issues.some((issue) => /nls\.messages\.json/i.test(issue)));
});
