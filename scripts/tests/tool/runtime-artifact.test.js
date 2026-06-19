const test = require('node:test');
const assert = require('node:assert/strict');

const { parseInstalledRuntimeArtifact } = require('../../tool/runtime-artifact.js');

test('parseInstalledRuntimeArtifact parses runtime header with product tip mappings block', () => {
  const bundleText = `/* Cursor ZH generated runtime: do not edit generated file directly. */
(function(){
  const translationMetadata = {"runtimeConfig":{"mode":"compatibility"}};
  const translationMappings = [{"source":"Sign In","target":"登录"}];
  const productTipMappings = [];
})();
original bundle text`;

  const artifact = parseInstalledRuntimeArtifact(bundleText);

  assert.ok(artifact);
  assert.equal(artifact.runtimeStrategy.mode, 'compatibility');
  assert.equal(artifact.runtimeMappings.length, 1);
  assert.equal(artifact.translatedSourceText, 'original bundle text');
  assert.ok(artifact.runtimeStrategy.runtimeHeaderChars > 0);
});

test('parseInstalledRuntimeArtifact parses runtime mappings containing bracket-like string content', () => {
  const bundleText = `/* Cursor ZH generated runtime: do not edit generated file directly. */
(function(){
  const translationMetadata = {"runtimeConfig":{"mode":"compatibility"}};
  const translationMappings = [{"source":"View all (","target":"查看全部 ("},{"source":"foo]; bar","target":"bar"}];
  const productTipMappings = [];
})();
tail`;

  const artifact = parseInstalledRuntimeArtifact(bundleText);

  assert.ok(artifact);
  assert.equal(artifact.runtimeMappings.length, 2);
  assert.equal(artifact.runtimeStrategy.mode, 'compatibility');
});
