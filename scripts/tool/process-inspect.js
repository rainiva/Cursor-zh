'use strict';

const { execSync: defaultExecSync } = require('node:child_process');

function parseCimDateToEpochMs(value) {
  if (value == null) {
    return NaN;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  const str = String(value).trim();
  const dotNetMatch = str.match(/^\/Date\((\d+)([+-]\d+)?\)\/$/);
  if (dotNetMatch) {
    return Number(dotNetMatch[1]);
  }

  const cimMatch = str.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})\.(\d+)([+-]\d{3})?$/);
  if (cimMatch) {
    const iso = `${cimMatch[1]}-${cimMatch[2]}-${cimMatch[3]}T${cimMatch[4]}:${cimMatch[5]}:${cimMatch[6]}.${cimMatch[7].slice(0, 3)}Z`;
    const parsed = Date.parse(iso);
    return Number.isFinite(parsed) ? parsed : NaN;
  }

  const parsed = Date.parse(str);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function inspectProcess(pid, { execSync: execSyncRef = defaultExecSync } = {}) {
  const numericPid = Number(pid);
  if (!Number.isFinite(numericPid) || numericPid <= 0) {
    return { exists: false };
  }

  try {
    const script = [
      `$p = Get-CimInstance Win32_Process -Filter "ProcessId=${numericPid}" -ErrorAction SilentlyContinue;`,
      'if ($null -eq $p) { exit 0 };',
      '$p | Select-Object ProcessId, CreationDate | ConvertTo-Json -Compress',
    ].join(' ');
    const output = String(execSyncRef(
      `powershell -NoProfile -Command "${script.replace(/"/g, '\\"')}"`,
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    ) || '').trim();
    if (!output) {
      return { exists: false };
    }

    const parsed = JSON.parse(output);
    if (!parsed || !parsed.ProcessId) {
      return { exists: false };
    }

    const startedAt = parseCimDateToEpochMs(parsed.CreationDate);
    return {
      exists: true,
      startedAt: Number.isFinite(startedAt) ? startedAt : null,
    };
  } catch {
    return { exists: false };
  }
}

function getCurrentProcessStartedAt({
  pid = process.pid,
  execSync: execSyncRef = defaultExecSync,
} = {}) {
  const inspection = inspectProcess(pid, { execSync: execSyncRef });
  if (!inspection.exists || !Number.isFinite(inspection.startedAt)) {
    return Date.now();
  }
  return inspection.startedAt;
}

module.exports = {
  inspectProcess,
  getCurrentProcessStartedAt,
  parseCimDateToEpochMs,
};
