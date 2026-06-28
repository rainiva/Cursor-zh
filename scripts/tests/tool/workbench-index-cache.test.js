const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');

const { createWorkbenchIndexCacheModule } = require('../../tool/workbench-index-cache.js');

function sha256OfFile(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function createIndexModule(cacheDir, patchLabel) {
  return createWorkbenchIndexCacheModule({
    cacheDir,
    sha256OfFile,
    createWorkbenchIndex(sourceText) {
      return {
        sourceText,
        quotedLiterals: new Set(),
        isAuthoritative: true,
      };
    },
    enrichWorkbenchIndexWithEmbeddedPatches(index) {
      return {
        ...index,
        applicableEmbeddedPatches: {
          preStatic: [],
          postStatic: [{ to: patchLabel }],
        },
      };
    },
    fs,
  });
}

test('loadOrBuildWorkbenchIndex invalidates disk cache when variantKey changes', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-workbench-index-cache-'));
  try {
    const cacheDir = path.join(tempDir, 'cache');
    const sourcePath = path.join(tempDir, 'workbench.js');
    const sourceText = 'const label = "Marketplace";';
    fs.writeFileSync(sourcePath, sourceText, 'utf8');

    const oldIndex = createIndexModule(cacheDir, 'old-raw-try').loadOrBuildWorkbenchIndex(
      sourcePath,
      sourceText,
      '3.9.8',
      { variantKey: 'old-raw-try' }
    );
    assert.equal(oldIndex.applicableEmbeddedPatches.postStatic[0].to, 'old-raw-try');

    const newIndex = createIndexModule(cacheDir, 'new-iife').loadOrBuildWorkbenchIndex(
      sourcePath,
      sourceText,
      '3.9.8',
      { variantKey: 'new-iife' }
    );
    assert.equal(newIndex.applicableEmbeddedPatches.postStatic[0].to, 'new-iife');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
