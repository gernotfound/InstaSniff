import { describe, expect, it } from 'vitest';
import { extractOfficialInstagramUsernames, importInstagramZip } from './instagramZip';

function concatBytes(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.byteLength, 0);
  const output = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.byteLength;
  }
  return output;
}

function createStoredZip(entries: Array<{ name: string; content: string }>): File {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let localOffset = 0;

  for (const entry of entries) {
    const name = encoder.encode(entry.name);
    const data = encoder.encode(entry.content);

    const local = new Uint8Array(30 + name.byteLength + data.byteLength);
    const localView = new DataView(local.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0, true);
    localView.setUint16(8, 0, true);
    localView.setUint32(18, data.byteLength, true);
    localView.setUint32(22, data.byteLength, true);
    localView.setUint16(26, name.byteLength, true);
    localView.setUint16(28, 0, true);
    local.set(name, 30);
    local.set(data, 30 + name.byteLength);
    localParts.push(local);

    const central = new Uint8Array(46 + name.byteLength);
    const centralView = new DataView(central.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint32(20, data.byteLength, true);
    centralView.setUint32(24, data.byteLength, true);
    centralView.setUint16(28, name.byteLength, true);
    centralView.setUint32(42, localOffset, true);
    central.set(name, 46);
    centralParts.push(central);

    localOffset += local.byteLength;
  }

  const centralDirectory = concatBytes(centralParts);
  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);
  eocdView.setUint32(0, 0x06054b50, true);
  eocdView.setUint16(8, entries.length, true);
  eocdView.setUint16(10, entries.length, true);
  eocdView.setUint32(12, centralDirectory.byteLength, true);
  eocdView.setUint32(16, localOffset, true);

  return new File([...localParts, centralDirectory, eocd], 'instagram-export.zip', {
    type: 'application/zip',
  });
}

function relationship(username: string) {
  return {
    title: '',
    string_list_data: [
      {
        href: `https://www.instagram.com/${username}/`,
        value: username,
        timestamp: 1,
      },
    ],
  };
}

describe('extractOfficialInstagramUsernames', () => {
  it('extracts usernames from the standard followers JSON structure', () => {
    const content = JSON.stringify([relationship('alice.example'), relationship('bob_test')]);

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

describe('importInstagramZip', () => {
  it('finds nested relationship files and merges split follower parts', async () => {
    const zip = createStoredZip([
      {
        name: 'instagram-user/connections/followers_and_following/followers_1.json',
        content: JSON.stringify([relationship('alice.example')]),
      },
      {
        name: 'instagram-user/connections/followers_and_following/followers_2.json',
        content: JSON.stringify([relationship('bob_test')]),
      },
      {
        name: 'instagram-user/connections/followers_and_following/following.json',
        content: JSON.stringify({
          relationships_following: [relationship('alice.example'), relationship('charlie_92')],
        }),
      },
      {
        name: 'instagram-user/media/photo.jpg',
        content: 'not relevant and should never be parsed',
      },
    ]);

    const result = await importInstagramZip(zip);

    expect(result.followers).toEqual(['alice.example', 'bob_test']);
    expect(result.following).toEqual(['alice.example', 'charlie_92']);
    expect(result.followerFiles).toHaveLength(2);
    expect(result.followingFiles).toHaveLength(1);
    expect(result.warnings).toContain('Uniti automaticamente 2 file follower.');
  });
});
