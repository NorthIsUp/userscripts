import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { compareVersions } from './version.ts';

describe('compareVersions', () => {
  it('compares segments as numbers, not text', () => {
    assert.equal(compareVersions('1.10.0', '1.9.0'), 1);
    assert.equal(compareVersions('1.9.0', '1.10.0'), -1);
    assert.equal(compareVersions('4.6.4', '4.6.4'), 0);
  });

  it('treats missing segments as zero', () => {
    assert.equal(compareVersions('1.2', '1.2.0'), 0);
    assert.equal(compareVersions('1.2.1', '1.2'), 1);
  });

  it('falls back to text for segments that are not plain numbers', () => {
    assert.equal(compareVersions('1.0.0-rc1', '1.0.0'), 1);
    assert.equal(compareVersions('1.0.0', '1.0.0-rc1'), -1);
    assert.equal(compareVersions('2.0.0-rc1', '2.0.0-rc2'), -1);
  });
});
