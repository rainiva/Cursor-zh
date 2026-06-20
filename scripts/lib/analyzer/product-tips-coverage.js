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
    'Use /create-hook to control and extend the agent loop with custom scripts',
    'Hooks let you control and extend the agent loop - use /create-hook to get started',
    'Use /in-cloud for cloud subagents',
    'Drag and drop agent chats to split your view into tiled panes',
    'Select Composer in your model picker for a great balance of intelligence and cost',
    'Use /debug to solve bugs that are hard to reproduce or understand',
    'Use /bisect to find the exact commit that introduced a certain bug',
    'Use /create-subagent to set up specialized agents that Cursor can use to parallelize work',
    'Create a multi-root workspace so Cursor can work across many repos at once',
    'Use ctrl + D to split your view into tiled panes',
    'Use /multi-model-review to get an adversarial code review from several models',
    'After long sessions, use /split-to-prs to turn your work into small, reviewable PRs',
    'Skills extend Cursor with specialized knowledge. Use /create-skill to get started',
    'Use /create-skill to customize Cursor for your workflows',
    'Use MCPs to give Cursor access to tools and data. Configure MCPs in your Cursor Settings',
    'Debug Mode reproduces and solves hard bugs. Use shift+tab to enable',
    'Ask Cursor to find a prior conversation, or summarize across conversations',
    'Plugins give your agents important context',
    'Hooks let you run custom scripts at specific points during the agent\'s execution to modify behavior, enforce policies, or add custom logging.',
    'Agent skills help you customize Cursor for your workflows - use /create-skill to get started',
    'Use @browser to inspect page elements, view console logs, and analyze network traffic',
    'Voice mode lets you dictate better prompts for your agents',
    'Use /model to pick the best model for your task and select Composer for a great balance of cost vs. capability',
    'Use automations to save time on repetitive tasks with always-on agents',
    'Tell Cursor to use subagents to break down tasks, do work in parallel, and preserve context',
    'Use /automate to create Cursor Automations without leaving your agent chat',
    'Use /babysit to triage PR comments, fix CI failures, and clear conflicts',
    'Use /ask to research your codebase before starting code changes',
    'Use /simplify to have Cursor review all changed files for code quality and efficiency',
    'Configure MCPs in your Cursor Settings to give agents access to tools and data',
    'Cursor can respond with interactive visualizations alongside text - use /canvas to get started',
    'Use /plan to improve agent execution with Plan Mode',
    'Use /loop to run a prompt on a schedule',
    'Debug Mode reproduces and solves your most difficult bugs - hit shift+tab twice to get started',
    'Use /multitask so Cursor can work on your queued messages in parallel',
    'Plugins help you customize Cursor for your workflows - use /add-plugin to get started',
    'Use /review to have Cursor find bugs, regressions, security issues, and missing tests',
    'Plan Mode improves agent outcomes and accuracy - hit shift+tab to get started',
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
