import * as ed from '@noble/ed25519';

const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export function isValidPubkeyFormat(pubkey) {
  return typeof pubkey === 'string' && /^[0-9a-f]{64}$/.test(pubkey);
}

export async function verifyPost({ pubkey, content, timestamp, signature }) {
  if (!isValidPubkeyFormat(pubkey)) throw new Error('Invalid pubkey format');
  if (typeof signature !== 'string' || !/^[0-9a-f]{128}$/.test(signature)) {
    throw new Error('Invalid signature format');
  }
  if (typeof timestamp !== 'number' || !Number.isInteger(timestamp)) {
    throw new Error('Timestamp must be an integer');
  }
  if (Math.abs(Date.now() - timestamp) > MAX_CLOCK_SKEW_MS) {
    throw new Error('Timestamp expired (replay protection)');
  }

  const message = new TextEncoder().encode(`${timestamp}:${content}`);
  const valid = await ed.verifyAsync(hexToBytes(signature), message, hexToBytes(pubkey));
  if (!valid) throw new Error('Invalid signature');
}
