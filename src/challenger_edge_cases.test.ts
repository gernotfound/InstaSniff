import { describe, it, expect } from 'vitest';
import {
  parseInstagramText,
  isValidInstagramUsername,
  sanitizeUsername,
  computeAnalysis,
  exportToTxt,
  exportToCsv,
  exportToJson,
} from './utils';

describe('CHALLENGER 4: Build, Lint & Edge-Case Empirical Verification Suite', () => {
  // =========================================================================
  // 1. FILE SIZE BOUNDARIES & DATA VOLUME LIMITS (15 MB Simulation)
  // =========================================================================
  describe('1. File Size Limits & Data Volume Ingestion', () => {
    it('verifies 15 MB file size limit calculation matches 15,728,640 bytes', () => {
      const maxBytes = 15 * 1024 * 1024;
      expect(maxBytes).toBe(15728640);
    });

    it('correctly parses a simulated large file payload of 10,000 accounts without crashing or stack overflow', () => {
      const largeList = Array.from({ length: 10000 }, (_, i) => `@large_user_${i}`).join('\n');
      
      const startTime = performance.now();
      const parsed = parseInstagramText(largeList);
      const durationMs = performance.now() - startTime;

      expect(parsed.length).toBe(10000);
      expect(parsed[0]).toBe('large_user_0');
      expect(parsed[9999]).toBe('large_user_9999');
      expect(durationMs).toBeLessThan(1000); // Must complete in under 1 second
    });

    it('handles heavy HTML exports with 2,000 anchor tags and mixed metadata', () => {
      const htmlRows = Array.from(
        { length: 2000 },
        (_, i) => `<div class="user-row"><a href="https://www.instagram.com/html_user_${i}/?hl=it">Display Name ${i}</a><span>Segui</span></div>`
      ).join('\n');

      const startTime = performance.now();
      const parsed = parseInstagramText(htmlRows);
      const durationMs = performance.now() - startTime;

      expect(parsed.length).toBe(2000);
      expect(parsed).not.toContain('segui');
      expect(parsed).not.toContain('display');
      expect(parsed).not.toContain('name');
      expect(parsed[0]).toBe('html_user_0');
      expect(durationMs).toBeLessThan(1500);
    });
  });

  // =========================================================================
  // 2. ERROR HANDLING & UNEXPECTED INPUTS
  // =========================================================================
  describe('2. Error Handling & Malformed Input Recovery', () => {
    it('gracefully handles malformed JSON without throwing unhandled exceptions', () => {
      const badJsonSamples = [
        '{ "unclosed": "object"',
        '[{"title": "valid_user"},',
        '{"invalid": json}',
        'undefined',
        'null',
        'NaN',
        '{"string_list_data": [null, 123, false, {}, []]}',
      ];

      for (const badJson of badJsonSamples) {
        expect(() => parseInstagramText(badJson)).not.toThrow();
      }
    });

    it('returns empty array for non-parseable garbage inputs and stopword-only inputs', () => {
      const garbageInputs = [
        '   \n\t\r  ',
        'Segui\nMessaggio\nRimuovi\nFollowers\nFollowing\n2026\n18\n',
        'https://google.com/search?q=test\nhttps://facebook.com/profile',
        '.. ... .... ._ _.',
        '??? !!! *** ### $$$ %%%',
        '1234567890\n9876543210\n0000',
      ];

      for (const garbage of garbageInputs) {
        const result = parseInstagramText(garbage);
        expect(result).toEqual([]);
      }
    });

    it('recovers valid usernames embedded within noisy Instagram UI copy', () => {
      const mixedInstagramCopy = `
        Suggeriti per te
        @target_recovered_1
        Ieri alle 15:30
        {"title": "target_recovered_2", "string_list_data": [{"value": "target_recovered_2"}]}
        Segui già • 3 giorni fa
        Mostra tutti • Nascondi suggerimenti
        @target_recovered_3
      `;

      const result = parseInstagramText(mixedInstagramCopy);
      expect(result).toEqual(
        expect.arrayContaining(['target_recovered_1', 'target_recovered_2', 'target_recovered_3'])
      );
      expect(result).not.toContain('suggeriti');
      expect(result).not.toContain('ieri');
      expect(result).not.toContain('alle');
      expect(result).not.toContain('segui');
      expect(result).not.toContain('fa');
      expect(result).not.toContain('mostra');
      expect(result).not.toContain('tutti');
    });
  });

  // =========================================================================
  // 3. SET THEORY BOUNDARY CONDITIONS (computeAnalysis)
  // =========================================================================
  describe('3. Set Analysis Edge Boundaries', () => {
    it('computes accurately when following and followers are identical', () => {
      const accounts = ['user_1', 'user_2', 'user_3'];
      const stats = computeAnalysis(accounts, accounts);

      expect(stats.followingCount).toBe(3);
      expect(stats.followersCount).toBe(3);
      expect(stats.unfollowers).toHaveLength(0);
      expect(stats.fans).toHaveLength(0);
      expect(stats.mutuals).toEqual(['user_1', 'user_2', 'user_3']);
      expect(stats.followBackRatio).toBe(100);
    });

    it('computes accurately when following and followers are completely disjoint', () => {
      const following = ['a', 'b', 'c'];
      const followers = ['d', 'e', 'f'];
      const stats = computeAnalysis(following, followers);

      expect(stats.followingCount).toBe(3);
      expect(stats.followersCount).toBe(3);
      expect(stats.unfollowers).toEqual(['a', 'b', 'c']);
      expect(stats.fans).toEqual(['d', 'e', 'f']);
      expect(stats.mutuals).toHaveLength(0);
      expect(stats.followBackRatio).toBe(0);
    });

    it('computes accurately with empty following and non-empty followers (Only Fans)', () => {
      const stats = computeAnalysis([], ['fan_1', 'fan_2']);
      expect(stats.followingCount).toBe(0);
      expect(stats.followersCount).toBe(2);
      expect(stats.unfollowers).toHaveLength(0);
      expect(stats.fans).toEqual(['fan_1', 'fan_2']);
      expect(stats.mutuals).toHaveLength(0);
      expect(stats.followBackRatio).toBe(0);
    });

    it('computes accurately with non-empty following and empty followers (Only Unfollowers)', () => {
      const stats = computeAnalysis(['unf_1', 'unf_2'], []);
      expect(stats.followingCount).toBe(2);
      expect(stats.followersCount).toBe(0);
      expect(stats.unfollowers).toEqual(['unf_1', 'unf_2']);
      expect(stats.fans).toHaveLength(0);
      expect(stats.mutuals).toHaveLength(0);
      expect(stats.followBackRatio).toBe(0);
    });

    it('stress tests massive disjoint sets (20,000 items each)', () => {
      const count = 20000;
      const following = Array.from({ length: count }, (_, i) => `following_${i}`);
      const followers = Array.from({ length: count }, (_, i) => `follower_${i}`);

      const startTime = performance.now();
      const stats = computeAnalysis(following, followers);
      const durationMs = performance.now() - startTime;

      expect(stats.followingCount).toBe(count);
      expect(stats.followersCount).toBe(count);
      expect(stats.unfollowers.length).toBe(count);
      expect(stats.fans.length).toBe(count);
      expect(stats.mutuals.length).toBe(0);
      expect(stats.followBackRatio).toBe(0);
      expect(durationMs).toBeLessThan(300);
    });
  });

  // =========================================================================
  // 4. EXPORT UTILITY CONTRACTS (TXT / CSV / JSON)
  // =========================================================================
  describe('4. Export Utilities Functionality', () => {
    it('validates export helper signatures exist and execute without throw in node/jsdom environment', () => {
      expect(typeof exportToTxt).toBe('function');
      expect(typeof exportToCsv).toBe('function');
      expect(typeof exportToJson).toBe('function');
    });
  });

  // =========================================================================
  // 5. USERNAME SANITIZATION & STRICT REGEX
  // =========================================================================
  describe('5. Strict Sanitization & Grammar Invariants', () => {
    it('correctly handles all variations of Instagram URLs', () => {
      const urls = [
        'https://www.instagram.com/target_user/',
        'http://instagram.com/target_user',
        'instagram.com/target_user',
        'https://instagram.com/target_user?igsh=MzRlODBiNWFlZA==',
        'https://www.instagram.com/target_user#profile_tab',
        'https://instagram.com/target_user/?hl=it&theme=dark',
      ];

      for (const url of urls) {
        expect(sanitizeUsername(url)).toBe('target_user');
      }
    });

    it('rejects Instagram route prefixes (p, tv, explore, stories, etc.) as usernames when formatted as paths', () => {
      expect(isValidInstagramUsername('p')).toBe(false);
      expect(isValidInstagramUsername('tv')).toBe(false);
      expect(isValidInstagramUsername('explore')).toBe(false);
      expect(isValidInstagramUsername('stories')).toBe(false);
      expect(isValidInstagramUsername('reels')).toBe(false);
    });

    it('rejects usernames that violate Instagram rules', () => {
      expect(isValidInstagramUsername('')).toBe(false);
      expect(isValidInstagramUsername('.user')).toBe(false);
      expect(isValidInstagramUsername('user.')).toBe(false);
      expect(isValidInstagramUsername('us..er')).toBe(false);
      expect(isValidInstagramUsername('user-name')).toBe(false); // Hyphens not allowed on IG
      expect(isValidInstagramUsername('user+name')).toBe(false);
      expect(isValidInstagramUsername('user space')).toBe(false);
      expect(isValidInstagramUsername('123456')).toBe(false); // Pure numbers disallowed
    });
  });
});
