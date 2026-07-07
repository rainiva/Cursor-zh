const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createUninstallOrchestratorModule,
  checkCursorRunning,
} = require('../../tool/uninstall-orchestrator.js');

// ─── Unit: checkCursorRunning ────────────────────────────────────────────────

test('checkCursorRunning returns { running: true } when tasklist output contains Cursor.exe', () => {
  const fakeExecSync = () =>
    '\r\nImage Name                     PID Session Name        Session#    Mem Usage\r\nCursor.exe                   12345 Console                     1    200000 K\r\n';

  const result = checkCursorRunning({ execSync: fakeExecSync });
  assert.equal(result.running, true);
});

test('checkCursorRunning returns { running: false } when tasklist output has no Cursor.exe', () => {
  const fakeExecSync = () =>
    '\r\nImage Name                     PID Session Name        Session#    Mem Usage\r\nchrome.exe                    9999 Console                     1    100000 K\r\n';

  const result = checkCursorRunning({ execSync: fakeExecSync });
  assert.equal(result.running, false);
});

test('checkCursorRunning returns { running: false, warning } when execSync throws', () => {
  const fakeExecSync = () => { throw new Error('command not found'); };

  const result = checkCursorRunning({ execSync: fakeExecSync });
  assert.equal(result.running, false);
  assert.ok(result.warning, 'should include a warning message');
});

// ─── Integration: runUninstall preflight ─────────────────────────────────────

test('runUninstall aborts with exitCode=1 when Cursor is running', () => {
  const logs = [];
  const originalLog = console.log;
  const originalWarn = console.warn;
  console.log = (...args) => logs.push(args.join(' '));
  console.warn = (...args) => logs.push(args.join(' '));

  const originalExitCode = process.exitCode;
  process.exitCode = undefined;

  try {
    const mod = createUninstallOrchestratorModule({
      toolPaths: {
        backupRoot: '/fake/backups',
        buildManifestPath: '/fake/state/build-manifest.json',
        generatedDir: '/fake/state/generated',
        startCursorPathFile: '/fake/state/start-cursor-path.txt',
        toggleSignalPath: '/fake/state/toggle-signal',
        workspaceRoot: '/fake/workspace',
        extensionOverlayPath: '/fake/ext-overlay',
        desktopShortcutName: 'Cursor 中文版.lnk',
      },
      checkCursorRunning: () => ({ running: true }),
      readJson: () => ({}),
      readJsonIfExists: () => null,
      writeJson: () => {},
      loadInstallMetadata: () => ({}),
      loadMergedMappings: () => ({}),
      verifyCleanState: () => ({ issues: [] }),
      printReport: () => {},
      env: {},
    });

    const result = mod.runUninstall({ paths: { installDir: 'C:/fake' } });

    assert.equal(result.aborted, true, 'should return aborted=true');
    assert.equal(process.exitCode, 1, 'should set process.exitCode = 1');
    const allOutput = logs.join('\n');
    assert.match(allOutput, /Cursor.*运行/, 'should print Chinese prompt to quit Cursor');
  } finally {
    console.log = originalLog;
    console.warn = originalWarn;
    process.exitCode = originalExitCode;
  }
});

test('runUninstall proceeds when Cursor is not running', () => {
  const logs = [];
  const originalLog = console.log;
  const originalWarn = console.warn;
  console.log = (...args) => logs.push(args.join(' '));
  console.warn = (...args) => logs.push(args.join(' '));

  const originalExitCode = process.exitCode;
  process.exitCode = undefined;

  try {
    const mod = createUninstallOrchestratorModule({
      toolPaths: {
        backupRoot: '/fake/backups',
        buildManifestPath: '/fake/state/build-manifest.json',
        generatedDir: '/fake/state/generated',
        startCursorPathFile: '/fake/state/start-cursor-path.txt',
        toggleSignalPath: '/fake/state/toggle-signal',
        workspaceRoot: '/fake/workspace',
        extensionOverlayPath: '/fake/ext-overlay',
        desktopShortcutName: 'Cursor 中文版.lnk',
      },
      checkCursorRunning: () => ({ running: false }),
      readJson: () => ({}),
      readJsonIfExists: () => null,
      writeJson: () => {},
      loadInstallMetadata: () => ({}),
      loadMergedMappings: () => ({}),
      verifyCleanState: () => ({ issues: [] }),
      printReport: () => {},
      env: {},
    });

    // runUninstall will proceed past preflight but may fail later due to minimal mocks
    // The key assertion: it should NOT return aborted=true
    let result;
    try {
      result = mod.runUninstall({ paths: { installDir: 'C:/fake' } });
    } catch {
      // Expected — later phases will fail with minimal mocks, that's fine
    }

    // If we got a result, it should not be aborted
    if (result) {
      assert.notEqual(result.aborted, true, 'should not be aborted when Cursor is not running');
    }
    assert.notEqual(process.exitCode, 1, 'should not set exitCode=1');
  } finally {
    console.log = originalLog;
    console.warn = originalWarn;
    process.exitCode = originalExitCode;
  }
});

test('runUninstall proceeds with warning when checkCursorRunning returns a warning', () => {
  const logs = [];
  const originalLog = console.log;
  const originalWarn = console.warn;
  console.log = (...args) => logs.push(args.join(' '));
  console.warn = (...args) => logs.push(args.join(' '));

  const originalExitCode = process.exitCode;
  process.exitCode = undefined;

  try {
    const mod = createUninstallOrchestratorModule({
      toolPaths: {
        backupRoot: '/fake/backups',
        buildManifestPath: '/fake/state/build-manifest.json',
        generatedDir: '/fake/state/generated',
        startCursorPathFile: '/fake/state/start-cursor-path.txt',
        toggleSignalPath: '/fake/state/toggle-signal',
        workspaceRoot: '/fake/workspace',
        extensionOverlayPath: '/fake/ext-overlay',
        desktopShortcutName: 'Cursor 中文版.lnk',
      },
      checkCursorRunning: () => ({ running: false, warning: '无法执行 tasklist 命令，跳过进程检测' }),
      readJson: () => ({}),
      readJsonIfExists: () => null,
      writeJson: () => {},
      loadInstallMetadata: () => ({}),
      loadMergedMappings: () => ({}),
      verifyCleanState: () => ({ issues: [] }),
      printReport: () => {},
      env: {},
    });

    let result;
    try {
      result = mod.runUninstall({ paths: { installDir: 'C:/fake' } });
    } catch {
      // Later phases may fail with minimal mocks
    }

    if (result) {
      assert.notEqual(result.aborted, true);
    }
    assert.notEqual(process.exitCode, 1);
    const allOutput = logs.join('\n');
    assert.match(allOutput, /无法执行 tasklist/, 'should output the warning');
  } finally {
    console.log = originalLog;
    console.warn = originalWarn;
    process.exitCode = originalExitCode;
  }
});
