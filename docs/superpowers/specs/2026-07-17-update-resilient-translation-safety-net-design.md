# Cursor Update-Resilient Translation Safety Net Design

Date: 2026-07-17
Status: Draft for user review

## Assumptions

1. The primary goal is to preserve already-known Chinese translations across Cursor updates, even when bundles are renamed, split, minified differently, or rendered through a different component path.
2. Completely new Cursor copy cannot be translated reliably without a translation source. It must be detected automatically, but it must not be sent to a network translation service or silently machine-translated at runtime by default.
3. `performance` remains the default mode. The safety net must stay event-driven, surface-scoped, bounded, and free of global polling or scheduled full-document rescans.
4. Existing `apply`, `ensure`, `verify`, `start`, `uninstall`, backup, and clean-state recovery semantics remain supported.
5. The current uncommitted workspace changes belong to the user. This design does not authorize rewriting or discarding them.

If assumptions 1 or 2 are wrong, especially if automatic online translation of previously unseen copy is required, the design needs an explicit privacy, provider, caching, and quality policy before implementation.

## Objective

Build a deterministic, update-adaptive translation safety net that:

- keeps stable translations on the cheapest and most reliable path;
- relocates known translations after bundle and minifier drift without accumulating version-specific source fragments;
- gives every critical surface an explicit bounded fallback;
- detects previously unseen or ambiguous text before it can be reported as covered;
- stages and validates a rebuild before changing the installed Cursor files;
- preserves startup and interaction performance.

The mechanism is successful when a Cursor update becomes a compatibility classification problem, not a new screenshot round or a manual search-and-replace exercise.

## Current Evidence

Live verification against Cursor `3.12.10` and VS Code core `1.128.0` on 2026-07-17 reported:

- merged mappings: `1756`;
- runtime mappings: `615`;
- runtime header: `101.9 KB`;
- runtime governance phase: `phase2`;
- verify total: `9.92 s`;
- coverage analysis: `9.44 s` (`95.2%` of verify);
- Cursor Win targets: `1307`, with `2` uncovered (`Agent ID`, `Agent URL`);
- both desktop and Glass bundles failed the resilient Marketplace hook check;
- both installed translated bundles retained the extension-cache prompt logic and require re-apply.

The current mapping inventory also shows:

- `1338` Cursor Win common entries;
- `197` dynamic entries;
- `64` anchor entries, all tied to explicit anchor IDs;
- `615` injected runtime rules in the installed artifact;
- the Product Tips hook contract alone contains `12` minified-source variants.

Conclusion: Phase 2 already controls runtime size. The remaining fragility comes primarily from source-shape coupling, narrow anchor coverage, post-update detection that is too late, and missing fallback ownership for some contracts.

## Design Principles

### Stable identity before source text

Every important translation unit gets a stable `translationId`. English source text becomes an alias, not the identity. The unit may be located through a command ID, setting key, NLS key, JSON field, semantic bundle signature, or surface-scoped rendered text.

### Deterministic before fuzzy

Automatic application is allowed only when the locator is unique and its postconditions pass. Similarity may rank harvest candidates, but fuzzy similarity alone must never patch source or change visible UI.

### Fallback is owned and bounded

Every blocking contract declares its primary route and fallback route. A contract without a valid fallback blocks commit of the prepared artifacts. A runtime fallback must name its surface root and activation event.

### Prepare before commit

An update rebuild is a two-phase transaction: prepare and validate in workspace state, then commit the complete managed-target set. That set includes install artifacts, `argv.json`, locale mirror, extension NLS, language-pack cache, launchers, and shortcuts. A failed or blocked prepare leaves every managed target untouched; only `state/generated/<build-id>` artifacts and diagnostics may be written before admission.

### Unknown is visible, not guessed

Unseen text is captured into a local update report with context and priority. It is never counted as covered and is never silently translated by an unapproved online service.

## Architecture

### Layer 0: Official catalog ownership

Use the official Simplified Chinese language pack and extension NLS catalogs whenever a stable module/key pair exists.

Responsibilities:

- resolve NLS module aliases;
- verify key alignment and message count before writing;
- prefer catalog translations over source replacement;
- record catalog ownership by `translationId` in the build manifest.

Failure behavior:

- a catalog mismatch is classified before commit;
- a critical unit may fall through only to an explicitly declared lower layer.

