'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  inspectProcess,
  getCurrentProcessStartedAt,
  parseCimDateToEpochMs,
} = require('../../tool/process-inspect.js');

test('inspectProcess returns exists false when PowerShell reports no process', () => {
  const result = inspectProcess(4242, {
    execSync: () => '',
  });
  assert.deepEqual(result, { exists: false });
});

test('inspectProcess returns exists and startedAt from CIM CreationDate', () => {
  const result = inspectProcess(4242, {
    execSync: () => JSON.stringify({
      ProcessId: 4242,
      CreationDate: '20240101120000.000000-000',
    }),
  });
  assert.equal(result.exists, true);
  assert.equal(result.startedAt, parseCimDateToEpochMs('20240101120000.000000-000'));
});

test('getCurrentProcessStartedAt inspects the current pid', () => {
  const expected = parseCimDateToEpochMs('20240101120000.000000-000');
  const value = getCurrentProcessStartedAt({
    pid: 999,
    execSync: (cmd) => {
      assert.match(cmd, /ProcessId=999/);
      return JSON.stringify({ ProcessId: 999, CreationDate: '20240101120000.000000-000' });
    },
  });
  assert.equal(value, expected);
});

test('getCurrentProcessStartedAt returns null when CIM inspect fails', () => {
  const value = getCurrentProcessStartedAt({
    pid: 999,
    execSync: () => {
      throw new Error('CIM unavailable');
    },
  });
  assert.equal(value, null);
});

test('getCurrentProcessStartedAt returns null when process is missing', () => {
  const value = getCurrentProcessStartedAt({
    pid: 999,
    execSync: () => '',
  });
  assert.equal(value, null);
});
