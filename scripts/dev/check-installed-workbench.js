const fs = require('fs');

const translatedPath =
  process.argv[2] ||
  'D:/Apps/cursor/resources/app/out/vs/workbench/workbench.desktop.main_translated.js';

if (!fs.existsSync(translatedPath)) {
  console.log('missing translated workbench:', translatedPath);
  process.exit(1);
}

const source = fs.readFileSync(translatedPath, 'utf8');
console.log('bytes', source.length);
console.log('has runtime header', source.includes('Cursor ZH generated runtime'));

function countQuoted(text) {
  return (source.match(text) || []).length;
}

const pairs = [
  ['File', '文件'],
  ['Edit', '编辑'],
  ['View', '视图'],
  ['Help', '帮助'],
  ['Fork Chat', '分叉对话'],
  ['Pin', null],
  ['Rename', null],
];

for (const [en, zh] of pairs) {
  const enCount = countQuoted(new RegExp(`['"]${en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`, 'g'));
  const zhCount = zh
    ? countQuoted(new RegExp(`['"]${zh.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`, 'g'))
    : 0;
  console.log(en, { enQuoted: enCount, zhQuoted: zhCount });
}

const originalPath = translatedPath.replace('_translated', '');
if (fs.existsSync(originalPath)) {
  const original = fs.readFileSync(originalPath, 'utf8');
  console.log('original vs translated same', original === source.slice(source.indexOf('/* Cursor ZH') === -1 ? 0 : source.indexOf('(function'))); 
}
