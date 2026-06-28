const UNINSTALL_PHASE_COUNT = 9;

function buildUninstallPreflightLines({ installDir }) {
  return [
    '[卸载前请确认]',
    '  1. 请完全退出 Cursor（任务管理器确认无 Cursor.exe 进程）',
    `  2. 即将从以下目录移除汉化并恢复英文界面：${installDir}`,
    '  3. 本工具将自动执行：备份恢复 → 删除注入文件 → 清理 profile → 卸后验收（含 nls 哈希）',
    '  4. 仅当卸后验收通过后才清理 workspace 状态；失败时可重试 uninstall',
    '',
  ];
}

function buildUninstallPhaseLine(step, label) {
  return `[卸载 ${step}/${UNINSTALL_PHASE_COUNT}] ${label}`;
}

function buildUninstallSuccessLines({ installDir, backupDir }) {
  const lines = [
    '[卸载完成]',
    '  Cursor 已恢复为英文运行态（package.json 入口与 nls 已从备份恢复）',
    `  安装目录：${installDir}`,
  ];

  if (backupDir) {
    lines.push(`  备份仍保留于：${backupDir}`);
  } else {
    lines.push('  备份仍保留于：state/backups/（未删除）');
  }

  lines.push(
    '',
    '[下一步]',
    '  1. 直接启动 Cursor（官方快捷方式或 Cursor.exe）即可使用英文界面',
    '  2. 无需再跑 doctor；仅当怀疑仍有残留时，可选复检：',
    '     powershell -ExecutionPolicy Bypass -File .\\scripts\\doctor.ps1 -PostUninstall'
  );

  return lines;
}

function buildUninstallFailureLines({
  message,
  installDir,
  manifestKept = false,
  verifyFailed = false,
}) {
  const lines = [
    '[卸载未完成]',
    verifyFailed
      ? '  原因：卸后验收未通过（安装/profile 可能已部分恢复，但尚未确认完全干净）'
      : `  原因：${message}`,
    `  安装目录：${installDir}`,
  ];

  if (manifestKept) {
    lines.push('  workspace 状态已保留（state/build-manifest.json 仍存在），可修复问题后重试 uninstall');
  }

  lines.push(
    '',
    '[建议操作]',
    '  1. 查看上方报告或错误信息中的具体问题',
    `  2. 修复后重试：node scripts/cursor-zh-tool.js uninstall --install-dir "${installDir}"`,
    '  3. 仅检查当前状态（不修改文件）：powershell -ExecutionPolicy Bypass -File .\\scripts\\doctor.ps1 -PostUninstall'
  );

  return lines;
}

function printUninstallGuidance(lines, { log = console.log } = {}) {
  for (const line of lines) {
    log(line);
  }
}

module.exports = {
  UNINSTALL_PHASE_COUNT,
  buildUninstallPreflightLines,
  buildUninstallPhaseLine,
  buildUninstallSuccessLines,
  buildUninstallFailureLines,
  printUninstallGuidance,
};
