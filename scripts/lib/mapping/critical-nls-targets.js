/** NLS notification strings that must survive apply → nls.messages.json translation. */
const CRITICAL_NLS_TARGETS = [
  {
    originalText: 'Extensions have been modified on disk. Please reload the window.',
    changeText: '扩展在磁盘上已被修改。请重新加载窗口。',
    searchType: 'exact',
  },
  {
    originalText: '&&Reload Window',
    changeText: '重新加载窗口(&&R)',
    searchType: 'exact',
  },
  {
    originalText: 'Agent is still working',
    changeText: 'Agent 仍在运行',
    searchType: 'exact',
  },
  {
    originalText: '{0} agents are still working',
    changeText: '{0} 个 Agent 仍在运行',
    searchType: 'exact',
  },
  {
    originalText: 'Stopping now will cancel the current task.',
    changeText: '现在停止将取消当前任务。',
    searchType: 'exact',
  },
  {
    originalText: 'Stopping now will cancel their current tasks.',
    changeText: '现在停止将取消它们当前的任务。',
    searchType: 'exact',
  },
  {
    originalText: 'Quit Anyway',
    changeText: '仍要退出',
    searchType: 'exact',
  },
];

module.exports = {
  CRITICAL_NLS_TARGETS,
};
