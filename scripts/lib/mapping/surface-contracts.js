/**
 * Registered UI contract surfaces for maintainability governance (P0).
 * Mapping-only entries are covered via critical-ui-coverage; static_patch entries
 * are evaluated in scripts/lib/patcher/contracts.js.
 */

const SURFACE_CONTRACTS = [
  {
    id: 'search_models',
    surface: 'model_picker',
    severity: 'error',
    kind: 'static_patch',
    required: true,
    fallbackMode: 'none',
    originalText: 'Search models',
    translatedText: '搜索模型',
  },
  {
    id: 'send_follow_up',
    surface: 'composer',
    severity: 'error',
    kind: 'static_patch',
    required: true,
    fallbackMode: 'none',
    originalText: 'Add a follow-up',
    translatedText: '添加追问',
  },
  {
    id: 'send_follow_up_glass',
    surface: 'composer',
    severity: 'error',
    kind: 'static_patch',
    required: true,
    fallbackMode: 'none',
    originalText: 'Send follow-up',
    translatedText: '继续追问',
  },
  {
    id: 'product_tips_render_hook',
    surface: 'product_tips',
    severity: 'warning',
    kind: 'static_patch_hook',
    required: true,
    fallbackMode: 'runtime',
  },
  {
    id: 'search_settings',
    surface: 'settings_search',
    severity: 'error',
    kind: 'mapping',
    originalText: 'Search Settings',
    changeText: '搜索设置',
  },
  {
    id: 'logout_confirm',
    surface: 'logout_dialog',
    severity: 'error',
    kind: 'mapping',
    originalText: 'Log out?',
    changeText: '退出登录？',
  },
  {
    id: 'extension_cache_dialog',
    surface: 'extension_cache_dialog',
    severity: 'error',
    kind: 'mapping',
    originalText: 'Extensions have been modified on disk. Please reload the window.',
    changeText: '扩展在磁盘上已被修改。请重新加载窗口。',
  },
  {
    id: 'reload_window_mnemonic',
    surface: 'extension_cache_dialog',
    severity: 'error',
    kind: 'mapping',
    originalText: '&&Reload Window',
    changeText: '重新加载窗口(&&R)',
  },
  {
    id: 'agent_shutdown_title',
    surface: 'agent_shutdown_dialog',
    severity: 'error',
    kind: 'mapping',
    originalText: 'Agent is still working',
    changeText: 'Agent 仍在运行',
  },
  {
    id: 'agents_shutdown_title',
    surface: 'agent_shutdown_dialog',
    severity: 'error',
    kind: 'mapping',
    originalText: '{0} agents are still working',
    changeText: '{0} 个 Agent 仍在运行',
  },
  {
    id: 'agent_shutdown_body_single',
    surface: 'agent_shutdown_dialog',
    severity: 'error',
    kind: 'mapping',
    originalText: 'Stopping now will cancel the current task.',
    changeText: '现在停止将取消当前任务。',
  },
  {
    id: 'agent_shutdown_body_plural',
    surface: 'agent_shutdown_dialog',
    severity: 'error',
    kind: 'mapping',
    originalText: 'Stopping now will cancel their current tasks.',
    changeText: '现在停止将取消它们当前的任务。',
  },
  {
    id: 'agent_shutdown_quit',
    surface: 'agent_shutdown_dialog',
    severity: 'error',
    kind: 'mapping',
    originalText: 'Quit Anyway',
    changeText: '仍要退出',
  },
  {
    id: 'plan_mode',
    surface: 'mode_menu',
    severity: 'error',
    kind: 'mapping',
    originalText: 'Plan Mode',
    changeText: '规划模式',
  },
  {
    id: 'ask_mode',
    surface: 'mode_menu',
    severity: 'error',
    kind: 'mapping',
    originalText: 'Ask Mode',
    changeText: '提问模式',
  },
  {
    id: 'multitask_mode',
    surface: 'mode_menu',
    severity: 'error',
    kind: 'mapping',
    originalText: 'Multitask Mode',
    changeText: '多任务模式',
  },
  {
    id: 'debug_mode',
    surface: 'mode_menu',
    severity: 'error',
    kind: 'mapping',
    originalText: 'Debug Mode',
    changeText: '调试模式',
  },
  {
    id: 'open_settings',
    surface: 'settings',
    severity: 'error',
    kind: 'mapping',
    originalText: 'Open Settings',
    changeText: '打开设置',
  },
  {
    id: 'reload_window',
    surface: 'window_menu',
    severity: 'error',
    kind: 'mapping',
    originalText: 'Reload Window',
    changeText: '重新加载窗口',
  },
  {
    id: 'new_tab',
    surface: 'editor_chrome',
    severity: 'error',
    kind: 'mapping',
    originalText: 'New Tab',
    changeText: '新建标签页',
  },
  {
    id: 'welcome_customize',
    surface: 'customize_onboarding',
    severity: 'warning',
    kind: 'mapping',
    originalText: 'Welcome to Customize',
    changeText: '欢迎使用自定义',
  },
  {
    id: 'check_for_updates',
    surface: 'app_menu',
    severity: 'warning',
    kind: 'mapping',
    originalText: 'Check for Updates...',
    changeText: '检查更新...',
  },
  {
    id: 'copy_as_markdown',
    surface: 'plan_context_menu',
    severity: 'warning',
    kind: 'mapping',
    originalText: 'Copy as Markdown',
    changeText: '复制为 Markdown',
  },
  {
    id: 'toggle_expand_agent',
    surface: 'glass_menu',
    severity: 'warning',
    kind: 'mapping',
    originalText: 'Toggle Expand Agent',
    changeText: '切换展开智能体',
  },
];

const STATIC_PATCH_SURFACE_CONTRACTS = SURFACE_CONTRACTS
  .filter((entry) => entry.kind === 'static_patch')
  .map(({ kind, severity, changeText, ...contract }) => contract);

function listSurfaceContractsBySeverity() {
  const grouped = { error: [], warning: [] };
  for (const contract of SURFACE_CONTRACTS) {
    grouped[contract.severity].push(contract);
  }
  return grouped;
}

/** Round-scoped UI target arrays superseded by harvest for new gaps (P0 legacy). */
const LEGACY_ROUND_UI_TARGET_GROUP_NAMES = [
  'CRITICAL_GLASS_ROUND20_UI_TARGETS',
  'CRITICAL_GLASS_ROUND21_UI_TARGETS',
  'CRITICAL_GLASS_ROUND22_UI_TARGETS',
  'CRITICAL_GLASS_ROUND23_UI_TARGETS',
  'CRITICAL_GLASS_ROUND24_UI_TARGETS',
  'CRITICAL_GLASS_ROUND25_UI_TARGETS',
  'CRITICAL_GLASS_ROUND26_UI_TARGETS',
  'CRITICAL_GLASS_ROUND27_UI_TARGETS',
  'CRITICAL_GLASS_ROUND28_UI_TARGETS',
  'CRITICAL_GLASS_ROUND29_UI_TARGETS',
];

module.exports = {
  SURFACE_CONTRACTS,
  STATIC_PATCH_SURFACE_CONTRACTS,
  LEGACY_ROUND_UI_TARGET_GROUP_NAMES,
  listSurfaceContractsBySeverity,
};
