const assert = require('node:assert/strict');
const { test } = require('node:test');
require('ts-node/register');
const { parseMaxProductPower } = require('../src/parser/utils/parse-max-product-power.ts');

test('uses the highest alternative rating for maximum product power', () => {
  for (const [input, expected] of [
    ['10/20/30 W', 30], ['30W / 10W / 20W', 30],
    ['3,5/6,5 Вт', 6.5], ['160W', 160], ['0', 0],
    [undefined, null], [null, null], ['', null],
  ]) assert.equal(parseMaxProductPower(input), expected);
});

test('rejects missing ratings, wrong units, sums and multiplication', () => {
  for (const input of ['10//30 W', '/30W', '30W/', '10V/30V', '2×30W', '10+20W', '-10/30W']) {
    assert.throws(() => parseMaxProductPower(input));
  }
});
