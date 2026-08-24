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
