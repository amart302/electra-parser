const assert = require('node:assert/strict');
const { test } = require('node:test');
require('ts-node/register');
const { parseMaxLampPower } = require('../src/parser/utils/parse-max-lamp-power.ts');

test('uses the highest per-lamp rating rather than adding different lamp groups', () => {
  for (const [input, expected] of [
    ['60W+6W', 60], ['6 Вт + 60 Вт', 60], ['60+6 W', 60],
    ['6,5W+3W', 6.5], ['60W', 60], ['60', 60],
    [null, null], ['', null],
  ]) assert.equal(parseMaxLampPower(input), expected);
});

test('rejects malformed groups and other ambiguous expressions', () => {
  for (const input of ['60W+', '+6W', '60W++6W', '2×60W', '10/20/30 W', '-6W', '60V+6W']) {
    assert.throws(() => parseMaxLampPower(input));
  }
});
