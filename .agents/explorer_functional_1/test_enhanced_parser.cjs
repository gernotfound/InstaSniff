// Prototype of robust Instagram parser
function extractInstagramUsernames(rawText) {
  if (!rawText || typeof rawText !== 'string') return [];

  const trimmed = rawText.trim();
  if (!trimmed) return [];

  const usernames = new Set();

  // 1. Try parsing as JSON first
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      const parsed = JSON.parse(trimmed);
      extractFromJson(parsed, usernames);
      if (usernames.size > 0) {
        return Array.from(usernames);
      }
    } catch (e) {
      // Not valid JSON, continue with text/html parsing
    }
  }

  // 2. Try parsing as HTML if tags are present
  if (/<[a-z][\s\S]*>/i.test(rawText)) {
    extractFromHtml(rawText, usernames);
    if (usernames.size > 0) {
      return Array.from(usernames);
    }
  }

  // 3. Fallback: Parse line-by-line / token-by-token
  extractFromPlainText(rawText, usernames);

  return Array.from(usernames);
}

const STOP_WORDS = new Set([
  'instagram', 'meta', 'threads', 'facebook', 'followers', 'following', 'follower', 'seguiti', 'segui',
  'seguire', 'segui_gia', 'messaggio', 'messaggi', 'message', 'messages', 'remove', 'rimuovi',
  'verified', 'verificato', 'profile', 'profilo', 'home', 'search', 'cerca', 'explore', 'esplora',
  'reels', 'reel', 'posts', 'post', 'tagged', 'tag', 'stories', 'storie', 'settings', 'impostazioni',
  'help', 'aiuto', 'privacy', 'terms', 'condizioni', 'info', 'informazioni', 'notifications',
  'notifiche', 'activity', 'attivita', 'active', 'attivo', 'today', 'oggi', 'yesterday', 'ieri',
  'am', 'pm', 'jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
  'gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic',
  'lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun',
  'suggested', 'suggeriti', 'close', 'chiudi', 'cancel', 'annulla', 'share', 'condividi', 'edit',
  'modifica', 'bio', 'link', 'audio', 'music', 'musica', 'saved', 'salvati', 'direct', 'inbox'
]);

function isValidUsername(str) {
  if (!str || typeof str !== 'string') return false;
  const clean = str.trim().toLowerCase();
  if (clean.length < 1 || clean.length > 30) return false;
  if (!/^[a-z0-9._]+$/.test(clean)) return false;
  if (clean.startsWith('.') || clean.endsWith('.')) return false;
  if (clean.includes('..')) return false;
  if (/^\d+$/.test(clean)) return false; // purely numbers are almost always dates/years/timestamps
  if (STOP_WORDS.has(clean)) return false;
  return true;
}

function cleanUsernameCandidate(candidate) {
  let s = candidate.trim();
  // Remove leading @
  if (s.startsWith('@')) s = s.slice(1);
  // Remove query params or hash if URL
  s = s.split('?')[0].split('#')[0];
  // Match URL pattern
  const urlMatch = s.match(/(?:https?:\/\/)?(?:www\.)?instagram\.com\/([a-zA-Z0-9._]+)\/?/i);
  if (urlMatch && urlMatch[1]) {
    s = urlMatch[1];
  }
  // Trim trailing slashes or punctuation
  s = s.replace(/^[/]+|[/]+$/g, '').trim().toLowerCase();
  return s;
}

