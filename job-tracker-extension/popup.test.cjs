const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');
const source = readFileSync(join(__dirname, 'popup.js'), 'utf8');

function popup({ status = 201, failure, extractionFailure = false, tabs = [{ id: 1 }], request } = {}) {
  let click;
  const elements = {
    saveBtn: { disabled: false, addEventListener: (_, handler) => { click = handler; } },
    status: { textContent: '' },
    loginLink: { hidden: true }
  };
  const calls = [];
  vm.runInNewContext(source, {
    document: { getElementById: id => elements[id] },
    chrome: { tabs: {
      query: async () => tabs,
      sendMessage: async () => {
        if (extractionFailure) throw new Error('No receiver');
        return { position: 'Développeur', company: 'Exemple', url: 'https://example.com/job' };
      }
    } },
    AbortSignal,
    fetch: async (url, options) => {
      calls.push({ url, options });
      if (failure) throw failure;
      if (request) return request;
      return { ok: status >= 200 && status < 300, status };
    }
  });
  return { click: () => click(), elements, calls };
}

test('manifest grants localhost API access without injecting a content script there', () => {
  const manifest = JSON.parse(readFileSync(join(__dirname, 'manifest.json'), 'utf8'));
  assert.ok(manifest.host_permissions.includes('http://localhost/*'));
  assert.ok(!manifest.content_scripts.some(script => script.matches.includes('http://localhost/*')));
});

test('saves an extracted offer with the login session', async () => {
  const p = popup();
  await p.click();
  assert.match(p.elements.status.textContent, /succès/);
  assert.equal(p.calls[0].options.credentials, 'include');
  assert.equal(p.calls[0].url, 'http://localhost:8000/api/applications');
  assert.equal(JSON.parse(p.calls[0].options.body).position, 'Développeur');
  assert.equal(p.elements.saveBtn.disabled, false);
});

for (const [status, message, loginVisible] of [
  [401, /Connecte-toi/, true],
  [422, /incomplètes ou invalides/, false],
  [500, /erreur 500/, false]
]) {
  test(`HTTP ${status} shows actionable feedback`, async () => {
    const p = popup({ status });
    await p.click();
    assert.match(p.elements.status.textContent, message);
    assert.equal(p.elements.loginLink.hidden, !loginVisible);
    assert.equal(p.elements.saveBtn.disabled, false);
  });
}

for (const [failure, message] of [
  [new TypeError('Failed to fetch'), /Impossible de joindre/],
  [Object.assign(new Error('Timeout'), { name: 'TimeoutError' }), /éviter un doublon/]
]) {
  test(`recovers from ${failure.name}`, async () => {
    const p = popup({ failure });
    await p.click();
    assert.match(p.elements.status.textContent, message);
    assert.equal(p.elements.saveBtn.disabled, false);
  });
}

test('missing content script asks to refresh and sends no API request', async () => {
  const p = popup({ extractionFailure: true });
  await p.click();
  assert.match(p.elements.status.textContent, /Actualise/);
  assert.equal(p.calls.length, 0);
  assert.equal(p.elements.saveBtn.disabled, false);
});

test('missing active tab sends no request and allows retry', async () => {
  const p = popup({ tabs: [] });
  await p.click();
  assert.match(p.elements.status.textContent, /Aucun onglet/);
  assert.equal(p.calls.length, 0);
  assert.equal(p.elements.saveBtn.disabled, false);
});

test('ignores repeated clicks while saving', async () => {
  let finish;
  const request = new Promise(resolve => { finish = resolve; });
  const p = popup({ request });
  const first = p.click();
  await p.click();
  finish({ ok: true, status: 201 });
  await first;
  assert.equal(p.calls.length, 1);
  assert.equal(p.elements.saveBtn.disabled, false);
});
