import { test, expect } from '@playwright/test';
import { Buffer } from 'node:buffer';

function concatBytes(parts) {
  const total = parts.reduce((sum, part) => sum + part.byteLength, 0);
  const output = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.byteLength;
  }
  return output;
}

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let value = i;
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) !== 0 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[i] = value >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC32_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function createStoredZip(entries) {
  const encoder = new TextEncoder();
  const localParts = [];
  const centralParts = [];
  let localOffset = 0;

  for (const entry of entries) {
    const name = encoder.encode(entry.name);
    const data = encoder.encode(entry.content);
    const checksum = crc32(data);

    const local = new Uint8Array(30 + name.byteLength + data.byteLength);
    const localView = new DataView(local.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0, true);
    localView.setUint16(8, 0, true);
    localView.setUint32(14, checksum, true);
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
    centralView.setUint32(16, checksum, true);
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

  return Buffer.from(concatBytes([...localParts, centralDirectory, eocd]));
}

function relationshipHtml(usernames, following = false) {
  return `<!doctype html><html><body>${usernames
    .map((username) => {
      const href = following
        ? `https://www.instagram.com/_u/${username}`
        : `https://www.instagram.com/${username}`;
      return `<div><a href="${href}">${href}</a></div>`;
    })
    .join('')}</body></html>`;
}

function makeInstagramZip() {
  return createStoredZip([
    {
      name: 'connections/followers_and_following/followers_1.html',
      content: relationshipHtml(['alice', 'bob', 'charlie']),
    },
    {
      name: 'connections/followers_and_following/following.html',
      content: relationshipHtml(['alice', 'bob', 'delta'], true),
    },
    {
      name: 'media/photos/ignored.jpg',
      content: 'ignored media payload',
    },
  ]);
}

async function importFixtureZip(page) {
  await page.getByLabel('Seleziona ZIP esportato da Instagram').setInputFiles({
    name: 'instagram-export.zip',
    mimeType: 'application/zip',
    buffer: makeInstagramZip(),
  });
  await expect(page.getByRole('heading', { name: 'Riepilogo Statistico' })).toBeVisible();
}

test('pagina iniziale mantiene i fix accessibility rilevati da Lighthouse', async ({ page }) => {
  await page.goto('.');

  const analyzeButton = page.getByRole('button', { name: 'Trova chi non ti segue', exact: true });
  await expect(analyzeButton).toBeVisible();
  await expect(analyzeButton).not.toHaveAttribute('aria-label');

  const manualDivider = page.getByText('oppure inserisci i dati manualmente', { exact: true });
  await expect(manualDivider).toHaveCSS('color', 'rgb(148, 163, 184)');

  const accountCounters = page.getByText('0 account rilevati', { exact: true });
  await expect(accountCounters).toHaveCount(2);
  await expect(accountCounters.nth(0)).toHaveCSS('color', 'rgb(148, 163, 184)');
  await expect(accountCounters.nth(1)).toHaveCSS('color', 'rgb(148, 163, 184)');
});

test('ZIP HTML reale con /_u/ produce conteggi corretti e nasconde gli input manuali', async ({ page }) => {
  await page.goto('.');

  await expect(page.getByText('I tuoi Follower', { exact: true })).toBeVisible();
  await importFixtureZip(page);

  await expect(page.getByText('I tuoi Follower', { exact: true })).toHaveCount(0);
  await expect(page.getByText('oppure inserisci i dati manualmente', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Mostra link ai profili', { exact: true })).toHaveCount(0);
  await expect(page.getByText('ZIP Instagram importato', { exact: true })).toHaveCount(0);
  await expect(page.getByText(/STATO:/)).toHaveCount(0);

  await expect(page.getByRole('tab', { name: /Non ti seguono/ })).toContainText('(1)');
  await expect(page.getByRole('tab', { name: /Fan/ })).toContainText('(1)');
  await expect(page.getByRole('tab', { name: /Reciproci/ })).toContainText('(2)');
  await expect(page.getByText('@delta', { exact: true })).toBeVisible();

  await expect(
    page.getByText('Elaborazione locale: il tuo ZIP non viene caricato su server esterni.', { exact: true })
  ).toHaveCount(1);
});

test('Ricomincia azzera i risultati e ripristina il flusso manuale', async ({ page }) => {
  await page.goto('.');
  await importFixtureZip(page);

  await page.getByRole('button', { name: /Ricomincia da capo/ }).click();

  await expect(page.getByText('I tuoi Follower', { exact: true })).toBeVisible();
  await expect(page.getByText('Chi Segui', { exact: true })).toBeVisible();
  await expect(page.getByText('In attesa dei dati', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Riepilogo Statistico' })).toHaveCount(0);
});