### Layer 1: Indexed static literal ownership

Translate stable quoted literals at build time using the workbench index. This remains the default for text present directly in a bundle.

Responsibilities:

- use exact or normalized aliases attached to a stable `translationId`;
- require a unique target or an explicit multi-target cardinality;
- emit match counts and source bundle IDs into the manifest;
- verify that the translated literal exists after transformation.

This layer has no runtime cost.

### Layer 2: Semantic locator ownership

Replace growing lists of minified source fragments with semantic locators. A locator is a conjunction of stable evidence, for example:

- command, action, setting, menu, or telemetry ID;
- stable property names and nearby string constants;
- field path such as `title`, `label`, `placeholder`, or `description`;
- relative token/data-flow shape that ignores minified identifier names;
- expected containing bundle capability;
- expected match cardinality;
- postcondition proving that the hook or translation call was inserted once.

Locator evaluation produces one of four states:

- `resolved`: exactly one valid target and all postconditions pass;
- `relocated`: the old fingerprint changed but a unique semantic target was found;
- `fallback`: no safe source target exists, but the contract has a valid runtime fallback;
- `blocked`: ambiguous, missing, or failed postcondition with no valid fallback.

Version-specific variants are allowed only as temporary compatibility fixtures with an expiry reason. They are not the default extension mechanism.

### Layer 3: Surface-scoped runtime safety net

Known translations that cannot be applied safely through Layers 0-2 are delivered as small per-surface shards.

Activation rules:

- activate only when a registered surface root mounts, receives focus, or opens;
- observe only that surface subtree;
- translate added nodes in bounded idle batches;
- disconnect when the surface unmounts;
- load only the shard for that surface;
- never poll or schedule a full-document rescan. Performance mode may retain exactly one global discovery observer on `document.body || document.documentElement`, limited to `childList + subtree`; it only queues added roots, inspects at most `30` per idle batch against registered surface selectors, and never translates, walks text, handles attributes, or parses shards.

Matching rules:

- exact alias;
- normalized exact alias;
- approved parameterized template preserving placeholders;
- scoped regex with explicit field/surface ownership.

Global short-word matching and unscoped fuzzy matching remain forbidden.

### Layer 4: Update discovery and quarantine

Before commit, compare the new installation profile with the previous compatible profile.

The update profile contains only redistributable metadata:

- Cursor and VS Code versions;
- source file hashes and bundle capability IDs;
- NLS module/key inventory hashes;
- semantic locator outcomes;
- contract outcomes;
- known alias hits, changed aliases, static unknown source strings, and privacy-safe runtime unknown fingerprints/counts by surface;
- runtime shard sizes and budgets.

Unknown or ambiguous strings are written to a local quarantine report. The default queue is:

1. blocking contract without fallback;
2. changed alias with a unique semantic identity candidate;
3. new critical-surface string;
4. new noncritical visible string;
5. background inventory noise.

Quarantine is local-only and source-aware. Static harvest may retain raw literals extracted from Cursor bundles. Runtime capture may retain raw text only when the node matches an explicit per-surface `quarantineSelectors` allowlist for UI chrome. It must reject `input`, `textarea`, `[contenteditable]`, editors, terminals, chat/message bodies, code blocks, and declared dynamic-value regions even when nested under an allowed surface. Every other runtime unknown is represented only by surface, occurrence count, and HMAC-SHA-256 fingerprint under an ephemeral per-session key that is never persisted or included in reports. If secure fingerprinting is unavailable, record only an aggregate count; never fall back to raw text.

Similarity is allowed to propose an alias for review. Promotion into shipped mappings requires an explicit mapping update and tests.

## Translation Unit Contract

The conceptual schema is:

```js
{
  translationId: 'composer.send_follow_up',
  changeText: '继续追问',
  aliases: ['Send follow-up', 'Add a follow-up'],
  owner: 'composer',
  primary: {
    kind: 'semantic',
    locatorId: 'composer.follow_up_action',
    cardinality: 1
  },
  fallback: {
    kind: 'runtime-surface',
    surface: 'composer',
    match: 'normalizedExact'
  },
  severity: 'error',
  placeholders: []
}
```

Required invariants:

