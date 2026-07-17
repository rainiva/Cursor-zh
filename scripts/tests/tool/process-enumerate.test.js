'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { listBusyProcessesForCommit } = require('../../tool/process-enumerate.js');

test('listBusyProcessesForCommit fails closed when checkCursorRunning returns a warning', () => {
  const processes = listBusyProcessesForCommit('D:/Apps/Cursor', {
    checkCursorRunning: () => ({ running: false, warning: 'tasklist failed' }),
    listInstallProcesses: () => [],
  });
  assert.equal(processes.length, 1);
  assert.equal(processes[0].name, 'Cursor.exe');
  assert.equal(processes[0].pathUnavailable, true);
});

test('listBusyProcessesForCommit includes install-scoped updater processes', () => {
  const processes = listBusyProcessesForCommit('D:/Apps/Cursor', {
    checkCursorRunning: () => ({ running: false }),
    listInstallProcesses: () => ([
      {
        name: 'CursorUpdate.exe',
        pid: 77,
        executablePath: 'D:/Apps/Cursor/tools/CursorUpdate.exe',
      },
      {
        name: 'chrome.exe',
        pid: 88,
        executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
      },
    ]),
  });
  assert.equal(processes.length, 1);
  assert.equal(processes[0].name, 'CursorUpdate.exe');
});
