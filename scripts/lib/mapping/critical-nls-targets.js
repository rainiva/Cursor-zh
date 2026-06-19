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
];

module.exports = {
  CRITICAL_NLS_TARGETS,
};