- `translationId` is stable and unique;
- every alias belongs to only one effective Chinese translation within a scope;
- blocking units have either a proven primary route or a current-version fallback proof;
- placeholders and mnemonics are preserved;
- runtime ownership requires a registered surface;
- deprecated aliases remain available for update compatibility until a ratchet explicitly removes them.

A current-version fallback proof is not a historical boolean. It contains the fallback test ID and current passing result; successful shard compilation; scope, lifecycle, placeholder, and privacy-contract outcomes; a uniquely matched current Cursor capability-evidence signature; and a proof key derived from the current bundle hashes, NLS inventory hash, runtime-governance snapshot, and tool version. Any missing, ambiguous, failed, or stale component invalidates the proof and blocks admission. Live UI interaction remains a release acceptance gate, not a requirement for each user's `ensure`.

## Update Admission State Machine

`ensure` must classify the installation before it writes:

```text
UNCHANGED -> reuse verified artifacts
KNOWN_DRIFT -> rebuild from current sources, validate, commit
DEGRADED -> commit only when every failed primary route has a current-version fallback proof
BLOCKED -> leave every managed target untouched and print the exact blocking contracts
```

Prepare phase:

1. detect install and language-pack compatibility;
2. inventory all candidate bundles and NLS catalogs;
3. build indexes and semantic capability profile;
4. resolve every translation unit route;
5. generate translated artifacts under `state/generated/<build-id>/`;
6. run static, runtime-shard, lifecycle, and clean-state precommit validation.

Commit phase:

1. confirm Cursor and install-scoped updater processes are stopped;
2. atomically acquire the per-install cursor-zh transaction lock shared by `apply`, `ensure`, and `uninstall`;
3. recompute every managed target's existence/content snapshot and require an exact match with the prepared snapshot;
4. create or validate the rollback snapshot;
5. write prepared install and external artifacts through one transaction registry;
6. verify all managed-target hashes/existence states and contract postconditions;
7. persist the accepted compatibility profile;
8. on commit verification failure, restore every committed managed target in reverse order and retain the prepared diagnostics;
9. release the transaction lock only after successful verification or completed rollback.

Busy processes, a live lock, or concurrent snapshot drift produce `BLOCKED` with explicit `busy`, `transaction-active`, or `concurrent-drift` evidence before any managed-target write. The workspace-prepared artifacts and diagnostics remain retryable. Lock files are created atomically and identify PID, process start time, owner token, install identity, and build/operation ID. A stale lock may be reclaimed only after the minimum stale interval and only when the PID no longer exists or its start time differs; file age alone is never sufficient.

## State Schema and Cross-Version Recovery

Every new manifest declares `schemaVersion` and `minReaderVersion`. The current tool provides read-only adapters for the unversioned legacy `v0` shape and the previous two formal schema versions. Adapters migrate only in memory; legacy manifests and backup directories are never rewritten, renamed, or deleted. A new accepted manifest is published only after the prepared commit and post-commit verification succeed.

Prepare also writes a candidate stable `recovery-capsule.json` containing only recovery-critical data: capsule schema/minimum reader version, tool/operation/build identity, validated backup pointer, normalized managed-target list, and each target's pre-commit existence/hash/restore source. The candidate is workspace state and may survive failure; the accepted manifest references it only after successful commit. An unknown future manifest schema blocks `apply` and `ensure`. `uninstall` may proceed across that boundary only when a supported recovery capsule independently validates its schema, install identity, backup contents, managed targets, and pre-state evidence; otherwise it blocks and requests a matching or newer tool. Recovery never guesses.

## Performance Budgets

The design must meet all of these on the same machine/profile used for baseline comparison:

- no interval polling or scheduled document-wide rescans in `performance` mode;
- exactly one global discovery observer with `childList + subtree` only, no translation, and a `30`-added-root idle budget;
- startup core runtime payload `<= 80 KB`;
- each lazy surface shard `<= 20 KB` uncompressed;
- no more than one active observer per mounted registered surface;
- runtime batches process at most `30` text nodes before yielding;
- warm unchanged `ensure` `<= 2 s`;
- warm `verify` `<= 3 s`;
- cold `verify` `<= 8 s`;
- update prepare and validation `<= 30 s`, excluding backup copy time;
- no runtime network request for translation text;
- no startup parsing of mappings for surfaces that have not mounted.

