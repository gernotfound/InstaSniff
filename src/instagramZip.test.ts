import { describe, expect, it } from 'vitest';
import { extractOfficialInstagramUsernames } from './instagramZip';

describe('extractOfficialInstagramUsernames', () => {
  it('extracts usernames from the standard followers JSON structure', () => {
    const content = JSON.stringify([
      {
        title: '',
        string_list_data: [
          { href: 'https://www.instagram.com/alice.example', value: 'alice.example', timestamp: 1 },
        ],
      },
      {
        title: '',
        string_list_data: [
          { href: 'https://www.instagram.com/bob_test/', value: 'bob_test', timestamp: 2 },
        ],
      },
    ]);

    expect(extractOfficialInstagramUsernames(content, 'followers_1.json')).toEqual([
      'alice.example',
      'bob_test',
    ]);
  });

  it('supports following exports where the username is stored in title', () => {
    const content = JSON.stringify({
      relationships_following: [
        { title: 'charlie_92', string_list_data: [{ timestamp: 3 }] },
        { title: 'delta.example', string_list_data: [] },
      ],
      unrelated: { name: 'this_should_not_be_collected' },
    });

    expect(extractOfficialInstagramUsernames(content, 'following.json')).toEqual([
      'charlie_92',
      'delta.example',
    ]);
  });

  it('extracts Instagram profile links from HTML without using display names', () => {
    const content = `
      <html><body>
        <a href="https://www.instagram.com/echo.test/">Echo Test Person</a>
        <a href="https://instagram.com/foxtrot_1">Another Display Name</a>
      </body></html>
    `;

    expect(extractOfficialInstagramUsernames(content, 'followers_1.html')).toEqual([
      'echo.test',
      'foxtrot_1',
    ]);
  });
});
