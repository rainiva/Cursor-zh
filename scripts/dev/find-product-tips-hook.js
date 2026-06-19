const fs = require('fs');

const wb = 'D:/Apps/cursor/resources/app/out/vs/workbench/workbench.desktop.main.js';
const s = fs.readFileSync(wb, 'utf8');

const patterns = [
  {
    id: 'legacy',
    from: 'const Re=z?U?"":mkE:U?"":ne?.text??"",Be=',
    to: 'const Re=z?U?"":mkE:U?"":window.__cursorZhTranslateProductTipText?window.__cursorZhTranslateProductTipText(ne?.text??""):ne?.text??"",Be=',
  },
  {
    id: 'glass-v2',
    from: 'const Ue=j?W?"":QoI:W?"":le?.text??"",Pe=j?W?"tip-dismissed-exiting":"tip-dismissed"',
    to: 'const Ue=j?W?"":QoI:W?"":window.__cursorZhTranslateProductTipText?window.__cursorZhTranslateProductTipText(le?.text??""):le?.text??"",Pe=j?W?"tip-dismissed-exiting":"tip-dismissed"',
  },
];

for (const p of patterns) {
  console.log(p.id, 'from', s.split(p.from).length - 1);
}

const idx = s.indexOf('le?.text??""');
console.log('context', s.slice(idx - 80, idx + 120));
