const assert = require('node:assert/strict');
const { test } = require('node:test');
require('ts-node/register');
const { parseLampCount } = require('../src/parser/utils/parse-lamp-count.ts');

test('parses individual counts and sums of lamp groups', () => {
  for (const [input, expected] of [
    ['8+5', 13], ['8 + 5 + 3', 16], ['8+5 шт.', 13],
    ['5', 5], ['5 шт.', 5], ['0', 0], [null, null], ['', null],
  ]) assert.equal(parseLampCount(input), expected);
});

test('rejects ambiguous expressions, fractions and counts outside the DB range', () => {
  for (const input of ['8×5', '8-5', '8/5', '8++5', '8+5 Вт', '1.5', '-1', '2147483647+1']) {
    assert.throws(() => parseLampCount(input));
  }
});
