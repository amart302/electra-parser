const assert = require('node:assert/strict');
const { test } = require('node:test');
require('ts-node/register');
require('tsconfig-paths/register');
// No database connection is needed to exercise the writer with a transaction double.
const prismaPath = require.resolve('../src/prisma/prisma.service.ts');
require.cache[prismaPath] = {
  id: prismaPath, filename: prismaPath, loaded: true,
  exports: { PrismaService: class {} },
};
const { CatalogStorageService } = require('../src/parser/catalog-storage.service.ts');

function fixture() {
  let state = { products: [], attributes: [], values: [] };
  let failWrite = false;
  const tx = {
    product: {
      upsert: async ({ where, create, update }) => {
        let product = state.products.find(p => p.sourceUrl === where.sourceUrl);
        if (product) Object.assign(product, update);
        else {
          product = { id: state.products.length + 1, price: null, ...create };
          state.products.push(product);
        }
        return product;
      },
    },
    attribute: {
      findUnique: async ({ where }) => state.attributes.find(a => a.key === where.key) ?? null,
      update: async ({ where, data }) => Object.assign(state.attributes.find(a => a.id === where.id), data),
      upsert: async ({ where, create }) => {
        let attribute = state.attributes.find(a => a.key === where.key);
        if (!attribute) {
          attribute = { id: state.attributes.length + 1, ...create };
          state.attributes.push(attribute);
        }
        return attribute;
      },
    },
    productAttribute: {
      deleteMany: async ({ where }) => {
        state.values = state.values.filter(v => v.productId !== where.productId);
      },
      createMany: async ({ data }) => {
        if (failWrite) throw new Error('write failed');
        state.values.push(...data);
      },
    },
  };
  const prisma = {
    subcategory: { findUnique: async () => ({ categoryId: 1 }) },
    $transaction: async (callback) => {
      const snapshot = structuredClone(state);
      try { return await callback(tx); }
      catch (error) { state = snapshot; throw error; }
    },
  };
  return {
    service: new CatalogStorageService(prisma),
    state: () => state,
    fail: () => { failWrite = true; },
  };
}
const number = value => ({ key: 'voltageV', name: 'Напряжение, В', type: 'NUMBER', unit: 'V', value });
const product = attributes => ({ name: ' Светильник ', sourceUrl: 'https://example.com/product#photo', imageUrls: [], attributes });

test('writes one typed value, reuses definitions and replaces old values without resetting price', async () => {
  const f = fixture();
  await f.service.upsertProduct(product([
    number(220),
    { key: 'hasController', name: 'Наличие контроллера', type: 'BOOLEAN', unit: null, value: false },
  ]), 1);
  assert.equal(f.state().products[0].name, 'Светильник');
  assert.equal(f.state().products[0].sourceUrl, 'https://example.com/product');
  assert.equal('attributes' in f.state().products[0], false);
  f.state().products[0].price = 1500;
  assert.equal(f.state().values[1].booleanValue, false);
  for (const row of f.state().values) {
    assert.equal([row.textValue, row.numberValue, row.booleanValue].filter(v => v !== null).length, 1);
  }
  await f.service.upsertProduct(product([number('220–240 В')]), 1);
  assert.equal(f.state().products.length, 1);
  assert.equal(f.state().attributes.length, 2);
  assert.equal(f.state().values.length, 1);
  assert.equal(f.state().values[0].textValue, '220–240 В');
  assert.equal(f.state().values[0].numberValue, null);
  assert.equal(f.state().products[0].price, 1500);
});

test('rolls back the entire product snapshot if writing values fails', async () => {
  const f = fixture();
  await f.service.upsertProduct(product([number(220)]), 1);
  const before = structuredClone(f.state());
  f.fail();
  await assert.rejects(f.service.upsertProduct({ ...product([number(12)]), name: 'Changed' }, 1), /write failed/);
  assert.deepEqual(f.state(), before);
});

test('rejects duplicate keys, invalid typed values and wrong category before writing', async () => {
  const f = fixture();
  await assert.rejects(f.service.upsertProduct(product([number(1), number(2)]), 1), /Повторная/);
  await assert.rejects(f.service.upsertProduct(product([number(NaN)]), 1), /Недопустимое/);
  await assert.rejects(f.service.upsertProduct(product([number(220)]), 2, 1), /не принадлежит/);
  assert.equal(f.state().products.length, 0);
});

test('renames a legacy key without changing its ID or relationships to other products', async () => {
  const { legacyAttributeKey } = require('../src/parser/utils/parse-attributes.ts');
  const f = fixture();
  const attribute = { key: legacyAttributeKey('Цвет основания'), name: 'Цвет основания', type: 'TEXT', unit: null, value: 'MIX' };
  await f.service.upsertProduct(product([attribute]), 1);
  const id = f.state().attributes[0].id;
  f.state().values.push({ productId: 99, attributeId: id, textValue: 'хром', numberValue: null, booleanValue: null });
  await f.service.upsertProduct(product([{ ...attribute, key: 'baseColor' }]), 1);
  assert.equal(f.state().attributes.length, 1);
  assert.equal(f.state().attributes[0].id, id);
  assert.equal(f.state().attributes[0].key, 'baseColor');
  assert.equal(f.state().values.find(row => row.productId === 99).attributeId, id);
});
