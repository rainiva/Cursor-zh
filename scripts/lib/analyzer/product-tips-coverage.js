const { translateTextWithMappings } = require('../engine/translator');
const { productTipScopedMappings } = require('../shared/product-tip-scope');

function productTipsCoverageTargets() {
  return [
    'Use /canvas to get interactive visualizations like dashboards from Cursor',
    'Cursor can respond with interactive visualizations alongside text. Use /canvas to get started',
    'Use /shell to run commands in the terminal',
    'Voice mode lets you dictate better prompts. Click or hold ctrl+M to enable',
    'Composer offers a great balance of intelligence and cost. Try it out from the model picker',
    'Use /model to pick the best model for your task. Composer offers a great balance for cost vs. capability',
    'Ask mode uses read-only agents to research your codebase. Use shift+tab to enable',
    'Use /loop to run a prompt on a schedule or keep a local agent running continuously',
    'Plugins help you customize Cursor for your workflows. Use /add-plugin to get started',
    'Use /add-plugin to install a plugin from the Cursor Marketplace',
    'Use cloud agents for better parallelization and durable execution. Go to cursor.com/agents',
    'Plan Mode improves agent outcomes and accuracy. Use shift+tab to enable',
    'Build a plan before starting code to improve agent execution. Use /plan to get started',
    'Use /multitask to run subagents to parallelize your requests instead of queuing them',
    'Use /create-rule to control agent behavior through system-level instructions',
    'Use /in-cloud for cloud subagents',
    'Drag and drop agent chats to split your view into tiled panes',
  ];
}

function analyzeProductTipsCoverage({ mappings = [], targets = [] }) {
  const scopedMappings = productTipScopedMappings(mappings);
  const mappedTips = [];
  const missingTips = [];

  for (const sampleText of targets) {
    const translated = translateTextWithMappings(sampleText, scopedMappings, {
      scopeMatched: true,
      scopeText: sampleText,
    });
    if (translated === sampleText) {
      missingTips.push(sampleText);
    } else {
      mappedTips.push(sampleText);
    }
  }

  return {
    totalTipCount: targets.length,
    mappedTipCount: mappedTips.length,
    missingTips,
  };
}

module.exports = {
  productTipsCoverageTargets,
  analyzeProductTipsCoverage,
};
