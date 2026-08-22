/**
 * Stopwords list for Instagram UI buttons, navigation items, Meta export headers,
 * table/CSV headers, date words, months (IT/EN), weekdays (IT/EN), and time tokens.
 */
const INSTAGRAM_STOPWORDS = new Set<string>([
  // Italian UI / Action Words
  'segui',
  'seguiti',
  'segua',
  'seguire',
  'follower',
  'followers',
  'following',
  'messaggio',
  'messaggi',
  'invia',
  'rimuovi',
  'rimosso',
  'elimina',
  'cancella',
  'modifica',
  'profilo',
  'profili',
  'post',
  'postato',
  'storia',
  'storie',
  'reels',
  'reel',
  'home',
  'esplora',
  'cerca',
  'chiudi',
  'cerca...',
  'verificato',
  'suggeriti',
  'suggerito',
  'suggerimenti',
  'suggerimento',
  'suggerisci',
  'attivo',
  'attiva',
  'attivi',
  'disattiva',
  'notifiche',
  'impostazioni',
  'condividi',
  'visualizza',
  'guarda',
  'informazioni',
  'altro',
  'altri',
  'crea',
  'diretta',
  'dirette',
  'salvati',
  'salvato',
  'mi_piace',
  'commenti',
  'commenta',
  'rispondi',
  'account',
  'iscritto',
  'iscrizione',
  'abbonati',
  'abbonamento',
  'principale',
  'generale',
  'richieste',
  'data',
  'date',
  'ora',
  'stato',
  'azione',
  'azioni',
  'utente',
  'utenti',
  'nome',
  'nomi',

  // English UI / Action Words
  'follow',
  'follows',
  'followed',
  'unfollow',
  'message',
  'messages',
  'send',
  'remove',
  'removed',
  'delete',
  'deleted',
  'edit',
  'profile',
  'profiles',
  'posts',
  'story',
  'stories',
  'explore',
  'search',
  'close',
  'verified',
  'suggested',
  'suggestions',
  'suggestion',
  'suggest',
  'active',
  'notifications',
  'settings',
  'share',
  'view',
  'watch',
  'info',
  'information',
  'more',
  'create',
  'live',
  'saved',
  'likes',
  'like',
  'comments',
  'comment',
  'reply',
  'accounts',
  'subscribe',
  'subscription',
  'primary',
  'general',
  'requests',
  'mutual',
  'mutuals',
  'threads',
  'thread',
  'meta',
  'instagram',
  'ig',
  'direct',

  // Common Table & Meta Export Headers
  'username',
  'usernames',
  'user',
  'users',
  'status',
  'time',
  'timestamp',
  'timestamps',
  'href',
  'url',
  'urls',
  'media_list_data',
  'string_list_data',
  'relationships_following',
  'title',
  'titles',
  'value',
  'values',
  'action',
  'actions',
  'row',
  'rows',
  'column',
  'columns',
  'index',
  'id',
  'ids',
  'type',
  'types',

  // Italian Months & Abbreviations
  'gennaio',
  'febbraio',
  'marzo',
  'aprile',
  'maggio',
  'giugno',
  'luglio',
  'agosto',
  'settembre',
  'ottobre',
  'novembre',
  'dicembre',
  'gen',
  'feb',
  'mar',
  'apr',
  'mag',
  'giu',
  'lug',
  'ago',
  'set',
  'ott',
  'nov',
  'dic',

  // English Months & Abbreviations
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
  'jan',
  'feb',
  'mar',
  'apr',
  'jun',
  'jul',
  'aug',
  'sep',
  'sept',
  'oct',
  'nov',
  'dec',

  // Italian & English Weekdays
  'lunedi',
  'martedi',
  'mercoledi',
  'giovedi',
  'venerdi',
  'sabato',
  'domenica',
  'lun',
  'mar',
  'mer',
  'gio',
  'ven',
  'sab',
  'dom',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
  'mon',
  'tue',
  'wed',
  'thu',
  'fri',
  'sat',
  'sun',

  // Relative Time & Date Tokens
  'ieri',
  'oggi',
  'domani',
  'yesterday',
  'today',
  'tomorrow',
  'ora',
  'ore',
  'hours',
  'hour',
  'minuti',
  'minuto',
  'minutes',
  'minute',
  'min',
  'secondi',
  'secondo',
  'seconds',
  'second',
  'sec',
  'giorni',
  'giorno',
  'days',
  'day',
  'settimane',
  'settimana',
  'weeks',
  'week',
  'mesi',
  'mese',
  'months',
  'month',
  'anni',
  'anno',
  'years',
  'year',
  'am',
  'pm',
  'utc',
  'gmt',
  'cet',
  'cest',
  'null',
  'undefined',
  'true',
  'false',

  // Italian Prepositions, Conjunctions, and UI Words
  'fa',
  'alle',
  'al',
  'allo',
  'alla',
  'ai',
  'agli',
  'del',
  'dello',
  'della',
  'dei',
  'degli',
  'delle',
  'nel',
  'nello',
  'nella',
  'nei',
  'negli',
  'nelle',
  'sul',
  'sullo',
  'sulla',
  'sui',
  'sugli',
  'sulle',
  'per',
  'te',
  'me',
  'gia',
  'tutti',
  'tutte',
  'tutto',
  'mostra',
  'nascondi',
  'carica',
  'piace',
  'salva',
  'salvate',
  'condivisi',
  'condiviso',
  'condivisa',
  'risposta',
  'risposte',
  'inviati',
  'inviato',
  'inviata',
  'visualizzazioni',
  'visualizzazione',
  'postati',
  'ultimo',
  'ultima',
  'ultimi',
  'ultime',
  'prima',
  'dopo',
  'poi',

  // English UI, Prepositions, and Footer Words
  'at',
  'of',
  'and',
  'the',
  'to',
  'by',
  'for',
  'with',
  'from',
  'you',
  'your',
  'list',
  'lists',
  'platforms',
  'copyright',
  'rights',
  'reserved',
  'privacy',
  'terms',
  'cookies',
  'help',
  'about',
  'legal',
  'contact',
  'inc',
  'corp',
  'llc',
  'ltd',
  'all',
  'new',
  'old',
  'top',
  'bottom',
  'back',
  'next',
  'previous',
  'prev',

  // Instagram URL Route Prefixes
  'p',
  'tv',
]);

