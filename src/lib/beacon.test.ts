import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import { JSDOM } from 'jsdom';

const PAGE = '^https:\\/\\/github\\.com\\/NorthIsUp\\/userscripts\\/releases.*$';
const OWN = ['^https:\\/\\/app\\.graphite\\.com\\/.*$'];
const SCRIPT = { name: 'A Script', namespace: 'ns/a', version: '1.2.3' };

type BeaconModule = typeof import('./beacon.ts');
let beacon: BeaconModule;

before(async () => {
  beacon = await import('./beacon.ts');
});

/** A fresh document and location, since announce() reads both as globals. */
function at(url: string) {
  const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', { url });
  const g = globalThis as Record<string, unknown>;
  g.document = dom.window.document;
  g.location = dom.window.location;
  return dom.window.document;
}

const tags = (doc: Document) =>
  [...doc.querySelectorAll<HTMLElement>(`meta[name="${beacon.BEACON_TAG}"]`)].map((t) => ({
    ...t.dataset,
  }));

describe('announce', () => {
  it('leaves one tag on the beacon page, and stops a script that does not belong there', () => {
    const doc = at('https://github.com/NorthIsUp/userscripts/releases');
    assert.equal(beacon.announce(SCRIPT, PAGE, OWN), false);
    assert.deepEqual(tags(doc), [SCRIPT]);
  });

  it('says nothing anywhere else, and lets the script run where it matches', () => {
    const doc = at('https://app.graphite.com/pr/1');
    assert.equal(beacon.announce(SCRIPT, PAGE, OWN), true);
    assert.deepEqual(tags(doc), []);
  });

  it('both announces and runs when the script covers the beacon page itself', () => {
    const doc = at('https://github.com/NorthIsUp/userscripts/releases/tag/v27');
    const own = ['^https:\\/\\/github\\.com\\/.*\\/.*\\/releases.*$'];
    assert.equal(beacon.announce(SCRIPT, PAGE, own), true);
    assert.deepEqual(tags(doc), [SCRIPT]);
  });

  it('ignores the fragment, which is never part of a @match', () => {
    const doc = at('https://github.com/NorthIsUp/userscripts/releases#user-content-x');
    assert.equal(beacon.announce(SCRIPT, PAGE, OWN), false);
    assert.deepEqual(tags(doc), [SCRIPT]);
  });
});
