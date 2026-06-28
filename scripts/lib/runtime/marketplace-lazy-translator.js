const SHOW_TEXT = 4;

function collectTextNodes(root, limit = Infinity, results = []) {
  if (!root || results.length >= limit) {
    return results;
  }
  if (root.nodeType === SHOW_TEXT || root.nodeType === 3) {
    results.push(root);
    return results;
  }
  const children = root.childNodes || [];
  for (let index = 0; index < children.length && results.length < limit; index += 1) {
    collectTextNodes(children[index], limit, results);
  }
  return results;
}

function translateMarketplacePluginRecord(plugin, mappingMap) {
  if (!plugin || !mappingMap || mappingMap.size === 0) {
    return plugin;
  }
  const next = { ...plugin };
  for (const field of ['description', 'displayName', 'category', 'name']) {
    const value = next[field];
    if (typeof value === 'string' && mappingMap.has(value)) {
      next[field] = mappingMap.get(value);
    }
  }
  return next;
}

function translateMarketplacePluginsResponse(plugins, mappingMap) {
  if (!Array.isArray(plugins) || !mappingMap || mappingMap.size === 0) {
    return plugins;
  }
  return plugins.map((plugin) => translateMarketplacePluginRecord(plugin, mappingMap));
}

function createMarketplaceLazyTranslator(options = {}) {
  const batchSize = Number(options.batchSize) > 0 ? Number(options.batchSize) : 30;
  const getDocument = options.getDocument || (() => (typeof document !== 'undefined' ? document : null));
  const requestIdleCallbackFn =
    options.requestIdleCallback ||
    ((callback) => {
      if (typeof setTimeout === 'function') {
        return setTimeout(() => callback({ timeRemaining: () => 50 }), 0);
      }
      callback({ timeRemaining: () => 50 });
      return 0;
    });
  const fetchJson =
    options.fetchJson ||
    (async (url) => {
      if (typeof fetch !== 'function') {
        throw new Error(`fetch unavailable for ${url}`);
      }
      const response = await fetch(url);
      return response.json();
    });

  let mappingMap = new Map();
  let mappingsLoaded = false;
  let loadedVersion = null;
  let fetchCount = 0;
  let active = false;
  let mountObserver = null;
  let intersectionObserver = null;
  let idleQueue = [];
  let idleScheduled = false;
  let apiInterceptInstalled = false;
  let previousTranslateHook = null;

  function translateTextNode(node) {
    if (!node || node.nodeType !== 3) {
      return false;
    }
    const parent = node.parentElement;
    const text = node.textContent || '';
    const trimmed = text.trim();
    const changeText = mappingMap.get(trimmed);
    if (!changeText) {
      return false;
    }
    if (parent?.getAttribute?.('data-cursor-zh-mkt') === '1' && trimmed === changeText) {
      return false;
    }
    node.textContent = text.replace(trimmed, changeText);
    if (parent) {
      parent.setAttribute('data-cursor-zh-mkt', '1');
    }
    return true;
  }

  function translateBatch(root, limit = batchSize) {
    const targetRoot = root || getDocument()?.querySelector?.('[class*="marketplace"]');
    if (!targetRoot) {
      return 0;
    }
    const nodes = collectTextNodes(targetRoot, limit);
    let translated = 0;
    for (const node of nodes) {
      if (translateTextNode(node)) {
        translated += 1;
      }
    }
    return translated;
  }

  function scheduleIdleBatch(root) {
    if (!root) {
      return;
    }
    idleQueue.push(root);
    if (idleScheduled) {
      return;
    }
    const runNextIdleBatch = () => {
      idleScheduled = false;
      const nextRoot = idleQueue.shift();
      if (nextRoot && active) {
        translateBatch(nextRoot, batchSize);
      }
      if (idleQueue.length > 0 && active) {
        idleScheduled = true;
        requestIdleCallbackFn(runNextIdleBatch);
      }
    };
    idleScheduled = true;
    requestIdleCallbackFn(runNextIdleBatch);
  }

  async function loadMappings() {
    if (mappingsLoaded) {
      return;
    }
    fetchCount += 1;
    const payload = await fetchJson(options.mappingsUrl);
    mappingMap = new Map();
    for (const entry of payload?.entries || []) {
      if (entry?.originalText && entry?.changeText) {
        mappingMap.set(entry.originalText, entry.changeText);
      }
    }
    mappingsLoaded = true;
    loadedVersion = payload?.version ?? null;
  }

  function installApiIntercept() {
    if (apiInterceptInstalled || typeof globalThis === 'undefined') {
      return;
    }
    previousTranslateHook = globalThis.__cursorZhMarketplaceLazyTranslatePlugin;
    globalThis.__cursorZhMarketplaceLazyTranslatePlugin = (plugin) =>
      translateMarketplacePluginRecord(plugin, mappingMap);
    apiInterceptInstalled = true;
  }

  function uninstallApiIntercept() {
    if (!apiInterceptInstalled || typeof globalThis === 'undefined') {
      return;
    }
    if (previousTranslateHook) {
      globalThis.__cursorZhMarketplaceLazyTranslatePlugin = previousTranslateHook;
    } else {
      delete globalThis.__cursorZhMarketplaceLazyTranslatePlugin;
    }
    previousTranslateHook = null;
    apiInterceptInstalled = false;
  }

  function findMarketplaceRoot() {
    const doc = getDocument();
    return doc?.querySelector?.('[class*="marketplace"]') || null;
  }

  function installIntersectionObserver(root) {
    if (!root || typeof IntersectionObserver !== 'function') {
      return;
    }
    if (intersectionObserver) {
      intersectionObserver.disconnect();
    }
    intersectionObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && active) {
          scheduleIdleBatch(entry.target);
        }
      }
    });
    intersectionObserver.observe(root);
    const children = root.childNodes || [];
    for (let index = 0; index < children.length; index += 1) {
      if (children[index]?.nodeType === 1) {
        intersectionObserver.observe(children[index]);
      }
    }
  }

  async function activate(options = {}) {
    active = true;
    const expectedCatalogVersion =
      options.expectedCatalogVersion ?? options.expectedVersion ?? null;
    if (
      mappingsLoaded &&
      expectedCatalogVersion != null &&
      loadedVersion !== expectedCatalogVersion
    ) {
      reloadMappings();
    }
    if (!mappingsLoaded) {
      await loadMappings();
    }
    installApiIntercept();
    const marketplaceRoot = findMarketplaceRoot();
    installIntersectionObserver(marketplaceRoot);
    scheduleIdleBatch(marketplaceRoot);
  }

  function deactivate() {
    active = false;
    idleQueue = [];
    idleScheduled = false;
    uninstallApiIntercept();
    if (intersectionObserver) {
      intersectionObserver.disconnect();
      intersectionObserver = null;
    }
    if (mountObserver) {
      mountObserver.disconnect();
      mountObserver = null;
    }
  }

  function reloadMappings() {
    mappingMap = new Map();
    mappingsLoaded = false;
    loadedVersion = null;
  }

  function install() {
    const doc = getDocument();
    if (!doc || typeof MutationObserver !== 'function' || mountObserver) {
      return;
    }
    mountObserver = new MutationObserver(() => {
      const root = findMarketplaceRoot();
      if (root && !active) {
        const expectedCatalogVersion =
          typeof options.getExpectedCatalogVersion === 'function'
            ? options.getExpectedCatalogVersion()
            : null;
        void activate({ expectedCatalogVersion });
        return;
      }
      if (!root && active) {
        deactivate();
      }
    });
    mountObserver.observe(doc.body || doc.documentElement, {
      childList: true,
      subtree: true,
    });
  }

  function getState() {
    return {
      active,
      mappingsLoaded,
      mapSize: mappingMap.size,
      fetchCount,
      loadedVersion,
      apiInterceptInstalled,
    };
  }

  return {
    activate,
    deactivate,
    reloadMappings,
    install,
    getState,
    translateBatch,
    translateMarketplacePluginRecord: (plugin) => translateMarketplacePluginRecord(plugin, mappingMap),
    translateMarketplacePluginsResponse: (plugins) =>
      translateMarketplacePluginsResponse(plugins, mappingMap),
  };
}

module.exports = {
  collectTextNodes,
  createMarketplaceLazyTranslator,
  translateMarketplacePluginRecord,
  translateMarketplacePluginsResponse,
};
