/** Fixed marketplace page chrome (tabs, search placeholders, primary actions). */
const CRITICAL_MARKETPLACE_UI_SHELL_TARGETS = [
  { originalText: 'Discover', changeText: '发现' },
  {
    originalText: 'Search Plugins, Skills, MCPs...',
    changeText: '搜索插件、技能、MCP...',
  },
  {
    originalText: 'Search skills, rules, subagents, MCPs, and hooks',
    changeText: '搜索技能、规则、子智能体、MCP 和钩子',
  },
  { originalText: 'Search plugins', changeText: '搜索插件' },
  { originalText: 'Enable', changeText: '启用', forceRuntime: true },
];

module.exports = {
  CRITICAL_MARKETPLACE_UI_SHELL_TARGETS,
};