/**
 * Validates whether a given string is a valid Instagram username.
 * Instagram rules:
 * - 1 to 30 characters
 * - Only alphanumeric characters, periods (.), and underscores (_)
 * - Cannot start or end with a period
 * - Cannot have consecutive periods (..)
 * - Cannot be purely numeric (avoids timestamps, years, and day numbers)
 * - Cannot be a known UI stopword / date token / table header
 */
export function isValidInstagramUsername(candidate: string): boolean {
  if (!candidate || typeof candidate !== 'string') return false;
  const lower = candidate.trim().toLowerCase();

  if (lower.length < 1 || lower.length > 30) return false;
  if (lower.startsWith('.') || lower.endsWith('.')) return false;
  if (lower.includes('..')) return false;

  // Instagram allowed characters: [a-z0-9._]
  const usernameRegex = /^[a-z0-9._]{1,30}$/;
  if (!usernameRegex.test(lower)) return false;

  // Exclude purely numeric tokens (timestamps, years like 2026, day numbers like 18)
  if (/^\d+$/.test(lower)) return false;

  // Exclude known UI stopwords, export headers, and date labels
  if (INSTAGRAM_STOPWORDS.has(lower)) return false;

  return true;
}

/**
 * Extracts and normalizes an Instagram username from a candidate token,
 * which may be a raw handle, `@handle`, URL (`https://instagram.com/user`), or formatted string.
 */
