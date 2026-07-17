function evaluateLocatorPostconditions(sourceText, postconditions) {
  const failures = postconditions.filter((item) => {
    const count = sourceText.split(item.fragment).length - 1;
    return count !== item.count;
  }).map((item) => item.id);
  return { ok: failures.length === 0, failures };
}

module.exports = {
  evaluateLocatorPostconditions,
};
