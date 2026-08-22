const { parseInstagramText } = require('../../src/utils.ts');
// Wait, ts file can be tested or we can recreate the exact function from utils.ts:
function parseInstagramTextTest(rawText) {
  const textWithoutTags = rawText.replace(/<[^>]*>?/gm, '\n');
  const lines = textWithoutTags.split(/\r?\n/);
  const usernames = new Set();
  const usernameRegex = /^[a-zA-Z0-9._]{1,30}$/;

  for (const line of lines) {
    const cleanLine = line.trim();
    if (cleanLine && usernameRegex.test(cleanLine)) {
      usernames.add(cleanLine.toLowerCase());
    }
  }
  return Array.from(usernames);
}

console.log('--- TEST 1: Handles starting with @ ---');
console.log('Input: @john_doe, @jane.smith, @user123');
console.log('Result:', parseInstagramTextTest('@john_doe\n@jane.smith\n@user123'));

console.log('\n--- TEST 2: Instagram URLs ---');
console.log('Input: https://www.instagram.com/john_doe/, https://instagram.com/jane.smith');
console.log('Result:', parseInstagramTextTest('https://www.instagram.com/john_doe/\nhttps://instagram.com/jane.smith'));

console.log('\n--- TEST 3: Instagram official JSON export ---');
const jsonExport = JSON.stringify([
  {
    title: '',
    string_list_data: [
      { href: 'https://www.instagram.com/user_a', value: 'user_a', timestamp: 1700000000 },
      { href: 'https://www.instagram.com/user_b', value: 'user_b', timestamp: 1700000000 }
    ]
  }
], null, 2);
console.log('Result:', parseInstagramTextTest(jsonExport));

console.log('\n--- TEST 4: Instagram HTML export with Meta UI labels ---');
const htmlExport = '<!DOCTYPE html><html><body><h2>Followers</h2><div>Instagram</div><a href="https://instagram.com/realuser">realuser</a><div>Oct 12, 2023, 10:30 AM</div><span>Active</span></body></html>';
console.log('Result:', parseInstagramTextTest(htmlExport));

console.log('\n--- TEST 5: CSV export ---');
const csvExport = 'username,date\njohn_doe,2023-01-01\njane.smith,2023-01-02';
console.log('Result:', parseInstagramTextTest(csvExport));

console.log('\n--- TEST 6: Date words & UI words in raw copy-paste ---');
console.log('Result:', parseInstagramTextTest('Segui\nMessaggio\nMay\n18\n2026\nFollowers\nRemove'));

console.log('\n--- TEST 7: Comma/space separated usernames ---');
console.log('Result:', parseInstagramTextTest('user1, user2, user3'));

console.log('\n--- TEST 8: Invalid IG handles (dots at start/end, double dots) ---');
console.log('Result:', parseInstagramTextTest('.invalid\ninvalid.\nin..valid\nvalid_user'));
