const assert = require('node:assert/strict');
const { test } = require('node:test');
require('ts-node').register({ compilerOptions: { types: ['node'] } });
require('tsconfig-paths/register');
const { parseCharacteristics } = require('../src/parser/utils/parse-characteristics.ts');
const { ProductParserService } = require('../src/parser/product-parser.service.ts');
const prismaPath = require.resolve('../src/prisma/prisma.service.ts');
require.cache[prismaPath] = { id: prismaPath, filename: prismaPath, loaded: true, exports: { PrismaService: class {} } };
const { CatalogStorageService } = require('../src/parser/catalog-storage.service.ts');
const parsed = (source) => ({ name: ' Светильник ', sourceUrl: 'https://example.com/product#image', imageUrls: [], ...parseCharacteristics(source) });

test('builds only populated groups and retains rare characteristics', () => {
  const value = parseCharacteristics({
    'Бренд': 'ILLUMICO', 'Высота изделия, мм': '530', 'Диаметр изделия, мм': '710',
    'Количество ламп': '5', 'Максимальная мощность лампы, Вт': '60W',
    'Напряжение, В': '220V', 'Материал плафона': 'металл/стекло',
    'Фасовка': '1/50', 'Упаковка, ширина, см': '12.5',
    'Упаковка, вес, кг': '3.7', 'Упаковка, объем, куб.м': '0.0383',
    'Количество в упаковке': '50', 'Площадь освещения, кв.м.': 'до 30',
    'Цвет основания': 'MIX', 'Степень защиты IP': 'IP44',
  });
  assert.equal(value.brand, 'ILLUMICO');
  assert.deepEqual(value.dimensions, { heightMm: 530, diameterMm: 710 });
  assert.equal(value.electrical.voltageV, 220);
  assert.equal(value.electrical.lampCount, 5);
  assert.equal(value.electrical.ipRating, 'IP44');
  assert.equal(value.appearance.baseColor, 'MIX');
  assert.equal(value.packaging.packaging, '1/50');
  assert.equal(value.packaging.widthCm, 12.5);
  assert.equal(value.packaging.volumeM3, 0.0383);
  assert.equal(value.attributes.find(a => a.key === 'lightingAreaM2').value, 30);
  assert.equal('heightMm' in value, false);
});

test('omits empty groups rather than creating null-filled records', () => {
  assert.deepEqual(parseCharacteristics({ 'Бренд': 'Reluce', 'Высота изделия, мм': ' ' }), { brand: 'Reluce', attributes: [] });
  assert.deepEqual(parseCharacteristics({}), { brand: null, attributes: [] });
  assert.equal(parseCharacteristics({ 'Количество ламп': '0' }).electrical.lampCount, 0);
});

test('keeps composite source expressions and handles invalid numbers without aborting', () => {
  const value = parseCharacteristics({
    'Количество ламп': '8+5', 'Максимальная мощность лампы, Вт': '60W+6W',
    'Максимальная мощность изделия, Вт': '10/20/30 W',
    'Напряжение, В': '220–240 В', 'Высота изделия, мм': '10/20',
    'Наличие контроллера': 'нет', 'Морозоустойчивость': 'неизвестно',
  });
  assert.equal(value.electrical.lampCount, 13);
  assert.equal(value.electrical.maxLampPowerW, 60);
  assert.equal(value.electrical.maxProductPowerW, 30);
  assert.equal('voltageV' in value.electrical, false);
  assert.equal(value.dimensions, undefined);
  for (const [key, expected] of [['lampCount', '8+5'], ['maxLampPowerW', '60W+6W'], ['maxProductPowerW', '10/20/30 W'], ['voltageV', '220–240 В'], ['hasController', false]]) {
    assert.equal(value.attributes.find(a => a.key === key).value, expected);
  }
});

test('preserves numeric values outside column precision as text', () => {
  const value = parseCharacteristics({ 'Высота изделия, мм': '0.001', 'Упаковка, вес, кг': '0.0001' });
  assert.equal(value.dimensions, undefined);
  assert.equal(value.packaging, undefined);
  assert.deepEqual(value.attributes.map(a => a.value), ['0.001', '0.0001']);
});

test('keeps named rare keys and preserves entirely new characteristics', () => {
  const input = { 'Наличие ПДУ': 'да', 'Особенности светильника': 'пример', 'Новый параметр': '1/50' };
  const first = parseCharacteristics(input).attributes;
  assert.equal(first[0].key, 'hasRemoteControl');
  assert.equal(first[1].key, 'features');
  assert.equal(first[2].value, '1/50');
  assert.equal(first[2].key, parseCharacteristics(input).attributes[2].key);
});

