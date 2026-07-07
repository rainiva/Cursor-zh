const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  safeUnlinkSync,
} = require('../../tool/uninstall-orchestrator.js');

// 辅助：创建假延迟函数（不等待）
const fakeDelayFn = () => {};

// 辅助：创建可控的 fakeFs
function makeFakeFs({ failCount = 0, errorCode = 'EBUSY' } = {}) {
  let callIndex = 0;
  const deletedPaths = [];

  return {
    existsSync: () => true,
    unlinkSync: (filePath) => {
      callIndex++;
      if (callIndex <= failCount) {
        const err = new Error(`${errorCode}: resource busy or locked, unlink '${filePath}'`);
        err.code = errorCode;
        throw err;
      }
      deletedPaths.push(filePath);
    },
    getDeletedPaths: () => deletedPaths,
    getCallCount: () => callIndex,
  };
}

// ─── Unit: safeUnlinkSync ────────────────────────────────────────────────────

test('safeUnlinkSync: 首次成功，不重试', () => {
  const fakeFs = makeFakeFs({ failCount: 0 });

  safeUnlinkSync('/fake/file.js', {
    maxRetries: 3,
    delayMs: 100,
    delayFn: fakeDelayFn,
    fs: fakeFs,
  });

  assert.equal(fakeFs.getCallCount(), 1, '应只调用一次 unlinkSync');
  assert.deepEqual(fakeFs.getDeletedPaths(), ['/fake/file.js']);
});

test('safeUnlinkSync: 首次 EBUSY，第二次成功 → 重试后成功', () => {
  const fakeFs = makeFakeFs({ failCount: 1, errorCode: 'EBUSY' });

  safeUnlinkSync('/fake/locked.js', {
    maxRetries: 3,
    delayMs: 100,
    delayFn: fakeDelayFn,
    fs: fakeFs,
  });

  assert.equal(fakeFs.getCallCount(), 2, '应调用两次 unlinkSync（首次失败 + 第二次成功）');
  assert.deepEqual(fakeFs.getDeletedPaths(), ['/fake/locked.js']);
});

test('safeUnlinkSync: 3 次都 EBUSY → 抛出最后一次错误', () => {
  const fakeFs = makeFakeFs({ failCount: 99, errorCode: 'EBUSY' });

  assert.throws(
    () => safeUnlinkSync('/fake/permanent-lock.js', {
      maxRetries: 3,
      delayMs: 100,
      delayFn: fakeDelayFn,
      fs: fakeFs,
    }),
    (err) => {
      assert.equal(err.code, 'EBUSY', '应抛出 EBUSY 错误');
      return true;
    }
  );

  assert.equal(fakeFs.getCallCount(), 3, '应恰好调用 3 次（maxRetries=3）');
});

test('safeUnlinkSync: EPERM 也会重试', () => {
  const fakeFs = makeFakeFs({ failCount: 2, errorCode: 'EPERM' });

  safeUnlinkSync('/fake/perm-locked.js', {
    maxRetries: 3,
    delayMs: 100,
    delayFn: fakeDelayFn,
    fs: fakeFs,
  });

  assert.equal(fakeFs.getCallCount(), 3, '应在第3次成功');
});

test('safeUnlinkSync: ENOENT → 静默跳过（不重试）', () => {
  const fakeFs = {
    existsSync: () => true,
    unlinkSync: () => {
      const err = new Error("ENOENT: no such file or directory, unlink '/fake/gone.js'");
      err.code = 'ENOENT';
      throw err;
    },
  };

  // 不应抛出
  safeUnlinkSync('/fake/gone.js', {
    maxRetries: 3,
    delayMs: 100,
    delayFn: fakeDelayFn,
    fs: fakeFs,
  });
});

test('safeUnlinkSync: 非锁定类错误（EACCES）→ 不重试，直接抛出', () => {
  const fakeFs = {
    existsSync: () => true,
    unlinkSync: () => {
      const err = new Error("EACCES: permission denied, unlink '/fake/denied.js'");
      err.code = 'EACCES';
      throw err;
    },
  };

  assert.throws(
    () => safeUnlinkSync('/fake/denied.js', {
      maxRetries: 3,
      delayMs: 100,
      delayFn: fakeDelayFn,
      fs: fakeFs,
    }),
    (err) => {
      assert.equal(err.code, 'EACCES');
      return true;
    }
  );
});

// ─── 真实文件系统验证 ───────────────────────────────────────────────────────

test('safeUnlinkSync: 真实文件删除成功', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-unlink-'));
  const tmpFile = path.join(tmpDir, 'test-file.txt');
  fs.writeFileSync(tmpFile, 'test', 'utf8');

  safeUnlinkSync(tmpFile, { delayFn: fakeDelayFn });

  assert.equal(fs.existsSync(tmpFile), false, '文件应已被删除');

  // 清理
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('safeUnlinkSync: 真实文件不存在 → 静默跳过', () => {
  const nonExistent = path.join(os.tmpdir(), 'cursor-zh-nonexistent-' + Date.now());

  // 不应抛出
  safeUnlinkSync(nonExistent, { delayFn: fakeDelayFn });
});

// ─── 阶段6集成：多文件部分失败 ──────────────────────────────────────────────

test('阶段6集成: 多个文件中部分 EBUSY → 重试后全部成功', () => {
  const fakeFs = {
    existsSync: () => true,
    _callCounts: {},
    unlinkSync: (filePath) => {
      if (!fakeFs._callCounts[filePath]) fakeFs._callCounts[filePath] = 0;
      fakeFs._callCounts[filePath]++;

      // file-b.js 前两次失败，第三次成功
      if (filePath === '/fake/file-b.js' && fakeFs._callCounts[filePath] <= 2) {
        const err = new Error("EBUSY: resource busy or locked");
        err.code = 'EBUSY';
        throw err;
      }
    },
  };

  const targets = ['/fake/file-a.js', '/fake/file-b.js', '/fake/file-c.js'];
  const errors = [];

  for (const filePath of targets) {
    if (filePath && fakeFs.existsSync(filePath)) {
      try {
        safeUnlinkSync(filePath, {
          maxRetries: 3,
          delayMs: 100,
          delayFn: fakeDelayFn,
          fs: fakeFs,
        });
      } catch (err) {
        errors.push({ filePath, error: err });
      }
    }
  }

  assert.equal(errors.length, 0, '所有文件应在重试后成功删除');
});

test('阶段6集成: 某文件持续 EBUSY → 错误正确传播', () => {
  const fakeFs = {
    existsSync: () => true,
    unlinkSync: (filePath) => {
      if (filePath === '/fake/stubborn.js') {
        const err = new Error("EBUSY: resource busy or locked");
        err.code = 'EBUSY';
        throw err;
      }
      // 其他文件正常删除
    },
  };

  const targets = ['/fake/ok.js', '/fake/stubborn.js', '/fake/another-ok.js'];
  const errors = [];

  for (const filePath of targets) {
    if (filePath && fakeFs.existsSync(filePath)) {
      try {
        safeUnlinkSync(filePath, {
          maxRetries: 3,
          delayMs: 100,
          delayFn: fakeDelayFn,
          fs: fakeFs,
        });
      } catch (err) {
        errors.push({ filePath, error: err });
      }
    }
  }

  assert.equal(errors.length, 1, '应有1个文件删除失败');
  assert.equal(errors[0].filePath, '/fake/stubborn.js');
  assert.equal(errors[0].error.code, 'EBUSY');
});