function extractFromJson(data, usernames) {
  function traverse(obj) {
    if (!obj) return;
    if (typeof obj === 'string') {
      const cleaned = cleanUsernameCandidate(obj);
      if (isValidUsername(cleaned)) usernames.add(cleaned);
      return;
    }
    if (Array.isArray(obj)) {
      for (const item of obj) traverse(item);
      return;
    }
    if (typeof obj === 'object') {
      // Instagram specific fields: "value", "title", "href"
      if (obj.value && typeof obj.value === 'string') {
        const cleaned = cleanUsernameCandidate(obj.value);
        if (isValidUsername(cleaned)) usernames.add(cleaned);
      }
      if (obj.title && typeof obj.title === 'string' && obj.title.trim()) {
        const cleaned = cleanUsernameCandidate(obj.title);
        if (isValidUsername(cleaned)) usernames.add(cleaned);
      }
      if (obj.href && typeof obj.href === 'string') {
        const cleaned = cleanUsernameCandidate(obj.href);
        if (isValidUsername(cleaned)) usernames.add(cleaned);
      }
      if (obj.string_list_data && Array.isArray(obj.string_list_data)) {
        for (const sld of obj.string_list_data) traverse(sld);
      }
      if (obj.relationships_following && Array.isArray(obj.relationships_following)) {
        for (const rel of obj.relationships_following) traverse(rel);
      }
      for (const key of Object.keys(obj)) {
        if (!['value', 'title', 'href', 'string_list_data', 'relationships_following'].includes(key)) {
          traverse(obj[key]);
        }
      }
    }
  }
  traverse(data);
}

function extractFromHtml(html, usernames) {
  // Extract from href="...instagram.com/username..."
  const hrefRegex = /href=["'](?:https?:\/\/(?:www\.)?instagram\.com\/)?([a-zA-Z0-9._]+)\/?["']/gi;
  let match;
  while ((match = hrefRegex.exec(html)) !== null) {
    const cleaned = cleanUsernameCandidate(match[1]);
    if (isValidUsername(cleaned)) usernames.add(cleaned);
  }

  // Extract from <a> tags inner text
  const aTagRegex = /<a\b[^>]*>([\s\S]*?)<\/a>/gi;
  while ((match = aTagRegex.exec(html)) !== null) {
    const inner = match[1].replace(/<[^>]*>?/gm, '').trim();
    const cleaned = cleanUsernameCandidate(inner);
    if (isValidUsername(cleaned)) usernames.add(cleaned);
  }

  // If still empty, fall back to cleaned plain text
  if (usernames.size === 0) {
    const stripped = html.replace(/<[^>]*>?/gm, '\n');
    extractFromPlainText(stripped, usernames);
  }
}

function extractFromPlainText(text, usernames) {
  // Split on newlines, commas, semicolons, tabs, and spaces
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    // Check if line contains CSV/comma/tab separation
    const tokens = trimmedLine.split(/[\t,;]+|\s{2,}/);
    for (let token of tokens) {
      token = token.trim();
      if (!token) continue;
      // Also split space-separated handles if they start with @
      const words = token.split(/\s+/);
      for (const word of words) {
        const cleaned = cleanUsernameCandidate(word);
        if (isValidUsername(cleaned)) {
          usernames.add(cleaned);
        }
      }
    }
  }
}

console.log('Testing prototype on all edge cases:');
console.log('1. @ handles:', extractInstagramUsernames('@john_doe\n@jane.smith\n@user123'));
console.log('2. URLs:', extractInstagramUsernames('https://www.instagram.com/john_doe/\nhttps://instagram.com/jane.smith?igsh=123'));
console.log('3. JSON export:', extractInstagramUsernames(JSON.stringify([
  { title: '', string_list_data: [{ href: 'https://www.instagram.com/user_a', value: 'user_a', timestamp: 1700000000 }] }
])));
console.log('4. HTML export:', extractInstagramUsernames('<!DOCTYPE html><html><body><h2>Followers</h2><a href="https://instagram.com/realuser">realuser</a><div>Oct 12, 2023, 10:30 AM</div><span>Active</span></body></html>'));
console.log('5. CSV export:', extractInstagramUsernames('username,date\njohn_doe,2023-01-01\njane.smith,2023-01-02'));
console.log('6. UI words & dates:', extractInstagramUsernames('Segui\nMessaggio\nMay\n18\n2026\nFollowers\nRemove\nalberto_barnus99'));
console.log('7. Comma separated:', extractInstagramUsernames('user1, user2, user3'));
console.log('8. Invalid IG handles:', extractInstagramUsernames('.invalid\ninvalid.\nin..valid\nvalid_user'));
