import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import { JSDOM } from 'jsdom';

// The helper only touches the element it is handed, but importing the module
// pulls in `currentUser`, which reads `document` — so give it one first.
const dom = new JSDOM('<!doctype html><html><body></body></html>');
for (const key of ['window', 'document', 'Element'] as const) {
  (globalThis as Record<string, unknown>)[key] =
    key === 'window' ? dom.window : (dom.window as unknown as Record<string, unknown>)[key];
}

type GithubModule = typeof import('./github.ts');
let github: GithubModule;

before(async () => {
  github = await import('./github.ts');
});

/** A PR list row, as GitHub's React list writes one. */
function row(decision: string): Element {
  const li = dom.window.document.createElement('li');
  li.innerHTML = `
    <h3><a data-testid="listitem-title-link" href="/o/r/pull/1">Title</a></h3>
    <div class="Description-module__container">
      <a data-testid="author-filter-link" aria-label="Filter by author NorthIsUp">NorthIsUp</a>
      ${decision}
    </div>`;
  return li;
}

const APPROVED = `
  <span data-testid="review-decision-icon">
    <button aria-label="Filter by review: Approved">
      <svg class="octicon octicon-check-circle-fill color-fg-success"></svg>
    </button>
  </span>`;

const REQUIRED = `
  <span data-testid="review-decision-icon">
    <button aria-label="Filter by review: Review required">
      <svg class="octicon octicon-no-entry-fill color-fg-attention"></svg>
    </button>
  </span>`;

// A PR whose base is not the default branch: GitHub prints the base branch
// where the decision would have gone, so the row states nothing at all.
const BASE_BRANCH = '<span>To <span class="commit-ref"><a href="/o/r/tree/x">x</a></span></span>';

describe('reviewDecision', () => {
  it('reads an approved row', () => {
    assert.equal(github.reviewDecision(row(APPROVED)), 'approved');
  });

  it('reads a row that is not approved yet', () => {
    assert.equal(github.reviewDecision(row(REQUIRED)), 'other');
  });

  it('returns null when the row states no decision', () => {
    // Unknown, not "not approved" — the caller has to go and ask GitHub.
    assert.equal(github.reviewDecision(row(BASE_BRANCH)), null);
    assert.equal(github.reviewDecision(row('')), null);
  });

  it('still reads the decision without the octicon class', () => {
    // The label carries it too, so a change to either hook alone is survivable.
    const bare = '<button aria-label="Filter by review: Approved"><svg></svg></button>';
    assert.equal(github.reviewDecision(row(bare)), 'approved');
  });

  it('does not mistake a non-approval label for an approval', () => {
    const bare = '<button aria-label="Filter by review: Changes requested"><svg></svg></button>';
    assert.equal(github.reviewDecision(row(bare)), 'other');
  });
});
