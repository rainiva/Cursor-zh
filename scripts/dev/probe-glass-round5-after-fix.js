const fs = require('fs');
const path = require('path');
const { applyStaticSourceTranslations } = require('../lib/patcher/static');
const { readJsonIfExists } = require('../tool/io');
const { mergeMappings } = require('../lib/mapping/merge');
const { createToolPaths } = require('../tool/paths');

const toolPaths = createToolPaths(path.join(__dirname, '..', '..'));
const glassPath =
  process.env.CURSOR_GLASS_WORKBENCH_PATH ||
  'D:/Apps/cursor/resources/app/out/vs/workbench/workbench.glass.main.js';

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

const source = fs.readFileSync(glassPath, 'utf8');
const translated = applyStaticSourceTranslations(source, merged);

const needles = [
  'label:"Fork"',
  'label:"Export"',
  'z5C="Search Settings"',
  'children:"Find in Changes"',
  'placeholder:"Open any file, URL, ..."',
  'children:"Canvas"',
  'children:"Open Tabs"',
  'label:"Unified"',
  'subtitle:"Balanced quality and speed, recommended for most tasks"',
  'uncommitted:"Uncommitted"',
  '`No ${e} Changes`',
  'sectionHeaderLabel:`On ${',
];

for (const needle of needles) {
  console.log(
    needle,
    'source',
    source.split(needle).length - 1,
    'translated',
    translated.split(needle).length - 1
  );
}

const zhNeedles = [
  'label:"分叉"',
  'label:"导出"',
  'z5C="搜索设置"',
  'children:"在更改中查找"',
  'placeholder:"打开任意文件、URL..."',
  'children:"画布"',
  'children:"打开的标签页"',
  'label:"统一"',
  'subtitle:"质量与速度均衡，适合大多数任务"',
  'uncommitted:"未提交"',
  '`没有${e}的更改`',
  'sectionHeaderLabel:`在 ${',
];

for (const needle of zhNeedles) {
  console.log('zh', needle, translated.split(needle).length - 1);
}
