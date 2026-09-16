/** The repository these scripts are published from, as "owner/name". */
export const repo = 'NorthIsUp/userscripts';

/**
 * The page where the release-install script wants to know what is installed.
 * Every script gets this as an extra @match so its beacon can run there.
 */
export const RELEASES_MATCH = `https://github.com/${repo}/releases*`;