export function sanitizeUsername(token: string): string | null {
  if (!token || typeof token !== 'string') return null;

  let cleaned = token.trim();

  // Iteratively strip surrounding quotes, brackets, parentheses, and leading '@'
  let prev = '';
  while (prev !== cleaned) {
    prev = cleaned;
    // Strip leading and trailing quotes, brackets, angle brackets, parentheses
    cleaned = cleaned.replace(/^["'([{<«“‘]+|["')\]}>»”’]+$/g, '').trim();
    // Strip leading '@'
    if (cleaned.startsWith('@')) {
      cleaned = cleaned.substring(1).trim();
    }
  }

  // If token is a URL (e.g., https://www.instagram.com/johndoe/?hl=it or instagram.com/johndoe)
  if (cleaned.includes('instagram.com/')) {
    try {
      const match = cleaned.match(/instagram\.com\/([a-zA-Z0-9._]+)/i);
      if (match && match[1]) {
        cleaned = match[1];
      }
    } catch {
      // Fallback if regex match fails
    }
  }

  // Remove query parameters, fragments, and leading/trailing slashes
  cleaned = cleaned.split('?')[0].split('#')[0].replace(/^\/+|\/+$/g, '');

  const lower = cleaned.toLowerCase();
  return isValidInstagramUsername(lower) ? lower : null;
}

/**
 * Recursively traverses a JSON object or array to discover Instagram usernames
 * within official Meta exports (string_list_data, relationships_following, href, value, etc.).
 */
function traverseJsonForUsernames(node: unknown, resultSet: Set<string>): void {
  if (!node) return;

  if (typeof node === 'string') {
    const sanitized = sanitizeUsername(node);
    if (sanitized) resultSet.add(sanitized);
    return;
  }

  if (Array.isArray(node)) {
    for (const item of node) {
      traverseJsonForUsernames(item, resultSet);
    }
    return;
  }

  if (typeof node === 'object') {
    const obj = node as Record<string, unknown>;

    // Handle Meta JSON structure: { "value": "username" }
    if (typeof obj.value === 'string') {
      const sanitized = sanitizeUsername(obj.value);
      if (sanitized) resultSet.add(sanitized);
    }

    // Handle Meta JSON structure: { "href": "https://www.instagram.com/username" }
    if (typeof obj.href === 'string') {
      const sanitized = sanitizeUsername(obj.href);
      if (sanitized) resultSet.add(sanitized);
    }

    // Handle Meta JSON structure: { "title": "username" }
    if (typeof obj.title === 'string' && obj.title.trim()) {
      const sanitized = sanitizeUsername(obj.title);
      if (sanitized) resultSet.add(sanitized);
    }

    // Handle generic keys: username, user, handle
    for (const key of ['username', 'user', 'handle', 'account_name', 'name']) {
      if (typeof obj[key] === 'string') {
        const sanitized = sanitizeUsername(obj[key] as string);
        if (sanitized) resultSet.add(sanitized);
      }
    }

    // Recursively check all other values
    for (const val of Object.values(obj)) {
      if (typeof val === 'object' && val !== null) {
        traverseJsonForUsernames(val, resultSet);
      }
    }
  }
}

/**
 * Parses raw text, JSON, HTML, CSV, or pasted strings into a deduplicated list of valid Instagram usernames.
 */
export function parseInstagramText(rawText: string): string[] {
  if (!rawText || !rawText.trim()) {
    return [];
  }

  const trimmed = rawText.trim();
  const resultSet = new Set<string>();

  // 1. Try parsing as JSON first (Official Meta Export: followers_1.json, following.json)
  if (
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))
  ) {
    try {
      const parsedJson = JSON.parse(trimmed);
      traverseJsonForUsernames(parsedJson, resultSet);
      if (resultSet.size > 0) {
        return Array.from(resultSet);
      }
    } catch {
      // Not valid JSON, continue with text / HTML / CSV parsing
    }
  }

  // 2. Parse HTML anchors / href links if HTML tags exist
  let textToProcess = rawText;
  if (rawText.includes('<') && rawText.includes('>')) {
    // Match full href attribute values e.g. href="https://www.instagram.com/leomessi/?hl=it"
    const hrefRegex = /href=["']([^"']+)["']/gi;
    let match: RegExpExecArray | null;
    while ((match = hrefRegex.exec(rawText)) !== null) {
      if (match[1]) {
        const sanitized = sanitizeUsername(match[1]);
        if (sanitized) {
          resultSet.add(sanitized);
        }
      }
    }

    // Strip entire <a>...</a> blocks to prevent anchor display names (e.g. "Leo Messi")
    // from leaking into sub-token parsing as phantom usernames
    textToProcess = textToProcess.replace(/<a\b[^>]*>[\s\S]*?<\/a>/gi, '\n');
    // Strip all remaining HTML tags
    textToProcess = textToProcess.replace(/<[^>]*>?/gm, '\n');
  }

  // 3. Tokenize by newlines, commas, semicolons, tabs, and pipes (supports CSV/TSV)
  const linesAndDelimiters = textToProcess.split(/[\r\n,;\t|]+/);

  for (const chunk of linesAndDelimiters) {
    const cleanChunk = chunk.trim();
    if (!cleanChunk) continue;

    // First attempt whole chunk sanitize
    const candidate = sanitizeUsername(cleanChunk);
    if (candidate) {
      resultSet.add(candidate);
      continue;
    }

    // If chunk contains spaces (e.g. "podstract ago 18, 2026"), check sub-tokens
    const tokens = cleanChunk.split(/\s+/);
    for (const token of tokens) {
      const subCandidate = sanitizeUsername(token);
      if (subCandidate) {
        resultSet.add(subCandidate);
      }
    }
  }

  return Array.from(resultSet);
}

