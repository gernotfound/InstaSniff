import { parseInstagramText, sanitizeUsername } from './utils';

export interface InstagramZipImportResult {
  followers: string[];
  following: string[];
  followerFiles: string[];
  followingFiles: string[];
  warnings: string[];
}

interface ZipEntry {
  name: string;
  compressionMethod: number;
  flags: number;
  compressedSize: number;
  uncompressedSize: number;
  localHeaderOffset: number;
}

const EOCD_SIGNATURE = 0x06054b50;
const ZIP64_EOCD_SIGNATURE = 0x06064b50;
const ZIP64_LOCATOR_SIGNATURE = 0x07064b50;
const CENTRAL_FILE_SIGNATURE = 0x02014b50;
const LOCAL_FILE_SIGNATURE = 0x04034b50;
const MAX_EOCD_SEARCH_BYTES = 22 + 65_535;
const MAX_CENTRAL_DIRECTORY_BYTES = 128 * 1024 * 1024;
const MAX_RELATIONSHIP_FILE_BYTES = 96 * 1024 * 1024;

const decoder = new TextDecoder('utf-8');

function toSafeNumber(value: bigint, label: string): number {
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error(`${label} è troppo grande per essere elaborato in sicurezza dal browser.`);
  }
  return Number(value);
}

async function readZipDirectoryLocation(file: File): Promise<{
  centralDirectoryOffset: number;
  centralDirectorySize: number;
}> {
  const tailStart = Math.max(0, file.size - MAX_EOCD_SEARCH_BYTES);
  const tail = new Uint8Array(await file.slice(tailStart).arrayBuffer());
  const view = new DataView(tail.buffer, tail.byteOffset, tail.byteLength);

  let eocdIndex = -1;
  for (let i = tail.length - 22; i >= 0; i -= 1) {
    if (view.getUint32(i, true) === EOCD_SIGNATURE) {
      eocdIndex = i;
      break;
    }
  }

  if (eocdIndex < 0) {
    throw new Error('Il file non sembra essere un archivio ZIP valido o completo.');
  }

  const centralDirectorySize32 = view.getUint32(eocdIndex + 12, true);
  const centralDirectoryOffset32 = view.getUint32(eocdIndex + 16, true);

  if (centralDirectorySize32 !== 0xffffffff && centralDirectoryOffset32 !== 0xffffffff) {
    return {
      centralDirectoryOffset: centralDirectoryOffset32,
      centralDirectorySize: centralDirectorySize32,
    };
  }

  const locatorIndex = eocdIndex - 20;
  if (locatorIndex < 0 || view.getUint32(locatorIndex, true) !== ZIP64_LOCATOR_SIGNATURE) {
    throw new Error(
      'Questo archivio usa ZIP64 ma non contiene un indice leggibile. Prova a richiedere da Instagram solo “Follower e seguiti”.'
    );
  }

  const zip64EocdOffset = toSafeNumber(
    view.getBigUint64(locatorIndex + 8, true),
    'L’offset ZIP64'
  );
  const zip64Header = new Uint8Array(await file.slice(zip64EocdOffset, zip64EocdOffset + 56).arrayBuffer());
  const zip64View = new DataView(zip64Header.buffer, zip64Header.byteOffset, zip64Header.byteLength);

  if (zip64Header.byteLength < 56 || zip64View.getUint32(0, true) !== ZIP64_EOCD_SIGNATURE) {
    throw new Error('Indice ZIP64 non valido o danneggiato.');
  }

  return {
    centralDirectorySize: toSafeNumber(zip64View.getBigUint64(40, true), 'La directory ZIP'),
    centralDirectoryOffset: toSafeNumber(zip64View.getBigUint64(48, true), 'L’offset ZIP'),
  };
}

function parseZip64Extra(
  extra: Uint8Array,
  needs: { uncompressed: boolean; compressed: boolean; offset: boolean }
): Partial<Pick<ZipEntry, 'uncompressedSize' | 'compressedSize' | 'localHeaderOffset'>> {
  const view = new DataView(extra.buffer, extra.byteOffset, extra.byteLength);
  let cursor = 0;

  while (cursor + 4 <= extra.byteLength) {
    const headerId = view.getUint16(cursor, true);
    const dataSize = view.getUint16(cursor + 2, true);
    const dataStart = cursor + 4;
    const dataEnd = dataStart + dataSize;
    if (dataEnd > extra.byteLength) break;

    if (headerId === 0x0001) {
      let p = dataStart;
      const result: Partial<Pick<ZipEntry, 'uncompressedSize' | 'compressedSize' | 'localHeaderOffset'>> = {};

      if (needs.uncompressed && p + 8 <= dataEnd) {
        result.uncompressedSize = toSafeNumber(view.getBigUint64(p, true), 'Un file nello ZIP');
        p += 8;
      }
      if (needs.compressed && p + 8 <= dataEnd) {
        result.compressedSize = toSafeNumber(view.getBigUint64(p, true), 'Un file compresso nello ZIP');
        p += 8;
      }
      if (needs.offset && p + 8 <= dataEnd) {
        result.localHeaderOffset = toSafeNumber(view.getBigUint64(p, true), 'L’offset di un file nello ZIP');
      }

      return result;
    }

    cursor = dataEnd;
  }

  return {};
}

