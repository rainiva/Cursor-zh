const fs = require('fs');
const { readJsonIfExists } = require('../tool/io.js');
const { createToolPaths } = require('../tool/paths.js');
const { mergeMappings } = require('../cursor-zh-lib.js');

const source = fs.readFileSync(
  'D:/Apps/cursor/resources/app/out/vs/workbench/workbench.desktop.main.js',
  'utf8'
);
const toolPaths = createToolPaths(require('path').join(__dirname, '../..'));
const merged = mergeMappings(
  mergeMappings(
    mergeMappings(
      readJsonIfExists(toolPaths.baseMappingPath, []),
      readJsonIfExists(toolPaths.overlayMappingPath, [])
    ),
    readJsonIfExists(toolPaths.cursorWinCommonPath, [])
  ),
  readJsonIfExists(toolPaths.dynamicMappingPath, [])
);
const lookup = new Map(merged.map((e) => [e.originalText, e]));

const mappedDescs = merged
  .filter((e) => typeof e.originalText === 'string' && e.originalText.length > 30)
  .slice(0, 200);

let mismatch = 0;
for (const entry of mappedDescs) {
  const exact = source.includes(`"${entry.originalText}"`);
  const withPeriod = source.includes(`"${entry.originalText}."`);
  const withPeriodOnly = !exact && withPeriod;
  if (withPeriodOnly) {
    mismatch += 1;
    console.log('PERIOD', entry.originalText);
  }
}
console.log('period mismatches in sample', mismatch);

const screenshotDescs = [
  'Show rotating tips on the empty screen',
  'Allow Agent to search the web for relevant information',
  'Manage your account and billing',
  'Adjust the default behavior of sending a message while Agent is running',
  'When to show the usage summary at the bottom of the chat pane',
  'Contextual suggestions while prompting Agent',
  'Choose how Agents run tools like command execution, MCP, and file writes.',
  'Use themed background colors for inline code diffs',
  'Wait indefinitely to authenticate when prompted. When off, skip authentication prompts after 30 seconds.',
  'Balanced quality and speed, recommended for most tasks',
  'Show system notifications when Agent completes or needs attention',
  'Show warning-level in-app toasts',
  'Show Cursor in system tray',
  'Play a sound when Agent finishes responding',
  'Your code data will not be trained on or used to improve the product. Code may be stored to provide features such as Background Agent.',
];

for (const text of screenshotDescs) {
  const variants = [text, `${text}.`, text.replace('prompting', 'promoting')];
  const found = variants.find((variant) => source.includes(`"${variant}"`));
  console.log(
    text.slice(0, 55),
    'found',
    found ? JSON.stringify(found) : 'NO',
    'mapped',
    lookup.has(text)
  );
}
