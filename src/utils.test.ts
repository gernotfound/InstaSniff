import { describe, it, expect } from 'vitest';
import {
  parseInstagramText,
  isValidInstagramUsername,
  sanitizeUsername,
  computeAnalysis,
} from './utils';

describe('Instagram Parser & Utilities', () => {
  describe('isValidInstagramUsername', () => {
    it('accepts valid Instagram usernames', () => {
      expect(isValidInstagramUsername('cristiano')).toBe(true);
      expect(isValidInstagramUsername('alberto_barnus99')).toBe(true);
      expect(isValidInstagramUsername('john.doe')).toBe(true);
      expect(isValidInstagramUsername('user_123.name')).toBe(true);
      expect(isValidInstagramUsername('a')).toBe(true);
      expect(isValidInstagramUsername('a'.repeat(30))).toBe(true);
    });

    it('rejects usernames with invalid characters or lengths', () => {
      expect(isValidInstagramUsername('')).toBe(false);
      expect(isValidInstagramUsername('a'.repeat(31))).toBe(false);
      expect(isValidInstagramUsername('user@name')).toBe(false);
      expect(isValidInstagramUsername('user name')).toBe(false);
      expect(isValidInstagramUsername('user!name')).toBe(false);
      expect(isValidInstagramUsername('user#name')).toBe(false);
    });

    it('rejects leading/trailing dots and consecutive dots', () => {
      expect(isValidInstagramUsername('.username')).toBe(false);
      expect(isValidInstagramUsername('username.')).toBe(false);
      expect(isValidInstagramUsername('user..name')).toBe(false);
      expect(isValidInstagramUsername('...')).toBe(false);
    });

    it('rejects purely numeric strings to avoid years and timestamps', () => {
      expect(isValidInstagramUsername('2026')).toBe(false);
      expect(isValidInstagramUsername('18')).toBe(false);
      expect(isValidInstagramUsername('1700000000')).toBe(false);
      // Valid if it contains letters/underscores
      expect(isValidInstagramUsername('user2026')).toBe(true);
      expect(isValidInstagramUsername('99_alberto')).toBe(true);
    });

    it('rejects known UI action stopwords and date tokens', () => {
      expect(isValidInstagramUsername('segui')).toBe(false);
      expect(isValidInstagramUsername('following')).toBe(false);
      expect(isValidInstagramUsername('followers')).toBe(false);
      expect(isValidInstagramUsername('messaggio')).toBe(false);
      expect(isValidInstagramUsername('rimuovi')).toBe(false);
      expect(isValidInstagramUsername('follow')).toBe(false);
      expect(isValidInstagramUsername('message')).toBe(false);
      expect(isValidInstagramUsername('remove')).toBe(false);
      expect(isValidInstagramUsername('maggio')).toBe(false);
      expect(isValidInstagramUsername('may')).toBe(false);
      expect(isValidInstagramUsername('gennaio')).toBe(false);
      expect(isValidInstagramUsername('january')).toBe(false);
      expect(isValidInstagramUsername('instagram')).toBe(false);
      expect(isValidInstagramUsername('meta')).toBe(false);
    });
  });

  describe('sanitizeUsername', () => {
    it('strips leading @ handle prefixes', () => {
      expect(sanitizeUsername('@cristiano')).toBe('cristiano');
      expect(sanitizeUsername('@alberto_barnus99')).toBe('alberto_barnus99');
    });

    it('extracts username from Instagram URLs', () => {
      expect(sanitizeUsername('https://www.instagram.com/podstract/')).toBe('podstract');
      expect(sanitizeUsername('https://instagram.com/john_doe?igsh=12345')).toBe('john_doe');
      expect(sanitizeUsername('http://instagram.com/jane.smith#section')).toBe('jane.smith');
      expect(sanitizeUsername('instagram.com/alex_99')).toBe('alex_99');
    });

    it('normalizes uppercase usernames to lowercase', () => {
      expect(sanitizeUsername('@CRISTIANO')).toBe('cristiano');
      expect(sanitizeUsername('https://instagram.com/John_Doe/')).toBe('john_doe');
    });

    it('returns null for invalid strings', () => {
      expect(sanitizeUsername('invalid url with spaces')).toBe(null);
      expect(sanitizeUsername('https://otherwebsite.com/user')).toBe(null);
    });
  });

  describe('parseInstagramText', () => {
    it('parses official Meta JSON exports (followers_1.json and following.json format)', () => {
      const metaFollowersJson = JSON.stringify([
        {
          title: '',
          media_list_data: [],
          string_list_data: [
            {
              href: 'https://www.instagram.com/user_one',
              value: 'user_one',
              timestamp: 1700000000,
            },
          ],
        },
        {
          title: '',
          string_list_data: [
            {
              href: 'https://www.instagram.com/user_two',
              value: 'user_two',
              timestamp: 1700000001,
            },
          ],
        },
      ]);

      const parsed = parseInstagramText(metaFollowersJson);
      expect(parsed).toEqual(expect.arrayContaining(['user_one', 'user_two']));
      expect(parsed.length).toBe(2);
    });

    it('parses Meta JSON exports with relationships_following structure', () => {
      const metaFollowingJson = JSON.stringify({
        relationships_following: [
          {
            title: 'account_alpha',
            string_list_data: [
              {
                href: 'https://www.instagram.com/account_alpha',
                value: 'account_alpha',
                timestamp: 1700000000,
              },
            ],
          },
          {
            title: 'account_beta',
            string_list_data: [
              {
                href: 'https://www.instagram.com/account_beta',
                value: 'account_beta',
                timestamp: 1700000000,
              },
            ],
          },
        ],
      });

      const parsed = parseInstagramText(metaFollowingJson);
      expect(parsed).toEqual(expect.arrayContaining(['account_alpha', 'account_beta']));
      expect(parsed.length).toBe(2);
    });

    it('parses raw text with @ handles and mixed dates/timestamps', () => {
      const rawText = `
        @podstract
        ago 18, 2026 6:14 am
        @alberto_barnus99
        giu 30, 2026 2:12 pm
        mario.rossi
        Segui
        Messaggio
      `;

      const parsed = parseInstagramText(rawText);
      expect(parsed).toEqual(expect.arrayContaining(['podstract', 'alberto_barnus99', 'mario.rossi']));
      expect(parsed).not.toContain('segui');
      expect(parsed).not.toContain('messaggio');
      expect(parsed).not.toContain('ago');
      expect(parsed).not.toContain('2026');
      expect(parsed).not.toContain('18');
      expect(parsed.length).toBe(3);
    });

    it('parses comma-separated and inline lists', () => {
      const inlineText = '@user1, @user2, https://instagram.com/user3/, user4';
      const parsed = parseInstagramText(inlineText);
      expect(parsed).toEqual(expect.arrayContaining(['user1', 'user2', 'user3', 'user4']));
      expect(parsed.length).toBe(4);
    });

    it('parses CSV / TSV format inputs', () => {
      const csvText = `
        username,date,status
        user_alpha,2026-01-01,active
        user_beta,2026-01-02,active
        user_gamma,2026-01-03,active
      `;

      const parsed = parseInstagramText(csvText);
      expect(parsed).toEqual(expect.arrayContaining(['user_alpha', 'user_beta', 'user_gamma']));
      expect(parsed).not.toContain('active');
      expect(parsed).not.toContain('date');
      expect(parsed.length).toBe(3);
    });

    it('parses HTML exports with anchor tags', () => {
      const htmlText = `
        <div class="header"><h2>Followers</h2></div>
        <div class="user-row">
          <a href="https://www.instagram.com/super_user_1/">super_user_1</a>
          <span>Active</span>
        </div>
        <div class="user-row">
          <a href="https://www.instagram.com/super_user_2/">super_user_2</a>
        </div>
      `;

      const parsed = parseInstagramText(htmlText);
      expect(parsed).toEqual(expect.arrayContaining(['super_user_1', 'super_user_2']));
      expect(parsed).not.toContain('followers');
      expect(parsed).not.toContain('active');
      expect(parsed.length).toBe(2);
    });

    it('returns empty array on empty or whitespace strings', () => {
      expect(parseInstagramText('')).toEqual([]);
      expect(parseInstagramText('   \n\n\t  ')).toEqual([]);
    });
  });

  describe('computeAnalysis', () => {
    it('correctly calculates unfollowers, fans, mutuals and follow-back ratio', () => {
      const following = ['user_a', 'user_b', 'user_c', 'user_d'];
      const followers = ['user_b', 'user_c', 'user_e', 'user_f'];

      const stats = computeAnalysis(following, followers);

      // Unfollowers (Following \ Followers): user_a, user_d
      expect(stats.unfollowers).toEqual(['user_a', 'user_d']);

      // Fans (Followers \ Following): user_e, user_f
      expect(stats.fans).toEqual(['user_e', 'user_f']);

      // Mutuals (Followers ∩ Following): user_b, user_c
      expect(stats.mutuals).toEqual(['user_b', 'user_c']);

      // Follow back ratio: 2 out of 4 = 50%
      expect(stats.followBackRatio).toBe(50);
      expect(stats.followingCount).toBe(4);
      expect(stats.followersCount).toBe(4);
    });

    it('handles 100% reciprocal follow-back without false positives', () => {
      const following = ['user_a', 'user_b'];
      const followers = ['user_a', 'user_b'];

      const stats = computeAnalysis(following, followers);
      expect(stats.unfollowers.length).toBe(0);
      expect(stats.fans.length).toBe(0);
      expect(stats.mutuals.length).toBe(2);
      expect(stats.followBackRatio).toBe(100);
    });
  });

  describe('Refined Parser Edge Cases', () => {
    it('sanitizes usernames wrapped in diverse brackets, quotes, and punctuation', () => {
      expect(sanitizeUsername('"@cristiano"')).toBe('cristiano');
      expect(sanitizeUsername('(@cristiano)')).toBe('cristiano');
      expect(sanitizeUsername('[@cristiano]')).toBe('cristiano');
      expect(sanitizeUsername('<<<@art_gallery_official>>>')).toBe('art_gallery_official');
      expect(sanitizeUsername('{"@nested_user"}')).toBe('nested_user');
      expect(sanitizeUsername('“@smart_quote”')).toBe('smart_quote');
      expect(sanitizeUsername('\'@single_quote\'')).toBe('single_quote');
    });

    it('extracts usernames from HTML hrefs with query parameters without leaking display names', () => {
      const html = `
        <div class="user-row">
          <a href="https://www.instagram.com/leomessi/?hl=it">Leo Messi</a>
          <span>3 giorni fa</span>
        </div>
        <div class="user-row">
          <a href="https://instagram.com/cristiano?utm_source=ig_web">Cristiano Ronaldo</a>
          <span>Ieri alle 15:30</span>
        </div>
        <div class="user-row">
          <a href="/neymarjr/?hl=en">Neymar Jr</a>
        </div>
      `;

      const parsed = parseInstagramText(html);
      expect(parsed).toEqual(expect.arrayContaining(['leomessi', 'cristiano', 'neymarjr']));
      expect(parsed).not.toContain('leo');
      expect(parsed).not.toContain('messi');
      expect(parsed).not.toContain('ronaldo');
      expect(parsed).not.toContain('neymar');
      expect(parsed).not.toContain('jr');
      expect(parsed).not.toContain('fa');
      expect(parsed).not.toContain('alle');
      expect(parsed.length).toBe(3);
    });

    it('filters all Italian and English UI stopwords, prepositions, and footer copy', () => {
      const dirtyText = `
        @valid_user_1
        3 giorni fa
        Ieri alle 15:30
        Suggeriti per te
        Segui già
        Mostra tutti
        Nascondi suggerimenti
        Carica altri
        Yesterday at 9:00 PM
        Followers list
        Meta Platforms, Inc.
        Copyright 2026. All rights reserved.
        Privacy and Terms
        @valid_user_2
      `;

      const parsed = parseInstagramText(dirtyText);
      expect(parsed).toEqual(['valid_user_1', 'valid_user_2']);
    });
  });
});