function storageFixture() {
  let state = { products: [], attributes: [], values: [], dimensions: [], electrical: [], appearance: [], packaging: [] };
  let fail = false;
  const tx = {
    subcategory: { findUnique: async () => ({ categoryId: 1 }) },
    product: { upsert: async ({ where, create, update }) => {
      let row = state.products.find(p => p.sourceUrl === where.sourceUrl);
      if (!row) { row = { id: state.products.length + 1, price: null, ...create }; state.products.push(row); }
      else Object.assign(row, update);
      return row;
    } },
    attribute: { upsert: async ({ where, create }) => {
      let row = state.attributes.find(a => a.key === where.key);
      if (!row) { row = { id: state.attributes.length + 1, ...create }; state.attributes.push(row); }
      return row;
    } },
    productAttribute: {
      deleteMany: async ({ where }) => { state.values = state.values.filter(v => v.productId !== where.productId); },
      createMany: async ({ data }) => { if (fail) throw new Error('write failure'); state.values.push(...data); },
    },
  };
  for (const name of ['dimensions', 'electrical', 'appearance', 'packaging']) {
    tx['product' + name[0].toUpperCase() + name.slice(1)] = {
      deleteMany: async ({ where }) => { state[name] = state[name].filter(v => v.productId !== where.productId); },
      create: async ({ data }) => { state[name].push(data); },
    };
  }
  const prisma = { $transaction: async callback => {
    const snapshot = structuredClone(state);
    try { return await callback(tx); } catch (error) { state = snapshot; throw error; }
  } };
  return { service: new CatalogStorageService(prisma), state: () => state, fail: () => { fail = true; } };
}

test('updates snapshots atomically, removes stale groups and retains manual prices', async () => {
  const f = storageFixture();
  await f.service.upsertProduct(parsed({ 'Высота изделия, мм': '530', 'Напряжение, В': '220V', 'Фасовка': '1/50', 'Цвет': 'хром' }), 1);
  assert.equal(f.state().products[0].price, null);
  assert.equal('heightMm' in f.state().products[0], false);
  assert.equal(f.state().appearance.length, 0);
  f.state().products[0].price = 1500;
  await f.service.upsertProduct(parsed({ 'Количество ламп': '0', 'Наличие контроллера': 'нет', 'Цвет': 'белый' }), 1);
  assert.equal(f.state().products.length, 1);
  assert.equal(f.state().products[0].price, 1500);
  assert.equal(f.state().dimensions.length, 0);
  assert.equal(f.state().packaging.length, 0);
  assert.equal(f.state().electrical.length, 1);
  assert.equal(f.state().electrical[0].lampCount, 0);
  assert.equal('voltageV' in f.state().electrical[0], false);
  for (const row of f.state().values) assert.equal([row.textValue, row.numberValue, row.booleanValue].filter(v => v !== null).length, 1);
});

test('rolls back groups, values and base product together on a failed write', async () => {
  const f = storageFixture();
  await f.service.upsertProduct(parsed({ 'Высота изделия, мм': '530', 'Цвет': 'хром' }), 1);
  const before = structuredClone(f.state());
  f.fail();
  await assert.rejects(f.service.upsertProduct(parsed({ 'Напряжение, В': '12V', 'Цвет': 'белый' }), 1), /write failure/);
  assert.deepEqual(f.state(), before);
  await assert.rejects(f.service.upsertProduct(parsed({}), 2, 1), /не принадлежит/);
});

test('product parser returns grouped data and all source characteristics', async () => {
  const source = { 'Высота изделия, мм': '530', 'Фасовка': '1/50', 'Особенности светильника': 'пример' };
  const page = {
    goto: async () => ({ ok: () => true }), waitForSelector: async () => {},
    $eval: async () => ' Светильник ',
    $$eval: async (selector, callback) => selector === 'tr' ? callback(Object.entries(source).map(([key, value]) => ({ querySelector: tag => ({ textContent: tag === 'th' ? key : value }) }))) : ['https://example.com/image.jpg'],
  };
  const service = new ProductParserService({ getPage: () => page });
  const result = await service.getProductData('https://example.com/product');
  assert.equal(result.name, 'Светильник');
  assert.deepEqual(result.dimensions, { heightMm: 530 });
  assert.equal(result.packaging.packaging, '1/50');
  assert.equal(result.attributes[0].key, 'features');
});
