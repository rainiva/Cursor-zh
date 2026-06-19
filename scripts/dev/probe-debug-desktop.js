const fs = require('fs');
const { applyStaticSourceTranslations } = require('../lib/patcher/static');

const desktop = fs.readFileSync(
  'D:/Apps/cursor/resources/app/out/vs/workbench/workbench.desktop.main.js',
  'utf8'
);
const from = '),"Debug Mode"),"Whether additional debug information shall be generated."';
const to = '),"调试模式"),"是否应生成额外的调试信息。"';

console.log('desktop has from:', desktop.includes(from));
if (desktop.includes(from)) {
  const translated = applyStaticSourceTranslations(desktop, []);
  console.log('from remains:', translated.includes(from));
  console.log('to present:', translated.includes(to));
  const idx = desktop.indexOf('Whether additional debug');
  console.log('context:', desktop.slice(idx - 50, idx + 90));
}
