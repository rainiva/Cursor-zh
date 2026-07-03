const REQUIRED_SECTIONS = [
  '### 下载与安装',
  '### 安装前提',
  '### 卸载',
  '### 更多说明',
];

const FORBIDDEN_ENGLISH_HEADERS = [
  '### Download',
  '### Installation',
  '### Prerequisites',
  '### Uninstall',
  '## Release Notes',
  "## What's New",
];

const CJK_PATTERN = /[\u3400-\u9fff]/;

function buildExpectedReleaseTitle(version) {
  return `Cursor 中文增强包 v${version}`;
}

function validateReleaseTitle(title) {
  const trimmed = String(title || '').trim();
  if (!trimmed) {
    throw new Error('Release title must not be empty.');
  }
  if (!trimmed.startsWith('Cursor 中文增强包 v')) {
    throw new Error('Release title must be Chinese: Cursor 中文增强包 v<version>.');
  }
  if (!CJK_PATTERN.test(trimmed)) {
    throw new Error('Release title failed Chinese policy.');
  }
}

function validateReleaseNotesContent(body) {
  const text = String(body || '').trim();
  if (!text) {
    throw new Error('Release notes body must not be empty.');
  }
  if (!CJK_PATTERN.test(text)) {
    throw new Error('Release notes body must contain Chinese text.');
  }

  for (const header of FORBIDDEN_ENGLISH_HEADERS) {
    if (text.includes(header)) {
      throw new Error(`Release notes must not use English section header: ${header}`);
    }
  }

  for (const section of REQUIRED_SECTIONS) {
    if (!text.includes(section)) {
      throw new Error(`Release notes missing required Chinese section: ${section}`);
    }
  }
}

module.exports = {
  REQUIRED_SECTIONS,
  FORBIDDEN_ENGLISH_HEADERS,
  buildExpectedReleaseTitle,
  validateReleaseTitle,
  validateReleaseNotesContent,
};
