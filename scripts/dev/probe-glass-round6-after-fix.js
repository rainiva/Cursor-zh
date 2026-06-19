const fs = require('fs');
const path = require('path');
const { applyStaticSourceTranslations } = require('../lib/patcher/static');

const glassPath = 'D:/Apps/cursor/resources/app/out/vs/workbench/workbench.glass.main.js';
const source = fs.readFileSync(glassPath, 'utf8');
const translated = applyStaticSourceTranslations(source, []);

const needles = [
  'Add agents, context, tools...',
  'Plan Mode',
  'Debug Mode',
  'Multitask Mode',
  'Ask Mode',
  'Generates a robust implementation plan',
  'Pinpoints the root cause of an issue',
  'Uses a fleet of subagents to parallelize',
  'Explores the codebase and answer questions',
  'Manage View',
  'function Onh(n){return`${n} Mode`}',
  'se(fxe,{title:"Tools"',
];

console.log('=== remaining English after static apply ===');
for (const needle of needles) {
  const count = translated.split(needle).length - 1;
  console.log(`${needle}: ${count}`);
}

const zhNeedles = [
  '添加智能体、上下文和工具...',
  '规划模式',
  '调试模式',
  '多任务模式',
  '提问模式',
  '在编写代码前生成可靠的实现计划',
  '管理视图',
  'se(fxe,{title:"工具"',
  'function Onh(n){return`${n}模式`}',
];
console.log('\n=== Chinese hits ===');
for (const needle of zhNeedles) {
  console.log(`${needle}: ${translated.split(needle).length - 1}`);
}
