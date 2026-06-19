const fs = require('fs');
const path = require('path');
const { applyStaticSourceTranslationsDetailed } = require('../lib/patcher/contracts');
const { mergeMappings } = require('../lib/mapping/merge');

const glassPath = 'D:/Apps/cursor/resources/app/out/vs/workbench/workbench.glass.main.js';
const root = path.join(__dirname, '..', '..', 'translations');
const base = JSON.parse(fs.readFileSync(path.join(root, 'base/workbench.mappings.json'), 'utf8'));
const overlay = JSON.parse(fs.readFileSync(path.join(root, 'overlay/workbench.overlay.json'), 'utf8'));
const common = JSON.parse(fs.readFileSync(path.join(root, 'overlay/cursor-win.common.json'), 'utf8'));
const dynamic = JSON.parse(fs.readFileSync(path.join(root, 'overlay/cursor-win.dynamic.json'), 'utf8'));
const mappings = mergeMappings(
  mergeMappings(mergeMappings(base, overlay), common),
  dynamic
);
const source = fs.readFileSync(glassPath, 'utf8');
const result = applyStaticSourceTranslationsDetailed(source, mappings);

for (const needle of [
  'Send follow-up',
  'Send follow-up with subagent',
  'Continue chatting in Cursor',
  'Drop here to attach...',
]) {
  console.log(
    needle,
    'source',
    source.split(needle).length - 1,
    'translated',
    result.translatedSource.split(needle).length - 1
  );
}

console.log('product_tips_render_hook', result.contracts.product_tips_render_hook);