If a budget is exceeded, `verify` reports the owning surface or phase rather than only a global total.

Measurement protocol is part of the gate. Payload limits (`80 KB` core and `20 KB` per shard) block in every environment. Wall-clock proof is valid only on the registered dedicated baseline machine/profile: warm verify runs once for priming and then five measured times, with the slowest run `<= 3 s`; cold verify clears only cursor-zh session cache (not OS file cache) before each of three measured runs, with the slowest run `<= 8 s`. Generic CI/developer machines run deterministic stage-budget tests and report wall-clock timings as `UNQUALIFIED`; they cannot produce release proof. A release is blocked when the required self-hosted baseline job is absent, its computed machine/profile fingerprint does not match the registered value, or any measured run exceeds its limit.

## Reliability and Safety Boundaries

Always:

- follow RED -> GREEN -> REFACTOR for production behavior changes;
- use current filesystem and Git evidence before editing;
- use patch-based edits and explicit UTF-8 reads for encoding-sensitive files;
- preserve byte-for-byte `main.js` safety and profile-directory behavior;
- stage update artifacts before any managed-target write;
- keep uninstall verification before state cleanup;
- report `resolved`, `fallback`, `unknown`, and `blocked` separately.

Ask first:

- adding a parser or other production dependency;
- enabling any network translation provider;
- storing rendered UI text outside local workspace state;
- changing a blocking contract to warning severity;
- broadening a runtime observer scope.

Never:

- patch by fuzzy match alone;
- silently guess among multiple source targets;
- add global short-word mappings;
- count unknown text as translated;
- add a full-document polling rescue path;
- commit a prepared update when a blocking contract has neither a resolved primary route nor a current-version fallback proof;
- distribute Cursor bundles, user data, backups, or harvested proprietary source.

## Project Structure

Proposed responsibility boundaries; exact file splits belong in the implementation plan after this spec is approved:

```text
translations/meta/
  translation-units.json       stable IDs, ownership, route and fallback policy
  surfaces.json                surface roots, activation and budget metadata
  runtime-governance.json      global and per-surface ratchets

scripts/lib/compatibility/
  update-profile.js            redistributable update capability profile
  admission.js                 unchanged/known-drift/degraded/blocked decision
  semantic-locator.js          unique structural target resolution
  locator-postconditions.js    patch/hook proof checks

scripts/lib/mapping/
  translation-units.js         schema validation and alias indexes
  runtime-shards.js            per-surface runtime payload selection

scripts/lib/runtime/
  surface-registry.js          mount/focus/open activation lifecycle
  surface-translator.js        bounded subtree translation

scripts/tool/
  update-preflight.js          prepare-phase orchestration
  prepared-build.js            staged artifact manifest and commit input
  verify.js                    strict installed and prepared verification

scripts/tests/
  fixtures/update-drift/       synthetic drift fixtures, no Cursor bundles
  lib/                         locator, schema, shard, runtime lifecycle tests
  tool/                        ensure transaction and rollback integration tests
```

## Code Style

Prefer pure classification functions with explicit outcomes:

```js
function classifyLocatorOutcome({ matches, postconditions, fallbackAvailable }) {
  if (matches.length === 1 && postconditions.every(Boolean)) {
    return { status: 'resolved', target: matches[0] };
  }
  if (fallbackAvailable) {
    return { status: 'fallback', reason: matches.length > 1 ? 'ambiguous' : 'missing' };
  }
  return { status: 'blocked', reason: matches.length > 1 ? 'ambiguous' : 'missing' };
}
```

Do not hide ambiguity behind booleans. Outcomes must carry enough evidence for `verify` and the update report.

## Testing Strategy

### Contract and schema tests

- reject duplicate `translationId` values;
- reject aliases that resolve to conflicting translations in the same scope;
- reject blocking units without a primary route or fallback;
- reject runtime fallback without a registered surface;
- verify placeholder and mnemonic preservation.

### Metamorphic semantic-locator tests

Each locator fixture must survive:

- minified variable renaming;
- quote and whitespace changes;
- harmless function reordering;
- bundle filename changes;
- bundle split between desktop, Glass, and auxiliary chunks;
- insertion of unrelated nearby literals.

It must become `blocked` or `fallback`, never patch the wrong location, when:

- two valid-looking targets exist;
- the stable command/setting/action ID disappears;
- the postcondition cannot be proven.

### Runtime safety-net tests

- no surface shard loads before its surface activates;
- only nodes inside the registered root are translated;
- observers disconnect on unmount;
- batches yield after `30` nodes;
- the sole global discovery observer watches only `childList + subtree`, inspects at most `30` added roots per idle batch, performs no translation, and never queries the whole document;
- dynamic placeholders survive translation;
- static unknown source literals may retain raw text, while allowlisted runtime UI chrome retains raw text only under the explicit selector policy;
- runtime user content and dynamic-value regions never enter a report; other runtime unknowns carry only a per-session HMAC fingerprint, surface, and occurrence count;
- no polling timer or document-wide scheduled rescan is installed.

### Update transaction tests

- unchanged update profile reuses verified artifacts;
- known drift rebuilds from current originals;
- degraded mode commits only with complete, unambiguous, current-version fallback proofs, and stale proof keys block;
- blocked preflight performs zero writes to every managed target outside workspace state;
- Cursor/updater activity, a live transaction lock, or any prepare-to-commit managed-target drift blocks before backup or managed writes;
- stale-lock recovery requires both the stale interval and PID/start-time mismatch, while concurrent `apply`/`ensure`/`uninstall` share one per-install lock;
- failed commit verification restores the prior existence/content state of every committed managed target;
- uninstall still restores English and verifies before state cleanup.

### State migration and recovery tests

- unversioned `v0` and the previous two formal schemas adapt in memory without changing their source files;
- successful commit publishes a new schema manifest that references a validated recovery capsule, while failed/blocked prepare leaves the prior manifest authoritative;
- legacy backup bytes and paths remain unchanged;
- unknown future schema blocks `apply`/`ensure`;
- unknown future schema permits `uninstall` only through a compatible, fully validated capsule;
- corrupt manifest, corrupt capsule, wrong install identity, or invalid backup pointer fails closed with actionable version guidance.

### Performance tests

- core payload and every shard obey size budgets;
- all environments hard-block payload size regressions;
- the registered baseline runs one warmup plus five warm measurements and three cursor-zh-cache-cold measurements, enforcing the slowest sample;
- unregistered environments report `UNQUALIFIED` and cannot satisfy the release performance gate;
- missing/mismatched self-hosted baseline evidence blocks release;
- surface activation work is bounded by node count and yields;
- a non-mounted surface adds no observer or mapping parse cost.

### Rollout and readiness tests

- shadow executes full new-engine evidence but records zero new-engine managed writes;
- canary rejects an unregistered or non-disposable install even when the flag is present;
- accepted canary/enforced commit records `lastKnownGood` and a unique pending activation nonce;
- bootstrap readiness requires finished workbench load plus a bounded nonempty-DOM probe and acknowledges only the matching nonce;
- missing readiness never kills Cursor; next stopped `start`/`ensure` restores `lastKnownGood` under the transaction lock;
- `BLOCKED` never selects legacy automatically, and an expired maintenance-only legacy option fails;
- enforced promotion requires all gates and evidence for two builds including one real upstream update.

### Real-operation acceptance

For a supported live Cursor version, verify at least:

- startup reaches the normal workspace without white screen or profile drift;
- composer follow-up action is Chinese;
- model picker search is Chinese;
- settings search is Chinese;
- one dialog surface is translated through its declared fallback path;
- Marketplace opens without requiring a global runtime scan;
- uninstall returns the same installation to verified English state.

## Commands

Focused RED/GREEN commands will be named per task in the implementation plan. The project-wide gates remain:

```powershell
node --test scripts/tests/<exact-focused-test>.test.js
node scripts/run-tests.js
node scripts/cursor-zh-tool.js apply --install-dir "<Cursor path>"
node scripts/cursor-zh-tool.js verify --install-dir "<Cursor path>"
node scripts/cursor-zh-tool.js ensure --install-dir "<Cursor path>"
node scripts/cursor-zh-tool.js verify --expect-clean --install-dir "<Cursor path>"
```

PowerShell scripts must also pass the repository's AST parse gate.

## Success Criteria

### Update resilience