/**
 * Statistical analysis summary calculation.
 */
export interface AnalysisStats {
  followingCount: number;
  followersCount: number;
  unfollowers: string[];
  fans: string[];
  mutuals: string[];
  followBackRatio: number;
}

export function computeAnalysis(
  followingList: string[],
  followersList: string[]
): AnalysisStats {
  const followingSet = new Set(followingList);
  const followersSet = new Set(followersList);

  // Unfollowers: Accounts you follow who do NOT follow you back (Following \ Followers)
  const unfollowers = followingList.filter((user) => !followersSet.has(user));

  // Fans: Accounts who follow you, but you do NOT follow back (Followers \ Following)
  const fans = followersList.filter((user) => !followingSet.has(user));

  // Mutuals: Accounts where both follow each other (Followers ∩ Following)
  const mutuals = followingList.filter((user) => followersSet.has(user));

  // Follow-back percentage: Percentage of your following who follow you back
  const followBackRatio =
    followingList.length > 0
      ? Math.round((mutuals.length / followingList.length) * 100)
      : 0;

  return {
    followingCount: followingList.length,
    followersCount: followersList.length,
    unfollowers,
    fans,
    mutuals,
    followBackRatio,
  };
}

/**
 * Helper to copy text to clipboard with browser fallback.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch {
    return false;
  }
}

/**
 * Triggers a client-side download for text/csv/json files.
 */
export function downloadFile(
  content: string,
  fileName: string,
  contentType: string
): void {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

/**
 * Export helpers for TXT, CSV, and JSON
 */
export function exportToTxt(usernames: string[], filename = 'instasniff-list.txt'): void {
  const text = usernames.join('\n');
  downloadFile(text, filename, 'text/plain;charset=utf-8');
}

export function exportToCsv(usernames: string[], filename = 'instasniff-list.csv'): void {
  const csvHeader = 'username,instagram_url\n';
  const csvRows = usernames
    .map((u) => `"${u}","https://www.instagram.com/${u}/"`)
    .join('\n');
  downloadFile(csvHeader + csvRows, filename, 'text/csv;charset=utf-8');
}

export function exportToJson(
  data: Record<string, unknown> | string[],
  filename = 'instasniff-export.json'
): void {
  const json = JSON.stringify(data, null, 2);
  downloadFile(json, filename, 'application/json;charset=utf-8');
}
