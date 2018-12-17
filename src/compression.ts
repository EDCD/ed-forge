/**
* @module Compression
*/

/**
* Ignore
*/
import pako from 'pako';

/**
 * Compress an object as json to base64 encoded string.
 * @param json Object to compress
 * @returns Compressed string
 */
export function compress(json: object): string {
  const string = JSON.stringify(json);
  const deflated = pako.deflate(string, { to: 'string' });
  return encodeURIComponent(Buffer.from(deflated).toString('base64'));
}

/**
 * Decompress a base64 encoded string to an object.
 * @param str String to decompress
 * @returns Decompressed json
 */
export function decompress<T extends object>(str: string): T {
  const decoded = Buffer.from(decodeURIComponent(str), 'base64');
  const inflated = pako.inflate(decoded, { to: 'string' });
  return JSON.parse(inflated);
}
