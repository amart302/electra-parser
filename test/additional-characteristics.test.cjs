const assert = require('node:assert/strict');
const { test } = require('node:test');
require('ts-node/register');
require('tsconfig-paths/register');
const { ProductParserService } = require('../src/parser/product-parser.service.ts');

function fixture(characteristics) {
  const warnings = [];
  const page = {
    goto: async () => ({ ok: () => true }),
    waitForSelector: async () => {},
    $eval: async () => 'Светильник',
    $$eval: async (selector, callback) => {
      if (selector !== 'tr') return ['https://example.com/image.jpg'];
      return callback(Object.entries(characteristics).map(([key, value]) => ({
        querySelector: (tag) => ({ textContent: tag === 'th' ? key : value }),
      })));
    },
  };
  const service = new ProductParserService({ navigate: async () => ({ page, response: { ok: () => true } }) });
  service.logger.warn = (message) => warnings.push(message);
  return { service, warnings };
}


function byKey(product, key) {
  return product.attributes.find(attribute => attribute.key === key);
}

test('parses known values and creates stable definitions for unknown characteristics', async () => {
  const { service, warnings } = fixture({
    'Напряжение, В': '220V', 'Фасовка': '1/50',
    'Площадь освещения, кв.м.': 'до 30', 'Цвет основания': 'MIX',
  });
  const first = await service.getProductData('https://example.com/first');
  const second = await service.getProductData('https://example.com/second');
  assert.equal(byKey(first, 'voltageV').value, 220);
  assert.equal(byKey(first, 'voltageV').unit, 'V');
  assert.equal(byKey(first, 'packaging').value, '1/50');
  assert.equal(byKey(first, 'lightingAreaM2').value, 30);
  const unknown = first.attributes.find(a => a.name === 'Цвет основания');
  assert.equal(unknown.value, 'MIX');
  assert.equal(unknown.type, 'TEXT');
  assert.equal(second.attributes.find(a => a.name === unknown.name).key, unknown.key);
  assert.deepEqual(warnings, []);
  assert.equal('additionalCharacteristics' in first, false);
  assert.equal('voltageV' in first, false);
});

test('keeps composite values as text and sums lamp groups', async () => {
  const { service, warnings } = fixture({
    'Количество ламп': '8+5',
    'Максимальная мощность лампы, Вт': '60W+6W',
    'Максимальная мощность изделия, Вт': '10/20/30 W',
    'Напряжение, В': '220–240 В',
    'Наличие контроллера': 'неизвестно',
  });
  const product = await service.getProductData('https://example.com/product');
  assert.equal(byKey(product, 'lampCount').value, 13);
  assert.equal(byKey(product, 'maxLampPowerW').value, '60W+6W');
  assert.equal(byKey(product, 'maxProductPowerW').value, '10/20/30 W');
  assert.equal(byKey(product, 'voltageV').value, '220–240 В');
  assert.equal(byKey(product, 'hasController').value, 'неизвестно');
  assert.equal(warnings.length, 4);
  await service.getProductData('https://example.com/again');
  assert.equal(warnings.length, 4);
});

test('omits missing attributes and preserves false, zero and decimal values', async () => {
  const { service } = fixture({
    'Количество ламп': '0', 'Наличие контроллера': 'нет',
    'Морозоустойчивость': 'ДА', 'Упаковка, объем, куб.м': '0.0383',
    'Упаковка, вес, кг': '3.7', 'Бренд': ' ',
  });
  const product = await service.getProductData('https://example.com/product');
  assert.equal(product.attributes.length, 5);
  assert.equal(byKey(product, 'lampCount').value, 0);
  assert.equal(byKey(product, 'hasController').value, false);
  assert.equal(byKey(product, 'isFrostResistant').value, true);
  assert.equal(byKey(product, 'packageVolumeM3').value, 0.0383);
  assert.equal(byKey(product, 'packageWeightKg').value, 3.7);
});
