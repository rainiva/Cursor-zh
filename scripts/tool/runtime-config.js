function createRuntimeConfigModule({ normalizeRuntimeMode }) {
  function buildRuntimeConfig(runtimeMode = 'performance') {
    const normalizedRuntimeMode = normalizeRuntimeMode(runtimeMode);
    const commonConfig = {
      stageDocumentRoot: false,
      shortExactTextFallback: false,
      observeScopeSelectors: [
        '[class*="settings"]',
        '[class*="marketplace"]',
        '[class*="plugin"]',
        '[class*="skill"]',
        '[class*="subagent"]',
        '[class*="mcp"]',
        '[class*="onboarding"]',
        '[class*="empty-state"]',
        '[role="dialog"]',
        '[role="menu"]',
      ],
      observeAttributesOnly: true,
      observeDiscoveryAttributes: false,
      skipSubtreeOnBusy: true,
      marketplaceRemoteTranslationEnabled: false,
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
