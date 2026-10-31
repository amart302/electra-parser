const assert = require('node:assert/strict');
const { test } = require('node:test');
require('ts-node/register');
const { BrowserService } = require('../src/browser/browser.service.ts');

function service() {
  const instance = new BrowserService();
  instance.logger.warn = () => {};
  return instance;
}

test('recreates the page and retries the same URL after a detached frame', async () => {
  const browser = service();
  const visited = [];
  let closed = false;
  let configured = false;
  const response = { ok: () => true };
  const replacement = {
    isClosed: () => false,
    setViewport: async () => { configured = true; },
    setDefaultTimeout: value => assert.equal(value, 30000),
    setDefaultNavigationTimeout: value => assert.equal(value, 60000),
    goto: async (url) => { visited.push(url); return response; },
  };
  browser.page = {
    isClosed: () => false,
    close: async () => { closed = true; },
    goto: async (url) => { visited.push(url); throw new Error('Navigating frame was detached'); },
  };
  browser.browser = { connected: true, newPage: async () => replacement };
  const result = await browser.navigate('https://example.com/catalog?page=2');
  assert.equal(result.page, replacement);
  assert.equal(result.response, response);
  assert.equal(browser.getPage(), replacement);
  assert.equal(closed, true);
  assert.equal(configured, true);
  assert.deepEqual(visited, Array(2).fill('https://example.com/catalog?page=2'));
});

test('stops after three navigation attempts with URL and original cause', async () => {
  const browser = service();
  let attempts = 0;
  let restores = 0;
  const failure = new Error('Navigating frame was detached');
  browser.page = { isClosed: () => false, goto: async () => { attempts++; throw failure; } };
  browser.restorePage = async () => { restores++; };
  await assert.rejects(browser.navigate('https://example.com/failing'), error => {
    assert.equal(error.cause, failure);
    assert.match(error.message, /https:\/\/example.com\/failing/);
    return true;
  });
  assert.equal(attempts, 3);
  assert.equal(restores, 2);
});

test('does not retry unrelated failures or HTTP errors', async () => {
  const browser = service();
  browser.restorePage = async () => assert.fail('unexpected page restore');
  const failure = new Error('net::ERR_NAME_NOT_RESOLVED');
  browser.page = { isClosed: () => false, goto: async () => { throw failure; } };
  await assert.rejects(browser.navigate('https://example.com'), error => error.cause === failure);
  const response = { ok: () => false, status: () => 404 };
  browser.page.goto = async () => response;
  assert.equal((await browser.navigate('https://example.com/missing')).response, response);
});
