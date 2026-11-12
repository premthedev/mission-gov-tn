/** Where the app downloads new content from (public repo, no login, no keys). */
export const REPO = 'premthedev/mission-gov-tn';
export const BRANCH = 'main';
export const CONTENT_BASE = `https://raw.githubusercontent.com/${REPO}/${BRANCH}/content/`;
/** Minimum gap between online content checks. */
export const SYNC_EVERY_MS = 3 * 60 * 60 * 1000;
