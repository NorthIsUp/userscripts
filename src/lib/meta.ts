/**
 * Userscript header metadata. Each script exports one as `meta`; the build reads
 * it straight out of the source (never by importing the module, which would run
 * the script's DOM code) and renders the ==UserScript== block from it.
 *
 * Keep it a plain object literal — the build evaluates it in isolation, so it
 * can't reference imports, variables, or anything else in the file.
 */
export type ScriptMeta = {
  name: string;
  version: string;
  description: string;
  match: string[];
  /** @run-at */
  runAt: 'document-start' | 'document-end' | 'document-idle';
  /** Defaults to ["none"]. */
  grant?: string[];
  /** Key in icons.mjs; @icon64 is derived by rescaling. */
  icon?: 'github' | 'graphite' | 'geo' | 'okta';
  /** Defaults to https://github.com/; null omits the directive entirely. */
  namespace?: string | null;
  author?: string;
  require?: string[];
  noframes?: boolean;
};
