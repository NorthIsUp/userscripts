export type PullRequest = {
  owner: string;
  repo: string;
  number: string;
  /** Path of the PR's conversation page, e.g. "/owner/repo/pull/12" */
  base: string;
};

/** The PR the given github.com path belongs to, or null off a PR page. */
export function parsePr(pathname: string = location.pathname): PullRequest | null {
  const m = pathname.match(/^\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
  if (!m) return null;
  return {
    owner: m[1],
    repo: m[2],
    number: m[3],
    base: `/${m[1]}/${m[2]}/pull/${m[3]}`,
  };
}

/** Login of the signed-in user, from the meta tag GitHub still ships. */
export function currentUser(): string | null {
  const meta = document.querySelector<HTMLMetaElement>('meta[name="user-login"]');
  return meta?.content || null;
}

/** What a PR list row says about its own review state, where it says anything. */
export type ReviewDecision = 'approved' | 'other';

// GitHub's PR list states the review decision on the row itself. Two ways in:
// the testid it tags the slot with, and the filter button inside it — matched
// by prefix so a decision we have no name for still counts as stated.
const DECISION = '[data-testid="review-decision-icon"], button[aria-label^="Filter by review:"]';
// "Approved" is the green filled check; "review required" and "changes
// requested" carry their own octicons. Matching the icon rather than the label
// keeps this reading right in a UI that is not in English.
const APPROVED = '.octicon-check-circle-fill, [aria-label$="Approved"]';

/**
 * The review decision GitHub printed on `row`, or null if it printed none.
 *
 * Null is "unknown", never "not approved": the classic list never carried a
 * decision, and the React list drops it for a PR whose base is not the
 * default branch — that slot shows the base branch instead.
 */
export function reviewDecision(row: Element): ReviewDecision | null {
  const slot = row.querySelector(DECISION);
  if (!slot) return null;
  return slot.matches(APPROVED) || slot.querySelector(APPROVED) ? 'approved' : 'other';
}
