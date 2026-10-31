const assert = require('node:assert/strict');
const { test } = require('node:test');
require('ts-node/register');
const { parseNumber } = require('../src/parser/utils/parse-number.ts');

test('parses a single value with the expected unit', () => {
  for (const [input, unit, expected] of [
    ['60 Вт', 'W', 60],
    ['6,5 W', 'W', 6.5],
    ['220 В', 'V', 220],
    ['12 V', 'V', 12],
    ['12,5 кв. м.', 'm2', 12.5],
    ['12 м²', 'm2', 12],
    ['12 м2', 'm2', 12],
    ['12 m2', 'm2', 12],
    ['3 шт.', 'count', 3],
    ['1\u00a0200', 'W', 1200],
    ['1\u202f200,5', 'W', 1200.5],
    ['0', 'count', 0],
    ['250', undefined, 250],
  ]) assert.equal(parseNumber(input, unit), expected, input);
});

test('keeps missing values null', () => {
  for (const input of [undefined, null, '', '  ']) {
    assert.equal(parseNumber(input), null);
  }
});

test('rejects ranges, expressions, unexpected units and non-finite values', () => {
  for (const [input, unit] of [
    ['220–240 В', 'V'], ['220-240 В', 'V'], ['2×60 Вт', 'W'],
    ['2*60 Вт', 'W'], ['60/40 Вт', 'W'], ['до 60 Вт', 'W'],
    ['60 В', 'W'], ['IP65', 'count'], ['1.2.3', 'W'],
    ['9'.repeat(400), 'W'],
  ]) assert.throws(() => parseNumber(input, unit), undefined, input);
});
