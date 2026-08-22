import { describe, it, expect } from 'vitest';
import {
  parseInstagramText,
  isValidInstagramUsername,
  sanitizeUsername,
  computeAnalysis,
} from './utils';

describe('CHALLENGER 1: Empirical Stress Test Suite for InstaSniff', () => {
  // =========================================================================
  // 1. COMPLEX & ADVERSARIAL META JSON PAYLOADS (PASSED)
  // =========================================================================
  describe('1. Complex Nested Meta JSON Export Payloads', () => {
    it('handles deeply nested arbitrary JSON structures with mixed valid/invalid usernames', () => {
      const complexJson = JSON.stringify({
        data: {
          app_info: { version: '2026.08.22', build: 123456 },
          relationships: {
            following_feed: [
              {
                title: 'influencer_alpha',
                media_list_data: [],
                string_list_data: [
                  {
                    href: 'https://www.instagram.com/influencer_alpha?utm_source=ig_web',
                    value: 'influencer_alpha',
                    timestamp: 1718000000,
                  },
                ],
              },
              {
                title: '', // Empty title
                string_list_data: [], // Empty list
              },
              {
                title: 'follower', // Stopword in title
                string_list_data: [
                  {
                    href: 'https://www.instagram.com/real_target_user/',
                    value: 'real_target_user',
                    timestamp: 1718000001,
                  },
                ],
              },
            ],
            nested_section: {
              account_name: 'verified_creator_99',
              extra_meta: {
                handle: '@vip_celebrity',
                user: 'community_leader',
                invalid_candidate: 'not..valid..user',
                pure_number: '987654321',
              },
            },
          },
        },
      });

      const parsed = parseInstagramText(complexJson);
      expect(parsed).toEqual(
        expect.arrayContaining([
          'influencer_alpha',
          'real_target_user',
          'verified_creator_99',
          'vip_celebrity',
          'community_leader',
        ])
      );
      expect(parsed).not.toContain('follower');
      expect(parsed).not.toContain('not..valid..user');
      expect(parsed).not.toContain('987654321');
      expect(parsed.length).toBe(5);
    });

    it('recovers gracefully from truncated or corrupted JSON payloads by falling back to token parsing', () => {
      const brokenJson = `[
        {"title": "valid_user_one", "string_list_data": [{"value": "valid_user_one"}]},
        {"title": "valid_user_two", "string_list_data": [{"value": "valid_user_two"
      `;

      const parsed = parseInstagramText(brokenJson);
      expect(parsed).toEqual(expect.arrayContaining(['valid_user_one', 'valid_user_two']));
      expect(parsed).not.toContain('title');
      expect(parsed).not.toContain('string_list_data');
      expect(parsed).not.toContain('value');
    });

    it('correctly handles empty JSON arrays and objects without throwing or creating ghost users', () => {
      expect(parseInstagramText('[]')).toEqual([]);
      expect(parseInstagramText('{}')).toEqual([]);
      expect(parseInstagramText('[{ "title": "", "string_list_data": [] }]')).toEqual([]);
      expect(parseInstagramText('{"relationships_following": []}')).toEqual([]);
    });

    it('correctly parses massive JSON export payload with 5,000 unique accounts within reasonable time', () => {
      const accountsCount = 5000;
      const largePayload = Array.from({ length: accountsCount }, (_, i) => ({
        title: `bulk_user_${i}`,
        string_list_data: [
          {
            href: `https://www.instagram.com/bulk_user_${i}/?igsh=test`,
            value: `bulk_user_${i}`,
            timestamp: 1700000000 + i,
          },
        ],
      }));

      const jsonStr = JSON.stringify(largePayload);
      const startTime = performance.now();
      const result = parseInstagramText(jsonStr);
      const durationMs = performance.now() - startTime;

      expect(result.length).toBe(accountsCount);
      expect(result[0]).toBe('bulk_user_0');
      expect(result[accountsCount - 1]).toBe(`bulk_user_${accountsCount - 1}`);
      expect(durationMs).toBeLessThan(1500);
    });
  });

  // =========================================================================
  // 2. CSV / TSV SPREADSHEETS (PASSED)
  // =========================================================================
  describe('2. CSV / TSV Spreadsheets with Diverse Delimiters & Quotes', () => {
    it('parses standard CSV with headers and quoted URLs', () => {
      const csvData = `
        "Username","Profile URL","Follow Date","Status"
        "alfa_romeo","https://www.instagram.com/alfa_romeo/","2026-01-10","Active"
        "ferrari_fans","https://www.instagram.com/ferrari_fans/","2026-02-15","Verified"
        "lamborghini_club","https://www.instagram.com/lamborghini_club/","2026-03-20","Active"
      `;

      const parsed = parseInstagramText(csvData);
      expect(parsed).toEqual(
        expect.arrayContaining(['alfa_romeo', 'ferrari_fans', 'lamborghini_club'])
      );
      expect(parsed).not.toContain('username');
      expect(parsed).not.toContain('status');
      expect(parsed).not.toContain('active');
      expect(parsed).not.toContain('verified');
      expect(parsed.length).toBe(3);
    });

    it('parses semicolon-delimited CSV (Italian Excel export format)', () => {
      const semicolonCsv = `
        Nome utente;Data follow;Azione
        user_uno;12/04/2026;Segui
        user_due;15/05/2026;Segui
        user_tre;20/06/2026;Messaggio
      `;

      const parsed = parseInstagramText(semicolonCsv);
      expect(parsed).toEqual(expect.arrayContaining(['user_uno', 'user_due', 'user_tre']));
      expect(parsed.length).toBe(3);
    });

    it('parses tab-separated values (TSV / copy-paste from Google Sheets)', () => {
      const tsvData = "user_tab_1\thttps://instagram.com/user_tab_1\t2026-05-01\nuser_tab_2\thttps://instagram.com/user_tab_2\t2026-05-02";
      const parsed = parseInstagramText(tsvData);
      expect(parsed).toEqual(expect.arrayContaining(['user_tab_1', 'user_tab_2']));
      expect(parsed.length).toBe(2);
    });

    it('parses pipe-delimited values and mixed delimiter lines', () => {
      const pipeData = 'user_pipe_1 | user_pipe_2; @user_pipe_3, https://instagram.com/user_pipe_4';
      const parsed = parseInstagramText(pipeData);
      expect(parsed).toEqual(
        expect.arrayContaining(['user_pipe_1', 'user_pipe_2', 'user_pipe_3', 'user_pipe_4'])
      );
      expect(parsed.length).toBe(4);
    });
  });

  // =========================================================================
  // 3. EDGE-CASE USERNAME RULES & SANITIZATION (PASSED)
  // =========================================================================
  describe('3. Edge-case Usernames & Boundary Validation', () => {
    it('validates boundary lengths (1 char to 30 chars)', () => {
      expect(isValidInstagramUsername('a')).toBe(true);
      expect(isValidInstagramUsername('z')).toBe(true);
      expect(isValidInstagramUsername('_')).toBe(true);

      const thirtyChars = 'a'.repeat(30);
      expect(isValidInstagramUsername(thirtyChars)).toBe(true);
      expect(sanitizeUsername(thirtyChars)).toBe(thirtyChars);

      const thirtyOneChars = 'a'.repeat(31);
      expect(isValidInstagramUsername(thirtyOneChars)).toBe(false);
      expect(sanitizeUsername(thirtyOneChars)).toBe(null);
    });

    it('strictly enforces dot rules: no leading dot, no trailing dot, no consecutive dots', () => {
      expect(isValidInstagramUsername('.leading')).toBe(false);
      expect(isValidInstagramUsername('trailing.')).toBe(false);
      expect(isValidInstagramUsername('.both.')).toBe(false);
      expect(isValidInstagramUsername('double..dot')).toBe(false);
      expect(isValidInstagramUsername('triple...dot')).toBe(false);
      expect(isValidInstagramUsername('..')).toBe(false);
      expect(isValidInstagramUsername('.')).toBe(false);

      expect(isValidInstagramUsername('a.b.c.d.e')).toBe(true);
      expect(sanitizeUsername('@a.b.c.d.e')).toBe('a.b.c.d.e');
    });

    it('handles underscores at start, middle, and end', () => {
      expect(isValidInstagramUsername('_start')).toBe(true);
      expect(isValidInstagramUsername('end_')).toBe(true);
      expect(isValidInstagramUsername('_both_')).toBe(true);
      expect(isValidInstagramUsername('___')).toBe(true);
      expect(isValidInstagramUsername('__double_under__')).toBe(true);
    });

    it('rejects pure numbers but allows alphanumeric starting with numbers', () => {
      expect(isValidInstagramUsername('12345')).toBe(false);
      expect(isValidInstagramUsername('2026')).toBe(false);
      expect(isValidInstagramUsername('1700000000')).toBe(false);

      expect(isValidInstagramUsername('123user')).toBe(true);
      expect(isValidInstagramUsername('0_0')).toBe(true);
      expect(isValidInstagramUsername('7th_element')).toBe(true);
    });

    it('rejects characters not permitted by Instagram (spaces, punctuation, emojis, special chars)', () => {
      expect(isValidInstagramUsername('user name')).toBe(false);
      expect(isValidInstagramUsername('user!name')).toBe(false);
      expect(isValidInstagramUsername('user@name')).toBe(false);
      expect(isValidInstagramUsername('user#name')).toBe(false);
      expect(isValidInstagramUsername('user$name')).toBe(false);
      expect(isValidInstagramUsername('user%name')).toBe(false);
      expect(isValidInstagramUsername('user^name')).toBe(false);
      expect(isValidInstagramUsername('user&name')).toBe(false);
      expect(isValidInstagramUsername('user*name')).toBe(false);
      expect(isValidInstagramUsername('user(name)')).toBe(false);
      expect(isValidInstagramUsername('user+name')).toBe(false);
      expect(isValidInstagramUsername('user=name')).toBe(false);
      expect(isValidInstagramUsername('user/name')).toBe(false);
      expect(isValidInstagramUsername('user\\name')).toBe(false);
      expect(isValidInstagramUsername('user:name')).toBe(false);
      expect(isValidInstagramUsername('user;name')).toBe(false);
      expect(isValidInstagramUsername('user,name')).toBe(false);
      expect(isValidInstagramUsername('user?name')).toBe(false);
      expect(isValidInstagramUsername('user<name>')).toBe(false);
      expect(isValidInstagramUsername('user[name]')).toBe(false);
      expect(isValidInstagramUsername('user{name}')).toBe(false);
      expect(isValidInstagramUsername('user~name')).toBe(false);
      expect(isValidInstagramUsername('user`name')).toBe(false);
      expect(isValidInstagramUsername('user|name')).toBe(false);
      expect(isValidInstagramUsername('user😎')).toBe(false);
    });

    it('rejects non-ASCII / accented characters (Instagram usernames are strictly ASCII)', () => {
      expect(isValidInstagramUsername('mario_rossì')).toBe(false);
      expect(isValidInstagramUsername('josé_silva')).toBe(false);
      expect(isValidInstagramUsername('münchen_fan')).toBe(false);
      expect(isValidInstagramUsername('русский_юзер')).toBe(false);
      expect(isValidInstagramUsername('中文用户')).toBe(false);
    });

    it('normalizes uppercase and mixed-case usernames correctly', () => {
      expect(sanitizeUsername('CRISTIANO')).toBe('cristiano');
      expect(sanitizeUsername('@ALBERTO_BARNUS99')).toBe('alberto_barnus99');
      expect(sanitizeUsername('https://instagram.com/John.Doe/')).toBe('john.doe');
    });
  });

  // =========================================================================
  // 4. SET COMPUTATION ACCURACY & STATISTICAL ANALYSIS (PASSED)
  // =========================================================================
  describe('4. Set Computation Accuracy & Statistical Analysis', () => {
    it('computes 100% mutual follow-back reciprocity accurately', () => {
      const following = ['user1', 'user2', 'user3', 'user4', 'user5'];
      const followers = ['user5', 'user4', 'user3', 'user2', 'user1'];

      const stats = computeAnalysis(following, followers);
      expect(stats.followingCount).toBe(5);
      expect(stats.followersCount).toBe(5);
      expect(stats.unfollowers).toEqual([]);
      expect(stats.fans).toEqual([]);
      expect(stats.mutuals.length).toBe(5);
      expect(stats.followBackRatio).toBe(100);
    });

    it('computes 0% mutual follow-back reciprocity (completely disjoint sets) accurately', () => {
      const following = ['user_a', 'user_b', 'user_c'];
      const followers = ['user_x', 'user_y', 'user_z'];

      const stats = computeAnalysis(following, followers);
      expect(stats.followingCount).toBe(3);
      expect(stats.followersCount).toBe(3);
      expect(stats.unfollowers).toEqual(['user_a', 'user_b', 'user_c']);
      expect(stats.fans).toEqual(['user_x', 'user_y', 'user_z']);
      expect(stats.mutuals).toEqual([]);
      expect(stats.followBackRatio).toBe(0);
    });

    it('computes asymmetric sets with mixed overlap accurately', () => {
      const following = ['user1', 'user2', 'user3', 'user4', 'user5', 'user6'];
      const followers = ['user2', 'user4', 'user7', 'user8'];

      const stats = computeAnalysis(following, followers);
      expect(stats.followingCount).toBe(6);
      expect(stats.followersCount).toBe(4);
      expect(stats.unfollowers).toEqual(['user1', 'user3', 'user5', 'user6']);
      expect(stats.fans).toEqual(['user7', 'user8']);
      expect(stats.mutuals).toEqual(['user2', 'user4']);
      expect(stats.followBackRatio).toBe(33);
    });

    it('handles empty sets without division by zero or NaN issues', () => {
      const emptyBoth = computeAnalysis([], []);
      expect(emptyBoth.followingCount).toBe(0);
      expect(emptyBoth.followersCount).toBe(0);
      expect(emptyBoth.unfollowers).toEqual([]);
      expect(emptyBoth.fans).toEqual([]);
      expect(emptyBoth.mutuals).toEqual([]);
      expect(emptyBoth.followBackRatio).toBe(0);
      expect(Number.isNaN(emptyBoth.followBackRatio)).toBe(false);

      const emptyFollowers = computeAnalysis(['user1', 'user2'], []);
      expect(emptyFollowers.followingCount).toBe(2);
      expect(emptyFollowers.followersCount).toBe(0);
      expect(emptyFollowers.unfollowers).toEqual(['user1', 'user2']);
      expect(emptyFollowers.fans).toEqual([]);
      expect(emptyFollowers.mutuals).toEqual([]);
      expect(emptyFollowers.followBackRatio).toBe(0);

      const emptyFollowing = computeAnalysis([], ['user1', 'user2']);
      expect(emptyFollowing.followingCount).toBe(0);
      expect(emptyFollowing.followersCount).toBe(2);
      expect(emptyFollowing.unfollowers).toEqual([]);
      expect(emptyFollowing.fans).toEqual(['user1', 'user2']);
      expect(emptyFollowing.mutuals).toEqual([]);
      expect(emptyFollowing.followBackRatio).toBe(0);
    });

    it('stress-tests set computation with 10,000 accounts for performance and 100% precision', () => {
      const totalFollowing = 10000;
      const totalFollowers = 10000;

      const following = Array.from({ length: totalFollowing }, (_, i) => `user_${i}`);
      const followers = Array.from({ length: totalFollowers }, (_, i) => `user_${i + 5000}`);

      const startTime = performance.now();
      const stats = computeAnalysis(following, followers);
      const durationMs = performance.now() - startTime;

      expect(stats.followingCount).toBe(10000);
      expect(stats.followersCount).toBe(10000);
      expect(stats.unfollowers.length).toBe(5000);
      expect(stats.fans.length).toBe(5000);
      expect(stats.mutuals.length).toBe(5000);
      expect(stats.followBackRatio).toBe(50);
      expect(stats.unfollowers[0]).toBe('user_0');
      expect(stats.unfollowers[4999]).toBe('user_4999');
      expect(stats.fans[0]).toBe('user_10000');
      expect(stats.fans[4999]).toBe('user_14999');
      expect(stats.mutuals[0]).toBe('user_5000');
      expect(stats.mutuals[4999]).toBe('user_9999');

      expect(durationMs).toBeLessThan(200);
    });
  });

  // =========================================================================
  // 5. EMPIRICALLY CONFIRMED EDGE CASES & REMEDIATED BEHAVIORS (PASSED)
  // =========================================================================
  describe('5. Empirically Confirmed Edge Cases & Remediated Behaviors', () => {
    it('REMEDIATED: sanitizeUsername correctly handles handles wrapped in punctuation with @', () => {
      // Punctuation wrapping @handle e.g. "@username", (@username), [@username], <<<@art_gallery_official>>>
      const quotedHandle = '"@cristiano"';
      const bracketedHandle = '(@cristiano)';
      const angleBracketed = '<<<@art_gallery_official>>>';

      const resQuoted = sanitizeUsername(quotedHandle);
      const resBracketed = sanitizeUsername(bracketedHandle);
      const resAngle = sanitizeUsername(angleBracketed);

      expect(resQuoted).toBe('cristiano');
      expect(resBracketed).toBe('cristiano');
      expect(resAngle).toBe('art_gallery_official');
    });

    it('REMEDIATED: HTML href regex extracts Instagram URLs containing query parameters without leaking display names', () => {
      // Instagram URLs often have ?hl=it, ?igsh=..., ?utm_source=...
      const htmlWithQueryParam = '<a href="https://www.instagram.com/leomessi/?hl=it">Leo Messi</a>';
      const parsed = parseInstagramText(htmlWithQueryParam);

      expect(parsed).toContain('leomessi');
      expect(parsed).not.toContain('leo');
      expect(parsed).not.toContain('messi');
      expect(parsed.length).toBe(1);
    });

    it('REMEDIATED: Stopwords filtering eliminates Italian/English UI tokens and time prepositions', () => {
      const textWithUiWords = `
        @valid_user
        3 giorni fa
        Ieri alle 15:30
        Suggeriti per te
        Segui già
      `;
      const parsed = parseInstagramText(textWithUiWords);

      expect(parsed).toEqual(['valid_user']);
      expect(parsed).not.toContain('fa');
      expect(parsed).not.toContain('alle');
      expect(parsed).not.toContain('per');
      expect(parsed).not.toContain('te');
    });
  });
});
