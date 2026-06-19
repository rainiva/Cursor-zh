const test = require('node:test');
const assert = require('node:assert/strict');

const { createCommandsModule } = require('../../tool/commands.js');

test('runStart clears extension cache before launching Cursor', () => {
  const events = [];
  let cacheClearCalls = 0;

  const { runStart } = createCommandsModule({
    fs: {
      existsSync: (filePath) => {
        events.push(['exists', filePath]);
        return true;
      },
    },
    clearCursorExtensionCache: () => {
      cacheClearCalls += 1;
      events.push(['clearCache']);
      return { removed: ['CachedProfilesData'], missing: [] };
    },
    childProcess: {
      spawn: (exePath, args, options) => {
        events.push(['spawn', exePath, args, options]);
        return { unref: () => {} };
      },
    },
  });

  runStart({
    paths: {
      cursorExePath: 'C:\\Cursor\\Cursor.exe',
      installDir: 'C:\\Cursor',
    },
  });

  assert.equal(cacheClearCalls, 1);
  assert.deepEqual(
    events.map((entry) => entry[0]),
    ['clearCache', 'exists', 'spawn']
  );
});
