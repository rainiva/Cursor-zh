const fs = require('fs');
const path = require('path');

const sourcePath = path.join(__dirname, '..', 'lib', 'runtime', 'text-translator-template.js');
const original = fs.readFileSync(sourcePath, 'utf8');

const start = original.indexOf('function buildRuntimeHeader');
const arrayStart = original.indexOf('return [', start);
const arrayEnd = original.indexOf('].join', arrayStart);
const arrayBody = original.slice(arrayStart + 'return '.length, arrayEnd + 1);
const arrayLines = arrayBody.split('\n');

function lineIndex(fileLineNumber) {
  return fileLineNumber - 12;
}

function extractSlice(fromLine, toLine) {
  return arrayLines.slice(lineIndex(fromLine), lineIndex(toLine) + 1).join('\n');
}

const templateDir = path.join(__dirname, '..', 'lib', 'runtime', 'template');
fs.mkdirSync(templateDir, { recursive: true });

const classCoreBody = extractSlice(287, 697);
const classInstallBody = extractSlice(698, 1074);

fs.writeFileSync(
  path.join(templateDir, 'class-core.js'),
  `function getClassCoreLines() {
  return [
${classCoreBody}
  ];
}

module.exports = { getClassCoreLines };
`
);

fs.writeFileSync(
  path.join(templateDir, 'class-install.js'),
  `function getClassInstallLines({ experimentalRuntimeToggleEnabled }) {
  return [
${classInstallBody}
  ];
}

module.exports = { getClassInstallLines };
`
);

const beforeCore = arrayLines.slice(1, lineIndex(287)).join('\n');
const afterInstall = arrayLines.slice(lineIndex(1074) + 1, -1).join('\n');

const header = original.slice(0, start);
const footer = original.slice(original.indexOf('module.exports', start));

const newBuildRuntimeHeader = `const { getClassCoreLines } = require('./template/class-core');
const { getClassInstallLines } = require('./template/class-install');

function buildRuntimeHeader({
  safeMetadata,
  generalRuntimeMappings,
  scopedProductTipMappings,
  experimentalRuntimeToggleEnabled,
  runtimeDiagnosticsEnabled,
}) {
  return [
${beforeCore}
    ...getClassCoreLines(),
    ...getClassInstallLines({ experimentalRuntimeToggleEnabled })${afterInstall ? `,\n${afterInstall}` : ''}
  ].join('\\n');
}
`;

fs.writeFileSync(sourcePath, header + newBuildRuntimeHeader + '\n' + footer);
console.log('split complete');
