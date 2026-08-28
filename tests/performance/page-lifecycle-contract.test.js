const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const productionPages = [
  'mcu-management/index.html',
  ...fs.readdirSync(path.join(root, 'mcu-management/pages'))
    .filter(file => file.endsWith('.html') && !file.startsWith('test-'))
    .map(file => `mcu-management/pages/${file}`)
];

test('every production page exposes an immediate lifecycle shell', () => {
  productionPages.forEach(file => {
    const html = read(file);
    assert.match(html, /<body[^>]*data-page-id="[^"]+"/, `${file}: page id`);
    assert.match(html, /data-lifecycle-region="main"/, `${file}: main region`);
    assert.doesNotMatch(html, /body\s*{[^}]*opacity:\s*0/s, `${file}: hidden body`);
  });
});

test('shared lifecycle supports explicit region states and retry', async () => {
  const source = read('mcu-management/js/utils/pageLifecycleManager.js');
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
  const { createPageLifecycle } = await import(moduleUrl);
  const attributes = new Map();
  const element = {
    setAttribute(name, value) { attributes.set(name, value); },
    removeAttribute(name) { attributes.delete(name); },
    querySelector() { return null; }
  };
  const lifecycle = createPageLifecycle('test-page', {
    dispatch() {},
    setTimer: () => 1,
    clearTimer() {}
  });

  lifecycle.registerRegion('main', element);
  lifecycle.setLoading('main');
  assert.equal(attributes.get('data-lifecycle-state'), 'loading');
  lifecycle.setEmpty('main');
  assert.equal(attributes.get('data-lifecycle-state'), 'empty');
  lifecycle.setError('main', new Error('boom'), () => {});
  assert.equal(attributes.get('data-lifecycle-state'), 'error');
  lifecycle.setReady('main');
  assert.equal(attributes.get('data-lifecycle-state'), 'ready');
  lifecycle.destroy();
});

test('shared styles render local lifecycle feedback without covering the page', () => {
  const styles = read('mcu-management/css/sidebar.css');
  assert.match(styles, /\[data-lifecycle-state="loading"\]/);
  assert.match(styles, /\.lifecycle-error/);
  assert.match(styles, /\.lifecycle-retry/);
  assert.match(styles, /prefers-reduced-motion:\s*reduce/);
  assert.doesNotMatch(styles, /\.navigation-startup-overlay[\s\S]{0,300}height:\s*100%/);
});