async function listZipEntries(file: File): Promise<ZipEntry[]> {
  const { centralDirectoryOffset, centralDirectorySize } = await readZipDirectoryLocation(file);

  if (centralDirectorySize > MAX_CENTRAL_DIRECTORY_BYTES) {
    throw new Error(
      'L’indice del ZIP è troppo grande. Per InstaSniff esporta da Instagram solo “Follower e seguiti”, intervallo completo, formato JSON.'
    );
  }

  const bytes = new Uint8Array(
    await file.slice(centralDirectoryOffset, centralDirectoryOffset + centralDirectorySize).arrayBuffer()
  );
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const entries: ZipEntry[] = [];
  let offset = 0;

  while (offset + 46 <= bytes.byteLength) {
    if (view.getUint32(offset, true) !== CENTRAL_FILE_SIGNATURE) break;

    const flags = view.getUint16(offset + 8, true);
    const compressionMethod = view.getUint16(offset + 10, true);
    let compressedSize = view.getUint32(offset + 20, true);
    let uncompressedSize = view.getUint32(offset + 24, true);
    const fileNameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    let localHeaderOffset = view.getUint32(offset + 42, true);

    const fileNameStart = offset + 46;
    const extraStart = fileNameStart + fileNameLength;
    const nextOffset = extraStart + extraLength + commentLength;
    if (nextOffset > bytes.byteLength) {
      throw new Error('La directory del ZIP risulta troncata o danneggiata.');
    }

    const fileNameBytes = bytes.subarray(fileNameStart, fileNameStart + fileNameLength);
    const name = decoder.decode(fileNameBytes);

    const needs = {
      uncompressed: uncompressedSize === 0xffffffff,
      compressed: compressedSize === 0xffffffff,
      offset: localHeaderOffset === 0xffffffff,
    };

    if (needs.uncompressed || needs.compressed || needs.offset) {
      const zip64 = parseZip64Extra(bytes.subarray(extraStart, extraStart + extraLength), needs);
      if (needs.uncompressed) uncompressedSize = zip64.uncompressedSize ?? uncompressedSize;
      if (needs.compressed) compressedSize = zip64.compressedSize ?? compressedSize;
      if (needs.offset) localHeaderOffset = zip64.localHeaderOffset ?? localHeaderOffset;
    }

    entries.push({ name, compressionMethod, flags, compressedSize, uncompressedSize, localHeaderOffset });
    offset = nextOffset;
  }

  return entries;
}

function getBaseName(path: string): string {
  const normalized = path.replace(/\\/g, '/').toLowerCase();
  return normalized.split('/').pop() ?? normalized;
}

function followerPartNumber(name: string): number {
  const match = getBaseName(name).match(/^followers_(\d+)\./);
  return match ? Number(match[1]) : 0;
}

function chooseRelationshipEntries(entries: ZipEntry[], kind: 'followers' | 'following'): ZipEntry[] {
  const jsonPattern = kind === 'followers' ? /^followers(?:_\d+)?\.json$/ : /^following(?:_\d+)?\.json$/;
  const htmlPattern = kind === 'followers' ? /^followers(?:_\d+)?\.html?$/ : /^following(?:_\d+)?\.html?$/;

  const jsonEntries = entries.filter((entry) => jsonPattern.test(getBaseName(entry.name)));
  const selected = jsonEntries.length > 0
    ? jsonEntries
    : entries.filter((entry) => htmlPattern.test(getBaseName(entry.name)));

  return [...selected].sort((a, b) => followerPartNumber(a.name) - followerPartNumber(b.name));
}

async function inflateRaw(bytes: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('Il browser non supporta la decompressione ZIP richiesta. Aggiornalo e riprova.');
  }

  try {
    const stream = new Blob([bytes]).stream().pipeThrough(
      new DecompressionStream('deflate-raw' as CompressionFormat)
    );
    return new Uint8Array(await new Response(stream).arrayBuffer());
  } catch {
    throw new Error('Impossibile decomprimere uno dei file dati presenti nel ZIP.');
  }
}

