import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { beaconIntro, matchToRegExp, ownMatchCovers } from './beacon.mjs';

describe('matchToRegExp', () => {
  it('treats * scheme as http or https and * host as any host', () => {
    const re = matchToRegExp('*://*/*');
    assert.ok(re.test('https://example.com/'));
    assert.ok(re.test('http://example.com/a/b?c'));
    assert.ok(!re.test('ftp://example.com/'));
  });

  it('lets *.host match the host and its subdomains only', () => {
    const re = matchToRegExp('https://*.okta.com/*');
    assert.ok(re.test('https://okta.com/'));
    assert.ok(re.test('https://teamclara.okta.com/login'));
    assert.ok(!re.test('https://okta.com.evil.example/'));
    assert.ok(!re.test('https://notokta.com/'));
  });

  it('keeps ports and expands path wildcards', () => {
    const re = matchToRegExp('http://haproxy.ts.net:8404/*');
    assert.ok(re.test('http://haproxy.ts.net:8404/stats'));
    assert.ok(!re.test('http://haproxy.ts.net/stats'));
    assert.ok(
      matchToRegExp('https://github.com/*/*/pulls*').test('https://github.com/a/b/pulls?q=x'),
    );
    assert.ok(!matchToRegExp('https://github.com/*/*/pull/*').test('https://github.com/a/b/pulls'));
  });

  it('rejects patterns it does not understand', () => {
    assert.throws(() => matchToRegExp('github.com/*'));
  });
});

describe('beaconIntro', () => {
  const def = {
    file: 'x',
    name: 'X',
    namespace: 'https://github.com/NorthIsUp/userscripts/x',
    version: '1.0.0',
    match: ['https://app.graphite.com/*'],
  };

  it('is valid code for the top of an IIFE, and returns off-match', () => {
    const fn = new Function('location', 'document', `${beaconIntro(def)}\nreturn 'ran';`);
    const doc = fakeDocument();
    assert.equal(fn({ href: 'https://github.com/NorthIsUp/userscripts/releases' }, doc), undefined);
    assert.deepEqual(doc.tags, [{ name: 'X', namespace: def.namespace, version: '1.0.0' }]);

    const elsewhere = fakeDocument();
    assert.equal(fn({ href: 'https://app.graphite.com/pr/1' }, elsewhere), 'ran');
    assert.deepEqual(elsewhere.tags, []);
  });

  it('knows when the script already covers the releases page', () => {
    assert.ok(!ownMatchCovers(def, 'https://github.com/NorthIsUp/userscripts/releases'));
    assert.ok(
      ownMatchCovers(
        { match: ['https://github.com/*/*/releases*'] },
        'https://github.com/NorthIsUp/userscripts/releases',
      ),
    );
  });
});

function fakeDocument() {
  const tags = [];
  const head = { appendChild: (tag) => tags.push({ ...tag.dataset }) };
  return {
    tags,
    head,
    documentElement: head,
    createElement: () => ({ dataset: {} }),
    addEventListener: () => {},
  };
}
