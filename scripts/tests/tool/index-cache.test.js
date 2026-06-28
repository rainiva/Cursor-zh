const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { createWorkbenchIndexCacheModule } = require('../../tool/workbench-index-cache.js');
const { createWorkbenchIndex } = require('../../lib/patcher/workbench-index.js');

function withTempDir(run) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-index-cache-'));
  try {
    return run(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test('loadOrBuildWorkbenchIndex returns cache hit without rebuilding index', () => {
  withTempDir((cacheDir) => {
    let buildCalls = 0;
    const sourcePath = path.join(cacheDir, 'workbench.js');
    const sourceText = 'const label = "General";';
    fs.writeFileSync(sourcePath, sourceText, 'utf8');

    const { loadOrBuildWorkbenchIndex } = createWorkbenchIndexCacheModule({
      cacheDir,
      sha256OfFile: () => 'fixed-hash',
      createWorkbenchIndex: (text) => {
        buildCalls += 1;
        return createWorkbenchIndex(text);
      },
      fs,
    });

    const first = loadOrBuildWorkbenchIndex(sourcePath, sourceText);
    const second = loadOrBuildWorkbenchIndex(sourcePath, sourceText);

    assert.equal(buildCalls, 1);
    assert.equal(first.hasQuotedLiteral('General'), true);
    assert.equal(second.hasQuotedLiteral('General'), true);
    assert.equal(second.sourceText, sourceText);
  });
});

test('loadOrBuildWorkbenchIndex misses cache when source hash changes', () => {
  withTempDir((cacheDir) => {
    let buildCalls = 0;
    let hashCalls = 0;
    const sourcePath = path.join(cacheDir, 'workbench.js');
    fs.writeFileSync(sourcePath, 'const label = "General";', 'utf8');

    const { loadOrBuildWorkbenchIndex } = createWorkbenchIndexCacheModule({
      cacheDir,
      sha256OfFile: () => {
        hashCalls += 1;
        return hashCalls === 1 ? 'hash-a' : 'hash-b';
      },
      createWorkbenchIndex: (text) => {
        buildCalls += 1;
        return createWorkbenchIndex(text);
      },
      fs,
    });

    loadOrBuildWorkbenchIndex(sourcePath, 'const label = "General";');
    loadOrBuildWorkbenchIndex(sourcePath, 'const label = "Settings";');

    assert.equal(buildCalls, 2);
  });
});
