const FRAGILE_MARKETPLACE_MAP_HOOK_RE =
  /\.map\(p=>\w+\(\(h=globalThis\.__cursorZhMarketplaceLazyTranslatePlugin\)\?h\(p\):p\)\)/;

const RESILIENT_MARKETPLACE_MAP_HOOK_RE =
  /\.map\(p=>\w+\(\(\(\)=>\{try\{const h=globalThis\.__cursorZhMarketplaceLazyTranslatePlugin;return h\?h\(p\):p\}catch\(e\)\{return p\}\}\)\(\)\)\)/;

const BROKEN_MARKETPLACE_ACTIVATE_PATCH_RE =
  /try\{globalThis\.__cursorZhMarketplaceLazy\?\.activate\?\.\(\)\}catch\(e\)\{\}Hv\(gzg/;

function hasFragileMarketplaceMapHook(sourceText) {
  return FRAGILE_MARKETPLACE_MAP_HOOK_RE.test(String(sourceText || ''));
}

function hasResilientMarketplaceMapHook(sourceText) {
  return RESILIENT_MARKETPLACE_MAP_HOOK_RE.test(String(sourceText || ''));
}

function hasBrokenMarketplaceActivatePatch(sourceText) {
  return BROKEN_MARKETPLACE_ACTIVATE_PATCH_RE.test(String(sourceText || ''));
}

function inspectMarketplaceWorkbenchPatches(sourceText) {
  const text = String(sourceText || '');
  if (!text.includes('__cursorZhMarketplaceLazyTranslatePlugin')) {
    return { ok: true, skipped: true, issues: [] };
  }

  const issues = [];
  if (hasFragileMarketplaceMapHook(text)) {
    issues.push(
      '已安装的 workbench 仍使用脆弱的 Marketplace map hook（无 try/catch 降级），请重新运行 apply。'
    );
  } else if (!hasResilientMarketplaceMapHook(text)) {
    issues.push(
      '已安装的 workbench 缺少容错 Marketplace map hook，请重新运行 apply。'
    );
  }

  if (hasBrokenMarketplaceActivatePatch(text)) {
    issues.push(
      '已安装的 workbench 仍包含非法 Marketplace activate 补丁（JSX 语法风险），请重新运行 apply。'
    );
  }

  return {
    ok: issues.length === 0,
    skipped: false,
    issues,
  };
}

module.exports = {
  FRAGILE_MARKETPLACE_MAP_HOOK_RE,
  RESILIENT_MARKETPLACE_MAP_HOOK_RE,
  BROKEN_MARKETPLACE_ACTIVATE_PATCH_RE,
  hasFragileMarketplaceMapHook,
  hasResilientMarketplaceMapHook,
  hasBrokenMarketplaceActivatePatch,
  inspectMarketplaceWorkbenchPatches,
};
