'use strict';

function resolveWebCrypto(override) {
  if (override && override.subtle) return override;
  if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.subtle) {
    return globalThis.crypto;
  }
  try {
    // Node harness/tests: prefer webcrypto so the same API works in both worlds.
    const nodeCrypto = require('node:crypto');
    if (nodeCrypto.webcrypto && nodeCrypto.webcrypto.subtle) {
      return nodeCrypto.webcrypto;
    }
  } catch {
    // Browser bundle path never has node:crypto; fall through.
  }
  return null;
}

function isHmacAvailable(webCrypto) {
  return Boolean(resolveWebCrypto(webCrypto)?.subtle);
}

function createEphemeralKeyBytes(webCrypto) {
  const cryptoApi = resolveWebCrypto(webCrypto);
  if (cryptoApi && typeof cryptoApi.getRandomValues === 'function') {
    const bytes = new Uint8Array(32);
    cryptoApi.getRandomValues(bytes);
    return bytes;
  }
  try {
    const nodeCrypto = require('node:crypto');
    return new Uint8Array(nodeCrypto.randomBytes(32));
  } catch {
    return null;
  }
}

function bytesToHex(buffer) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let hex = '';
  for (let i = 0; i < bytes.length; i += 1) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

async function hmacSha256Hex(keyBytes, value, webCrypto) {
  const cryptoApi = resolveWebCrypto(webCrypto);
  if (!cryptoApi?.subtle || !keyBytes) {
    throw new Error('Web Crypto unavailable');
  }
  const key = await cryptoApi.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const encoded = new TextEncoder().encode(String(value));
  const signature = await cryptoApi.subtle.sign('HMAC', key, encoded);
  return bytesToHex(signature);
}

module.exports = {
  resolveWebCrypto,
  isHmacAvailable,
  createEphemeralKeyBytes,
  hmacSha256Hex,
  bytesToHex,
};