async function readEntryText(file: File, entry: ZipEntry): Promise<string> {
  if (entry.flags & 0x1) {
    throw new Error('Il ZIP risulta cifrato. Scarica l’archivio originale di Instagram senza modificarlo.');
  }
  if (entry.uncompressedSize > MAX_RELATIONSHIP_FILE_BYTES) {
    throw new Error(`Il file ${getBaseName(entry.name)} è insolitamente grande e non verrà aperto per sicurezza.`);
  }

  const localHeader = new Uint8Array(
    await file.slice(entry.localHeaderOffset, entry.localHeaderOffset + 30).arrayBuffer()
  );
  if (localHeader.byteLength < 30) throw new Error('Header ZIP troncato.');
  const localView = new DataView(localHeader.buffer, localHeader.byteOffset, localHeader.byteLength);
  if (localView.getUint32(0, true) !== LOCAL_FILE_SIGNATURE) throw new Error('Header di un file ZIP non valido.');

  const fileNameLength = localView.getUint16(26, true);
  const extraLength = localView.getUint16(28, true);
  const dataStart = entry.localHeaderOffset + 30 + fileNameLength + extraLength;
  const compressed = new Uint8Array(
    await file.slice(dataStart, dataStart + entry.compressedSize).arrayBuffer()
  );

  let uncompressed: Uint8Array;
  if (entry.compressionMethod === 0) {
    uncompressed = compressed;
  } else if (entry.compressionMethod === 8) {
    uncompressed = await inflateRaw(compressed);
  } else {
    throw new Error(`Metodo di compressione ZIP non supportato (${entry.compressionMethod}) per ${getBaseName(entry.name)}.`);
  }

  return decoder.decode(uncompressed).replace(/^\uFEFF/, '');
}

function addCandidate(value: unknown, result: Set<string>): void {
  if (typeof value !== 'string') return;
  const username = sanitizeUsername(value);
  if (username) result.add(username);
}

function collectOfficialJsonUsernames(node: unknown, result: Set<string>): void {
  if (Array.isArray(node)) {
    for (const item of node) collectOfficialJsonUsernames(item, result);
    return;
  }

  if (!node || typeof node !== 'object') return;
  const obj = node as Record<string, unknown>;

  if (Array.isArray(obj.string_list_data)) {
    for (const rawItem of obj.string_list_data) {
      if (!rawItem || typeof rawItem !== 'object') continue;
      const item = rawItem as Record<string, unknown>;
      addCandidate(item.value, result);
      addCandidate(item.href, result);
    }
    addCandidate(obj.title, result);
    return;
  }

  for (const value of Object.values(obj)) {
    if (value && typeof value === 'object') collectOfficialJsonUsernames(value, result);
  }
}

export function extractOfficialInstagramUsernames(content: string, fileName: string): string[] {
  const result = new Set<string>();
  const lowerName = fileName.toLowerCase();

  if (lowerName.endsWith('.json')) {
    try {
      collectOfficialJsonUsernames(JSON.parse(content), result);
      return Array.from(result);
    } catch {
      throw new Error(`${getBaseName(fileName)} non contiene JSON valido.`);
    }
  }

  const hrefRegex = /href=["']([^"']+)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = hrefRegex.exec(content)) !== null) addCandidate(match[1], result);

  if (result.size === 0) {
    for (const username of parseInstagramText(content)) result.add(username);
  }

  return Array.from(result);
}

async function readSelectedEntries(file: File, entries: ZipEntry[]): Promise<string[]> {
  const usernames = new Set<string>();
  for (const entry of entries) {
    const text = await readEntryText(file, entry);
    for (const username of extractOfficialInstagramUsernames(text, entry.name)) usernames.add(username);
  }
  return Array.from(usernames);
}

export async function importInstagramZip(file: File): Promise<InstagramZipImportResult> {
  if (!file || file.size === 0) throw new Error('Seleziona un file ZIP non vuoto.');
  if (!file.name.toLowerCase().endsWith('.zip')) throw new Error('Seleziona il file .zip scaricato da Instagram/Meta.');

  const entries = await listZipEntries(file);
  const followerEntries = chooseRelationshipEntries(entries, 'followers');
  const followingEntries = chooseRelationshipEntries(entries, 'following');

  if (followerEntries.length === 0 || followingEntries.length === 0) {
    const missing = [
      followerEntries.length === 0 ? 'followers_1.json' : null,
      followingEntries.length === 0 ? 'following.json' : null,
    ].filter(Boolean).join(' e ');

    throw new Error(
      `Nel ZIP non trovo ${missing}. In Centro gestione account esporta “Follower e seguiti”, intervallo “Dall’inizio”, preferibilmente in JSON.`
    );
  }

  const [followers, following] = await Promise.all([
    readSelectedEntries(file, followerEntries),
    readSelectedEntries(file, followingEntries),
  ]);

  if (followers.length === 0 || following.length === 0) {
    throw new Error(
      'I file follower/seguiti sono presenti, ma non contengono account leggibili. Verifica di aver richiesto l’intervallo completo.'
    );
  }

  const usingHtml = [...followerEntries, ...followingEntries].some((entry) => /\.html?$/i.test(entry.name));
  const warnings: string[] = [];
  if (usingHtml) warnings.push('Export HTML rilevato: il formato JSON è consigliato perché più strutturato.');
  if (followerEntries.length > 1) warnings.push(`Uniti automaticamente ${followerEntries.length} file follower.`);

  return {
    followers,
    following,
    followerFiles: followerEntries.map((entry) => entry.name),
    followingFiles: followingEntries.map((entry) => entry.name),
    warnings,
  };
}
