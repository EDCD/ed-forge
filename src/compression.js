import pako from 'pako';

/**
 * @param {Object} json
 * @return {string}
 */
export function compress(json) {
  const string = JSON.stringify(json);
  const deflated = pako.deflate(string, { to: 'string' });
  return encodeURIComponent(Buffer.from(deflated).toString('base64'));
}

/**
 * @param {string} compressedBuild
 * @return {object}
 */
export function decompress(compressedBuild) {
  const decoded = Buffer.from(decodeURIComponent(compressedBuild), 'base64');
  const inflated = pako.inflate(decoded, { to: 'string' });
  return JSON.parse(inflated);
}
