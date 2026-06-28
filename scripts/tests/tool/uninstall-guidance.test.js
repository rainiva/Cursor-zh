const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildUninstallPreflightLines,
  buildUninstallPhaseLine,
  buildUninstallSuccessLines,
  buildUninstallFailureLines,
  printUninstallGuidance,
} = require('../../tool/uninstall-guidance.js');

test('buildUninstallPreflightLines reminds user to quit Cursor before uninstall', () => {
  const lines = buildUninstallPreflightLines({
    installDir: 'D:/Apps/cursor',
  });

  const text = lines.join('\n');
  assert.match(text, /完全退出 Cursor/i);
  assert.match(text, /D:\/Apps\/cursor/);
  assert.match(text, /验收/);
});

test('buildUninstallPhaseLine formats numbered progress labels', () => {
  assert.equal(buildUninstallPhaseLine(3, '恢复 package.json 与 nls'), '[卸载 3/9] 恢复 package.json 与 nls');
});

test('buildUninstallSuccessLines says doctor is optional and Cursor can start directly', () => {
  const lines = buildUninstallSuccessLines({
    installDir: 'D:/Apps/cursor',
    backupDir: 'D:/repo/state/backups/2026-06-01',
  });
  const text = lines.join('\n');

  assert.match(text, /卸载完成/);
  assert.match(text, /直接启动 Cursor/i);
  assert.match(text, /无需再跑 doctor/i);
  assert.match(text, /doctor\.ps1 -PostUninstall/);
  assert.match(text, /D:\/Apps\/cursor/);
});

test('buildUninstallFailureLines explains manifest is kept and how to retry', () => {
  const lines = buildUninstallFailureLines({
    message: 'Cannot safely uninstall without a package.json backup.',
    installDir: 'D:/Apps/cursor',
    manifestKept: true,
    verifyFailed: false,
  });
  const text = lines.join('\n');

  assert.match(text, /卸载未完成/);
  assert.match(text, /build-manifest\.json/);
  assert.match(text, /重试/i);
  assert.match(text, /uninstall/i);
});

test('buildUninstallFailureLines highlights verify failure and optional doctor check', () => {
  const lines = buildUninstallFailureLines({
    message: 'post-uninstall verification failed',
    installDir: 'D:/Apps/cursor',
    manifestKept: true,
    verifyFailed: true,
  });
  const text = lines.join('\n');

  assert.match(text, /卸后验收未通过/);
  assert.match(text, /doctor\.ps1 -PostUninstall/);
});

test('printUninstallGuidance writes joined lines via provided logger', () => {
  const logged = [];
  printUninstallGuidance(['line-a', 'line-b'], {
    log: (line) => logged.push(line),
  });

  assert.deepEqual(logged, ['line-a', 'line-b']);
});
