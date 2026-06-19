const fs = require('fs');

const source = fs.readFileSync(
  'D:/Apps/cursor/resources/app/out/vs/workbench/workbench.desktop.main.js',
  'utf8'
);
const re = /Xe\("([^"]{3,80})"/g;
const hits = new Map();
let match;
while ((match = re.exec(source))) {
  const text = match[1];
  if (!/[A-Za-z]/.test(text)) {
    continue;
  }
  if (text.startsWith('http') || text.includes('cursor-settings') && !text.includes('>')) {
    continue;
  }
  hits.set(text, (hits.get(text) || 0) + 1);
}

const keywords =
  /Subagents|Web Search|Authentication|Voice Mode|PR Pref|Inline Editing|Queue|Usage Summary|Partial Accept|Cursor Account|Auto Save|Diff View|Line Numbers|Word Wrap|Copy Relative|Balanced quality|Agent Autocomplete|Run Mode|Browser Protection|MCP Tools|Legacy Terminal|Themed Diff|Submit Keywords|Commit Attribution|Branch Prefix|Ignored Files|Auto-Parse|Warning Notifications|System Tray|Completion Sound|Preferred PR|Manage your account|Show rotating tips|Allow Agent|Choose how Agents|Choose where PR|Wait indefinitely|Context-aware|Allow Tab to trigger|Suggest edits like|Glob patterns for files|Approvals & Execution|Hierarchical Cursor|Ignore Symlinks|Explore subagent|Auto-Accept Web Search|Auto Import for Python|Suggestions While Commenting|Whitespace-Only|Send after current message/;

[...hits.entries()]
  .filter(([text]) => keywords.test(text))
  .sort((a, b) => b[1] - a[1])
  .forEach(([text, count]) => console.log(count, JSON.stringify(text)));
