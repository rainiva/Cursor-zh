'use strict';

const { execSync: defaultExecSync } = require('node:child_process');

const { isBusyProcess } = require('./commit-preflight.js');
const { checkCursorRunning } = require('./uninstall-orchestrator.js');

function normalizeProcessRows(output) {
  const trimmed = String(output || '').trim();
  if (!trimmed) {
    return [];
  }

  let parsed;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return [];
  }

  const rows = Array.isArray(parsed) ? parsed : [parsed];
  return rows
    .filter((row) => row && row.pid != null)
    .map((row) => ({
      pid: Number(row.pid),
      name: row.name || row.Name || '',
      executablePath: row.executablePath || row.ExecutablePath || null,
      commandLine: row.commandLine || row.CommandLine || null,
    }));
}

function listInstallProcesses({ execSync: execSyncRef = defaultExecSync } = {}) {
  try {
    const script = [
      'Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |',
      'Where-Object { $_.Name -match "(?i)(cursor|update|squirrel)" } |',
      'Select-Object @{N="pid";E={$_.ProcessId}}, @{N="name";E={$_.Name}},',
      '@{N="executablePath";E={$_.ExecutablePath}}, @{N="commandLine";E={$_.CommandLine}} |',
      'ConvertTo-Json -Compress',
    ].join(' ');
    const output = execSyncRef(
      `powershell -NoProfile -Command "${script.replace(/"/g, '\\"')}"`,
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    );
    return normalizeProcessRows(output);
  } catch {
    return [];
  }
}

function listBusyProcessesForCommit(
  installDir,
  {
    checkCursorRunning: checkCursorRunningRef = checkCursorRunning,
    listInstallProcesses: listInstallProcessesRef = listInstallProcesses,
  } = {},
) {
  const processes = [];
  const cursorProcess = checkCursorRunningRef();

  if (cursorProcess.running) {
    processes.push({ name: 'Cursor.exe' });
  } else if (cursorProcess.warning) {
    processes.push({ name: 'Cursor.exe', pathUnavailable: true });
  }

  for (const entry of listInstallProcessesRef()) {
    if (isBusyProcess(entry, installDir)) {
      const alreadyListed = processes.some(
        (existing) => Number(existing.pid) === Number(entry.pid)
          && String(existing.name).toLowerCase() === String(entry.name).toLowerCase(),
      );
      if (!alreadyListed) {
        processes.push(entry);
      }
    }
  }

  return processes;
}

module.exports = {
  listInstallProcesses,
  listBusyProcessesForCommit,
};
