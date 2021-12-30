import { readFileSync } from 'fs';
import { parseCoriolisCode } from '../../src/data/coriolis';

const RANDOM_TESTS = JSON.parse(readFileSync('./tests/data/links.json').toString());

describe('Can import coriolis code', () => {
  for (const { ship, code } of RANDOM_TESTS) {
    test(
      `Can import https://coriolis.io/outfit/${ship}?code=${encodeURIComponent(code)}`,
      () => {
        expect(() => {
          const [_, errors] = parseCoriolisCode(ship, code);
          errors.forEach((err) => console.warn(err.message));
        }).not.toThrow();
      },
    );
  }
});
