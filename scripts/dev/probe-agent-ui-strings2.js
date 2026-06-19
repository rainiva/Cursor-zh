const fs = require('fs');
const { sourceHasQuotedLiteral } = require('../lib/patcher/runtime-selector.js');
const { createWorkbenchIndex } = require('../lib/patcher/workbench-index.js');

const source = fs.readFileSync(
  'D:/Apps/cursor/resources/app/out/vs/workbench/workbench.desktop.main.js',
  'utf8'
);
const index = createWorkbenchIndex(source);

function findQuotedContaining(substr) {
  const results = [];
  const re = /(["'`])((?:\\.|(?!\1).)*)\1/g;
  let match;
  while ((match = re.exec(source)) && results.length < 30) {
    if (match[2].includes(substr)) {
      results.push(match[2]);
    }
  }
  return results;
}

for (const substr of ['Queued', 'to Send', 'Created', 'Waiting for', 'New Agent']) {
  console.log('\n===', substr, '===');
  for (const hit of findQuotedContaining(substr)) {
    if (hit.length < 120) {
      console.log(JSON.stringify(hit));
    }
  }
}

const checks = [
  ['Run in Cloud', '在云端运行'],
  ['Run in background', '在后台运行'],
  ['Agent is waiting for a command to finish.', 'Agent 正在等待命令完成。'],
  ['Agent is waiting for commands to finish.', 'Agent 正在等待多条命令完成。'],
  ['Created snapshot', '已创建快照'],
  [' Queued', ' 个排队'],
  ['Thought', '思考'],
  ['Split Right', '向右拆分'],
  ['Split Down', '向下拆分'],
  ['Plan New Idea', '规划新想法'],
  ['Start Multitasking', '开始多任务处理'],
];

for (const [text] of checks) {
  console.log('hasQuoted', text, sourceHasQuotedLiteral(source, text, index));
}
