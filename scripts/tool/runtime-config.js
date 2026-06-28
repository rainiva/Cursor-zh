const path = require('path');

const {
  getL3RuntimeScopeSelectors,
  countL3Surfaces,
} = require('../lib/mapping/surfaces.js');

const workspaceRoot = path.resolve(__dirname, '../..');

function createRuntimeConfigModule({ normalizeRuntimeMode }) {
  function buildRuntimeConfig(runtimeMode = 'performance') {
    const normalizedRuntimeMode = normalizeRuntimeMode(runtimeMode);
    const baseObserveScopeSelectors = [
      '[class*="settings"]',
      '[class*="marketplace"]',
      '[class*="plugin"]',
      '[class*="skill"]',
      '[class*="subagent"]',
      '[class*="mcp"]',
      '[class*="onboarding"]',
      '[class*="empty-state"]',
      '[class*="editor"]',
      '[class*="composer"]',
      '[role="dialog"]',
      '[role="menu"]',
    ];
    const l3Scopes = getL3RuntimeScopeSelectors(workspaceRoot);
    const observeScopeSelectors = [...new Set([...baseObserveScopeSelectors, ...l3Scopes])];
    const l3SurfaceCount = countL3Surfaces(workspaceRoot);

    const commonConfig = {
      stageDocumentRoot: false,
      shortExactTextFallback: false,
      observeScopeSelectors,
      observeAttributesOnly: true,
      observeDiscoveryAttributes: false,
      skipSubtreeOnBusy: true,
      marketplaceRemoteTranslationEnabled: false,
      l3SurfaceCount,
    };

    if (normalizedRuntimeMode === 'compatibility') {
      return {
        mode: 'compatibility',
        ...commonConfig,
        rescanDelaysMs: [300, 1500],
      };
    }

    return {
      mode: 'performance',
      ...commonConfig,
      rescanDelaysMs: [],
    };
  }

  return {
    buildRuntimeConfig,
  };
}

module.exports = {
  createRuntimeConfigModule,
};
