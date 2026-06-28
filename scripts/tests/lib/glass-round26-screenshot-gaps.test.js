const test = require('node:test');
const assert = require('node:assert/strict');

const { applyStaticSourceTranslations } = require('../../lib/patcher/static.js');
const { CRITICAL_GLASS_ROUND26_UI_TARGETS } = require('../../lib/mapping/critical-ui-targets.js');

const CUSTOMIZE_WELCOME_OBJECT =
  'b$m={title:"Welcome to Customize",body:"Manage plugins, MCPs, skills, rules, commands, and hooks in one place."}';

test('round 26 defines customize welcome and referral banner targets', () => {
  const originals = CRITICAL_GLASS_ROUND26_UI_TARGETS.map((entry) => entry.originalText);
  assert.ok(originals.includes('Welcome to Customize'));
  assert.ok(
    originals.includes(
      'Manage plugins, MCPs, skills, rules, commands, and hooks in one place.'
    )
  );
  assert.ok(originals.includes('Refer friends, earn up to $250'));
});

test('static translation applies customize welcome object before partial literal replacement', () => {
  const translated = applyStaticSourceTranslations(
    CUSTOMIZE_WELCOME_OBJECT,
    [{ searchType: 'exact', originalText: 'Customize', changeText: '自定义' }]
  );

  assert.match(translated, /title:"欢迎使用自定义"/);
  assert.match(
    translated,
    /body:"在一处管理插件、MCP、技能、规则、命令和钩子。"/
  );
  assert.doesNotMatch(translated, /Welcome to Customize/);
});

test('static translation applies refer friends earn up to $250 banner text', () => {
  const translated = applyStaticSourceTranslations(
    'function WLw(n){return"Refer friends, earn up to $250"}',
    []
  );

  assert.match(translated, /推荐好友，最高赚取 \$250/);
  assert.doesNotMatch(translated, /Refer friends, earn up to \$250/);
});

test('static translation applies automations hub stat labels from auxiliary chunk snippet', () => {
  const translated = applyStaticSourceTranslations(
    [
      'children:"Total Automations"})]}),',
      'children:["Run History"," ",',
      ':g?"No Results Found":"No Automations Yet"}),',
      'children:"Run agents on a schedule or automatically in response to events. Billed at plan rates."}',
      'children:[l6e(Xn,{name:"add"}),"New Automation"]',
    ].join('\n'),
    []
  );

  assert.match(translated, /children:"自动化总数"/);
  assert.match(translated, /children:\["运行历史"/);
  assert.match(translated, /:g\?"未找到结果":"暂无自动化"/);
  assert.match(translated, /按计划运行智能体，或在事件触发时自动运行。按套餐标准计费。/);
  assert.match(translated, /"新建自动化"/);
  assert.equal(translated.includes('Total Automations'), false);
  assert.equal(translated.includes('Run History'), false);
});
