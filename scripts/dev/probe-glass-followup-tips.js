const fs = require('fs');

const glassPath = 'D:/Apps/cursor/resources/app/out/vs/workbench/workbench.glass.main.js';
const desktopPath = 'D:/Apps/cursor/resources/app/out/vs/workbench/workbench.desktop.main.js';

const productTipFrom =
  'W?"":ee?.text??"";let Fe;n[79]!==Re||n[80]!==o?(Fe=e$P(XUP(Re,o),Hs),n[79]=Re,n[80]=o,n[81]=Fe):Fe=n[81];const ze=Fe,Be=K?W?"tip-dismissed-exiting":"tip-dismissed"';

for (const [label, filePath] of [
  ['glass', glassPath],
  ['desktop', desktopPath],
]) {
  if (!fs.existsSync(filePath)) {
    console.log(`${label}: missing`);
    continue;
  }
  const source = fs.readFileSync(filePath, 'utf8');
  console.log(`\n=== ${label} ===`);
  for (const needle of [
    'Send follow-up with subagent',
    'Continue chatting in Cursor',
    'Send follow-up',
    'Add a follow-up',
    'Drop here to attach...',
  ]) {
    console.log(`${needle}: ${source.split(needle).length - 1}`);
  }
  console.log(`productTipFrom: ${source.split(productTipFrom).length - 1}`);
}