- all blocking translation units have a stable ID, explicit owner, and declared fallback policy;
- the synthetic drift matrix preserves `100%` of known blocking translations without adding version-specific minified fragments;
- ambiguous semantic matches produce `fallback` or `blocked`, never a source mutation;
- an unsupported Cursor update leaves the current installation untouched until preflight succeeds;
- commit uses an exclusive per-install lock and exact prepared-snapshot revalidation, preventing concurrent or stale-state installation;
- previously unseen static text and privacy-safe runtime evidence appear in the update quarantine report and are not reported as covered;
- no runtime quarantine report contains user input, editor/terminal/chat/code content, or raw text from outside explicit UI-chrome allowlists.

### Translation coverage

- blocking contracts: `100%` resolved or covered by a current-version fallback proof;
- warning contracts: `>= 95%` resolved or covered by fallback, with the remainder listed explicitly;
- known aliases moved or renamed across fixtures: `100%` retained;
- no identity mapping or missing rule is counted as effective coverage.

### Performance

- all budgets in the Performance Budgets section pass;
- release evidence comes from the registered baseline fingerprint and complete measurement sample set, never from generic CI timing;
- no regression to polling, global rescans, or eager parsing of all surface mappings;
- runtime work scales with mounted changed nodes, not total document size or total mapping count.

### Lifecycle safety

- full Node test suite passes;
- apply, verify, ensure, start, uninstall, and verify-clean integration paths pass;
- legacy-state fixtures and compatible recovery capsules pass without mutating old manifests/backups; future or corrupt unsupported state fails closed;
- shadow/canary/enforced transitions, readiness acknowledgement, next-launch recovery, rollout evidence, and legacy-writer expiry gates pass;
- live startup and uninstall operation paths pass;
- no profile-directory drift, white screen, or rollback regression.

## Migration Strategy

### Rollout modes and last-known-good recovery

The engine has three explicit rollout modes recorded in manifest/evidence:

1. `shadow`: run complete prepare, admission, proof, and comparison without allowing the new engine to write managed targets; the transition-release legacy writer remains the active writer.
2. `canary`: allow new transactional writes only for an explicitly registered disposable install and explicit `--safety-net-canary` selection.
3. `enforced`: make the new transaction the default only after all deterministic, privacy, recovery, live-operation, and qualified baseline performance gates pass, and evidence covers at least two distinct Cursor builds including one real upstream update.

Every accepted canary/enforced commit records `lastKnownGood` manifest, snapshot, and validated recovery capsule, then creates a one-use pending-activation nonce. The generated bootstrap reports readiness only after a workbench window finishes loading and a bounded DOM readiness probe succeeds. Commit/post-commit failures roll back immediately. If readiness remains unconfirmed, the toolkit never terminates a running Cursor process; on the next `start` or `ensure`, while Cursor is stopped and under the same per-install lock, it automatically restores `lastKnownGood` before launching.

`BLOCKED` never falls back automatically to the legacy writer. The legacy writer remains available for exactly one transition release behind an explicit maintenance-only option and warning, with a declared expiry. It is removed after enforced evidence passes. Release promotion fails when rollout evidence is missing, does not include one real upstream update/two distinct builds, contains a failed gate, or still relies on an expired legacy writer.

1. Introduce stable translation-unit schema and compatibility reporting without changing runtime behavior.
2. Add semantic locator engine and migrate one brittle hook as a vertical slice.
3. Add prepared-build admission and prove zero-write blocking across the complete managed-target set.
4. Add per-surface runtime shards and migrate existing fallback-owned contracts.
5. Migrate common mappings and anchors in bounded surface batches.
6. Remove superseded minified-source variants only after equivalent drift tests and live proof pass.
7. Ratchet payload, verify-time, and legacy-variant budgets downward.
8. Run one transition release in `shadow`, then registered disposable-install `canary`, then promote to `enforced` only from complete rollout evidence; remove the maintenance-only legacy writer after promotion.

Each step must be independently releasable and reversible. No big-bang mapping migration is allowed.

## Approved Defaults

1. Previously unseen Cursor-specific copy remains English and enters the local privacy-safe quarantine; `ensure` does not call an online translation provider.
2. `DEGRADED` starts automatically only when every blocking primary failure has a complete current-version fallback proof.
3. Core `80 KB`, per-shard `20 KB`, warm verify `3 s`, and cold verify `8 s` are hard gates on the baseline machine/profile.
