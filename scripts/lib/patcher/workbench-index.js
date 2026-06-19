function skipQuotedStringEscape(text, cursor, len) {
  if (cursor >= len || text[cursor] !== '\\') {
    return cursor;
  }

  cursor += 1;
  if (cursor >= len) {
    return len;
  }

  const escaped = text[cursor];
  if (escaped === 'u') {
    return Math.min(len, cursor + 5);
  }
  if (escaped === 'x') {
    return Math.min(len, cursor + 3);
  }

  return cursor + 1;
}

function isRegexStart(text, index) {
  if (text[index] !== '/') {
    return false;
  }

  const len = text.length;
  if (index + 1 < len && /\s/.test(text[index + 1])) {
    return false;
  }

  if (index === 0) {
    return true;
  }

  let previous = index - 1;
  while (previous >= 0 && /\s/.test(text[previous])) {
    previous -= 1;
  }

  if (previous < 0) {
    return true;
  }

  const char = text[previous];
  if ('(,=:[!&|?{;+-~^<>'.includes(char)) {
    return true;
  }

  if (char === ')' || char === ']' || char === '}') {
    const bodyStart = index + 1;
    if (bodyStart >= len) {
      return false;
    }
    const firstBodyChar = text[bodyStart];
    if (/[0-9.]/.test(firstBodyChar)) {
      return false;
    }
    return true;
  }

  return false;
}

function skipRegexLiteral(text, start, len) {
  let cursor = start + 1;
  let inClass = false;

  while (cursor < len) {
    const char = text[cursor];
    if (char === '\\') {
      cursor = Math.min(len, cursor + 2);
      continue;
    }
    if (char === '[' && !inClass) {
      inClass = true;
      cursor += 1;
      continue;
    }
    if (char === ']' && inClass) {
      inClass = false;
      cursor += 1;
      continue;
    }
    if (char === '/' && !inClass) {
      cursor += 1;
      while (cursor < len && /[a-zA-Z]/.test(text[cursor])) {
        cursor += 1;
      }
      return cursor;
    }
    cursor += 1;
  }

  return len;
}

function skipLineComment(text, start, len) {
  let cursor = start + 2;
  while (cursor < len && text[cursor] !== '\n') {
    cursor += 1;
  }
  return cursor;
}

function skipBlockComment(text, start, len) {
  let cursor = start + 2;
  while (cursor + 1 < len && !(text[cursor] === '*' && text[cursor + 1] === '/')) {
    cursor += 1;
  }
  return Math.min(len, cursor + 2);
}

function readQuotedLiteral(text, start, len) {
  const quote = text[start];
  let cursor = start + 1;

  while (cursor < len) {
    if (text[cursor] === '\\') {
      cursor = skipQuotedStringEscape(text, cursor, len);
      continue;
    }
    if (text[cursor] === quote) {
      return {
        quote,
        content: text.slice(start + 1, cursor),
        end: cursor + 1,
      };
    }
    cursor += 1;
  }

  return {
    quote,
    content: text.slice(start + 1),
    end: len,
  };
}

function iterateQuotedLiterals(sourceText, visitor) {
  const text = String(sourceText || '');
  const len = text.length;
  let index = 0;

  while (index < len) {
    const char = text[index];

    if (char === '/' && index + 1 < len) {
      const next = text[index + 1];
      if (next === '/') {
        index = skipLineComment(text, index, len);
        continue;
      }
      if (next === '*') {
        index = skipBlockComment(text, index, len);
        continue;
      }
      if (isRegexStart(text, index)) {
        index = skipRegexLiteral(text, index, len);
        continue;
      }
    }

    if (char === '"' || char === "'" || char === '`') {
      const literal = readQuotedLiteral(text, index, len);
      visitor(literal.quote, literal.content, index, literal.end);
      index = literal.end;
      continue;
    }

    index += 1;
  }
}

function createQuotedLiteralSet(sourceText) {
  const literals = new Set();
  iterateQuotedLiterals(sourceText, (_quote, content) => {
    literals.add(content);
  });
  return literals;
}

function createWorkbenchIndex(sourceText) {
  const text = String(sourceText || '');
  const quotedLiterals = createQuotedLiteralSet(text);

  return {
    sourceText: text,
    quotedLiterals,
    isAuthoritative: true,
    includes(fragment) {
      return text.includes(String(fragment || ''));
    },
    hasQuotedLiteral(originalText) {
      if (typeof originalText !== 'string' || originalText.length === 0) {
        return false;
      }
      return quotedLiterals.has(originalText);
    },
  };
}

module.exports = {
  skipQuotedStringEscape,
  isRegexStart,
  skipRegexLiteral,
  iterateQuotedLiterals,
  createQuotedLiteralSet,
  createWorkbenchIndex,
};
