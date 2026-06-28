function harvestStringKey(entry) {
  return `${entry.path || ''}\0${entry.text}`;
}

function harvestOccurrenceKey(entry) {
  if (entry.kind === 'anchor') {
    return `anchor\0${entry.anchorId || entry.id}\0${entry.field || 'title'}\0${entry.path || ''}`;
  }

  return `${entry.path || ''}\0${entry.context || ''}\0${entry.text || ''}`;
}

function flattenHarvestStrings(snapshot = {}) {
  const items = [];
  for (const file of snapshot.files || []) {
    for (const stringEntry of file.strings || []) {
      items.push({
        path: file.path,
        text: stringEntry.text,
        context: stringEntry.context,
        lineHint: stringEntry.lineHint,
      });
    }
  }
  return items;
}

function indexByKey(items, keyFn) {
  const map = new Map();
  for (const item of items) {
    map.set(keyFn(item), item);
  }
  return map;
}

function diffHarvestSnapshots(baseline = {}, current = {}) {
  const baselineStrings = flattenHarvestStrings(baseline);
  const currentStrings = flattenHarvestStrings(current);
  const baselineByKey = indexByKey(baselineStrings, harvestOccurrenceKey);
  const currentByKey = indexByKey(currentStrings, harvestOccurrenceKey);

  const added = currentStrings.filter((entry) => !baselineByKey.has(harvestOccurrenceKey(entry)));
  const removed = baselineStrings.filter((entry) => !currentByKey.has(harvestOccurrenceKey(entry)));

  const baselineAnchors = Array.isArray(baseline.anchors) ? baseline.anchors : [];
  const currentAnchors = Array.isArray(current.anchors) ? current.anchors : [];
  const baselineAnchorsById = new Map(
    baselineAnchors.map((anchor) => [`${anchor.id}\0${anchor.field}`, anchor])
  );
  const changed_anchor_stable = [];

  for (const anchor of currentAnchors) {
    const key = `${anchor.id}\0${anchor.field}`;
    const previous = baselineAnchorsById.get(key);
    if (previous && previous.text !== anchor.text) {
      changed_anchor_stable.push({
        id: anchor.id,
        field: anchor.field,
        before: previous.text,
        after: anchor.text,
        path: anchor.path,
      });
    }
  }

  const changed = changed_anchor_stable.map((entry) => ({
    type: 'changed_anchor_stable',
    ...entry,
  }));

  return {
    added,
    removed,
    changed,
    changed_anchor_stable,
  };
}

module.exports = {
  harvestStringKey,
  harvestOccurrenceKey,
  flattenHarvestStrings,
  diffHarvestSnapshots,
};
