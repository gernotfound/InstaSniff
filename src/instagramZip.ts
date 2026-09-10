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
  crc32: number;
  compressedSize: number;
  uncompressedSize: number;
  localHeaderOffset: number;
}

interface ZipDirectoryLocation {
  centralDirectoryOffset: number;
  centralDirectorySize: number;
  entryCount: number;
}

interface RelationshipEntryGroups {
  followersJson: ZipEntry[];
  followersHtml: ZipEntry[];
  followingJson: ZipEntry[];
  followingHtml: ZipEntry[];
}

const EOCD_SIGNATURE = 0x06054b50;
const ZIP64_EOCD_SIGNATURE = 0x06064b50;
const ZIP64_LOCATOR_SIGNATURE = 0x07064b50;
const CENTRAL_FILE_SIGNATURE = 0x02014b50;
const LOCAL_FILE_SIGNATURE = 0x04034b50;
const CENTRAL_DIGITAL_SIGNATURE = 0x05054b50;
const MAX_EOCD_SEARCH_BYTES = 22 + 65_535;
const MAX_CENTRAL_DIRECTORY_BYTES = 64 * 1024 * 1024;
const MAX_ZIP_ENTRIES = 1_000_000;
const MAX_RELATIONSHIP_FILES = 1_000;
const MAX_RELATIONSHIP_FILE_BYTES = 64 * 1024 * 1024;
const MAX_TOTAL_RELATIONSHIP_BYTES = 96 * 1024 * 1024;
const LARGE_JSON_PARSE_THRESHOLD = 6 * 1024 * 1024;
const MAX_JSON_NODES = 1_000_000;

const decoder = new TextDecoder('utf-8', { fatal: false });

function toSafeNumber(value: bigint, label: string): number {
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error(`${label} è troppo grande per essere elaborato in sicurezza dal browser.`);
  }
  return Number(value);
}

function assertSliceBounds(start: number, length: number, fileSize: number, label: string): void {
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(length) || start < 0 || length < 0) {
    throw new Error(`${label} contiene valori non validi.`);
  }
  if (start > fileSize || length > fileSize - start) {
    throw new Error(`${label} punta fuori dai limiti del file ZIP.`);
  }
}

function findEocdIndex(tail: Uint8Array): number {
  if (tail.byteLength < 22) return -1;
  const view = new DataView(tail.buffer, tail.byteOffset, tail.byteLength);

  for (let i = tail.byteLength - 22; i >= 0; i -= 1) {
    if (view.getUint32(i, true) !== EOCD_SIGNATURE) continue;
    const commentLength = view.getUint16(i + 20, true);
    if (i + 22 + commentLength === tail.byteLength) return i;
  }

  return -1;
}

async function readZipDirectoryLocation(file: File): Promise<ZipDirectoryLocation> {
  const tailStart = Math.max(0, file.size - MAX_EOCD_SEARCH_BYTES);
  const tail = new Uint8Array(await file.slice(tailStart).arrayBuffer());
  const view = new DataView(tail.buffer, tail.byteOffset, tail.byteLength);
  const eocdIndex = findEocdIndex(tail);

  if (eocdIndex < 0) {
    throw new Error('Il file non sembra essere un archivio ZIP valido o completo.');
  }

  const diskNumber = view.getUint16(eocdIndex + 4, true);
  const centralDirectoryDisk = view.getUint16(eocdIndex + 6, true);
  const entriesOnDisk = view.getUint16(eocdIndex + 8, true);
  const totalEntries16 = view.getUint16(eocdIndex + 10, true);
  const centralDirectorySize32 = view.getUint32(eocdIndex + 12, true);
  const centralDirectoryOffset32 = view.getUint32(eocdIndex + 16, true);

  if (diskNumber !== 0 || centralDirectoryDisk !== 0) {
    throw new Error('Gli archivi ZIP suddivisi su più file non sono supportati. Usa il file ZIP originale scaricato da Meta.');
  }

  const needsZip64 =
    entriesOnDisk === 0xffff ||
    totalEntries16 === 0xffff ||
    centralDirectorySize32 === 0xffffffff ||
    centralDirectoryOffset32 === 0xffffffff;

  if (!needsZip64) {
    if (entriesOnDisk !== totalEntries16) {
      throw new Error('L’indice ZIP non è coerente: il file potrebbe essere incompleto.');
    }
    return {
      centralDirectoryOffset: centralDirectoryOffset32,
      centralDirectorySize: centralDirectorySize32,
      entryCount: totalEntries16,
    };
  }

  const locatorIndex = eocdIndex - 20;
  if (locatorIndex < 0 || view.getUint32(locatorIndex, true) !== ZIP64_LOCATOR_SIGNATURE) {
    throw new Error('Questo archivio usa ZIP64 ma non contiene un indice leggibile.');
  }

  const zip64Disk = view.getUint32(locatorIndex + 4, true);
  const totalDisks = view.getUint32(locatorIndex + 16, true);
  if (zip64Disk !== 0 || totalDisks !== 1) {
    throw new Error('Gli archivi ZIP64 suddivisi su più file non sono supportati.');
  }

  const zip64EocdOffset = toSafeNumber(view.getBigUint64(locatorIndex + 8, true), 'L’offset ZIP64');
  assertSliceBounds(zip64EocdOffset, 56, file.size, 'L’indice ZIP64');

  const zip64Header = new Uint8Array(await file.slice(zip64EocdOffset, zip64EocdOffset + 56).arrayBuffer());
  const zip64View = new DataView(zip64Header.buffer, zip64Header.byteOffset, zip64Header.byteLength);

  if (zip64Header.byteLength < 56 || zip64View.getUint32(0, true) !== ZIP64_EOCD_SIGNATURE) {
    throw new Error('Indice ZIP64 non valido o danneggiato.');
  }

  const diskNumber64 = zip64View.getUint32(16, true);
  const centralDirectoryDisk64 = zip64View.getUint32(20, true);
  const entriesOnDisk64 = zip64View.getBigUint64(24, true);
  const totalEntries64 = zip64View.getBigUint64(32, true);
  if (diskNumber64 !== 0 || centralDirectoryDisk64 !== 0 || entriesOnDisk64 !== totalEntries64) {
    throw new Error('L’indice ZIP64 indica un archivio multi-volume o incoerente, non supportato.');
  }

  return {
    centralDirectorySize: toSafeNumber(zip64View.getBigUint64(40, true), 'La directory ZIP'),
    centralDirectoryOffset: toSafeNumber(zip64View.getBigUint64(48, true), 'L’offset ZIP'),
    entryCount: toSafeNumber(totalEntries64, 'Il numero di file nello ZIP'),
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

function getBaseName(path: string): string {
  const normalized = path.replace(/\\/g, '/').toLowerCase();
  return normalized.split('/').pop() ?? normalized;
}

function relationshipPartNumber(name: string): number {
  const match = getBaseName(name).match(/^(?:followers|following)_(\d+)\./);
  return match ? Number(match[1]) : 0;
}

function classifyRelationshipEntry(name: string): keyof RelationshipEntryGroups | null {
  const baseName = getBaseName(name);
  if (/^followers(?:_\d+)?\.json$/.test(baseName)) return 'followersJson';
  if (/^followers(?:_\d+)?\.html?$/.test(baseName)) return 'followersHtml';
  if (/^following(?:_\d+)?\.json$/.test(baseName)) return 'followingJson';
  if (/^following(?:_\d+)?\.html?$/.test(baseName)) return 'followingHtml';
  return null;
}

function selectPreferredEntries(jsonEntries: ZipEntry[], htmlEntries: ZipEntry[]): ZipEntry[] {
  const selected = jsonEntries.length > 0 ? jsonEntries : htmlEntries;
  return [...selected].sort((a, b) => relationshipPartNumber(a.name) - relationshipPartNumber(b.name));
}

async function findRelationshipEntries(file: File): Promise<{
  followerEntries: ZipEntry[];
  followingEntries: ZipEntry[];
}> {
  const { centralDirectoryOffset, centralDirectorySize, entryCount } = await readZipDirectoryLocation(file);

  if (entryCount > MAX_ZIP_ENTRIES) {
    throw new Error(`Il ZIP contiene un numero anomalo di file (${entryCount}) e non verrà elaborato.`);
  }
  if (centralDirectorySize > MAX_CENTRAL_DIRECTORY_BYTES) {
    throw new Error('L’indice del ZIP è troppo grande per essere elaborato in sicurezza nel browser.');
  }

  assertSliceBounds(centralDirectoryOffset, centralDirectorySize, file.size, 'La directory centrale ZIP');
  const bytes = new Uint8Array(
    await file.slice(centralDirectoryOffset, centralDirectoryOffset + centralDirectorySize).arrayBuffer()
  );
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const groups: RelationshipEntryGroups = {
    followersJson: [],
    followersHtml: [],
    followingJson: [],
    followingHtml: [],
  };

  let offset = 0;
  let processedEntries = 0;

  while (processedEntries < entryCount) {
    if (offset + 46 > bytes.byteLength || view.getUint32(offset, true) !== CENTRAL_FILE_SIGNATURE) {
      throw new Error('La directory del ZIP risulta troncata o danneggiata.');
    }

    const flags = view.getUint16(offset + 8, true);
    const compressionMethod = view.getUint16(offset + 10, true);
    const crc32 = view.getUint32(offset + 16, true);
    let compressedSize = view.getUint32(offset + 20, true);
    let uncompressedSize = view.getUint32(offset + 24, true);
    const fileNameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const diskStart = view.getUint16(offset + 34, true);
    let localHeaderOffset = view.getUint32(offset + 42, true);

    if (diskStart !== 0 && diskStart !== 0xffff) {
      throw new Error('Il ZIP contiene file distribuiti su più volumi, non supportati.');
    }

    const fileNameStart = offset + 46;
    const extraStart = fileNameStart + fileNameLength;
    const nextOffset = extraStart + extraLength + commentLength;
    if (nextOffset > bytes.byteLength) {
      throw new Error('La directory del ZIP risulta troncata o danneggiata.');
    }

    const name = decoder.decode(bytes.subarray(fileNameStart, fileNameStart + fileNameLength));
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

    if (uncompressedSize === 0xffffffff || compressedSize === 0xffffffff || localHeaderOffset === 0xffffffff) {
      throw new Error(`Metadati ZIP64 incompleti per ${name || 'un file'}.`);
    }
    if (!Number.isSafeInteger(localHeaderOffset) || localHeaderOffset < 0 || localHeaderOffset >= file.size) {
      throw new Error(`Offset ZIP non valido per ${name || 'un file'}.`);
    }

    const group = classifyRelationshipEntry(name);
    if (group) {
      groups[group].push({ name, compressionMethod, flags, crc32, compressedSize, uncompressedSize, localHeaderOffset });
      if (groups[group].length > MAX_RELATIONSHIP_FILES) {
        throw new Error('Il ZIP contiene un numero anomalo di file follower/seguiti e non verrà elaborato.');
      }
    }

    processedEntries += 1;
    offset = nextOffset;
  }

  if (offset < bytes.byteLength) {
    const remaining = bytes.byteLength - offset;
    const hasDigitalSignature = remaining >= 6 && view.getUint32(offset, true) === CENTRAL_DIGITAL_SIGNATURE;
    if (!hasDigitalSignature) {
      throw new Error('La directory centrale ZIP contiene dati inattesi.');
    }
  }

  return {
    followerEntries: selectPreferredEntries(groups.followersJson, groups.followersHtml),
    followingEntries: selectPreferredEntries(groups.followingJson, groups.followingHtml),
  };
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

function calculateCrc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = CRC32_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function concatChunks(chunks: Uint8Array[], totalBytes: number): Uint8Array {
  const output = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return output;
}

async function inflateRaw(bytes: Uint8Array, expectedBytes: number, fileName: string): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('Il browser non supporta la decompressione ZIP richiesta. Aggiornalo e riprova.');
  }

  let reader: ReadableStreamDefaultReader<Uint8Array>;
  try {
    const stream = new Blob([bytes]).stream().pipeThrough(
      new DecompressionStream('deflate-raw' as CompressionFormat)
    );
    reader = stream.getReader();
  } catch {
    throw new Error(`Impossibile inizializzare la decompressione di ${fileName}.`);
  }

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    let part: ReadableStreamReadResult<Uint8Array>;
    try {
      part = await reader.read();
    } catch {
      throw new Error(`Impossibile decomprimere ${fileName}: il file potrebbe essere danneggiato.`);
    }
    if (part.done) break;
    if (!part.value) continue;

    totalBytes += part.value.byteLength;
    if (totalBytes > MAX_RELATIONSHIP_FILE_BYTES || totalBytes > expectedBytes) {
      await reader.cancel().catch(() => undefined);
      throw new Error(`${fileName} supera la dimensione dichiarata o il limite di sicurezza durante la decompressione.`);
    }
    chunks.push(part.value);
  }

  if (totalBytes !== expectedBytes) {
    throw new Error(`${fileName} ha una dimensione decompressa diversa da quella dichiarata: il ZIP potrebbe essere corrotto.`);
  }

  return concatChunks(chunks, totalBytes);
}

async function readEntryText(file: File, entry: ZipEntry): Promise<string> {
  const fileName = getBaseName(entry.name) || 'file dati';
  if ((entry.flags & 0x1) !== 0 || (entry.flags & 0x40) !== 0) {
    throw new Error('Il ZIP risulta cifrato. Scarica l’archivio originale di Instagram senza modificarlo.');
  }
  if (entry.uncompressedSize > MAX_RELATIONSHIP_FILE_BYTES) {
    throw new Error(`${fileName} è troppo grande per essere aperto in sicurezza nel browser.`);
  }
  if (entry.compressionMethod !== 0 && entry.compressionMethod !== 8) {
    throw new Error(`Metodo di compressione ZIP non supportato (${entry.compressionMethod}) per ${fileName}.`);
  }

  assertSliceBounds(entry.localHeaderOffset, 30, file.size, `L’header di ${fileName}`);
  const localHeader = new Uint8Array(await file.slice(entry.localHeaderOffset, entry.localHeaderOffset + 30).arrayBuffer());
  const localView = new DataView(localHeader.buffer, localHeader.byteOffset, localHeader.byteLength);
  if (localHeader.byteLength < 30 || localView.getUint32(0, true) !== LOCAL_FILE_SIGNATURE) {
    throw new Error(`Header ZIP non valido per ${fileName}.`);
  }

  const localFlags = localView.getUint16(6, true);
  const localCompressionMethod = localView.getUint16(8, true);
  const fileNameLength = localView.getUint16(26, true);
  const extraLength = localView.getUint16(28, true);
  if ((localFlags & 0x1) !== 0 || (localFlags & 0x40) !== 0) {
    throw new Error('Il ZIP risulta cifrato. Scarica l’archivio originale di Instagram senza modificarlo.');
  }
  if (localCompressionMethod !== entry.compressionMethod) {
    throw new Error(`Metadati di compressione incoerenti per ${fileName}.`);
  }

  const localNameStart = entry.localHeaderOffset + 30;
  assertSliceBounds(localNameStart, fileNameLength + extraLength, file.size, `I metadati locali di ${fileName}`);
  const localNameBytes = new Uint8Array(await file.slice(localNameStart, localNameStart + fileNameLength).arrayBuffer());
  const localName = decoder.decode(localNameBytes);
  if (getBaseName(localName) !== getBaseName(entry.name)) {
    throw new Error(`L’indice ZIP non corrisponde al contenuto locale di ${fileName}.`);
  }

  const dataStart = localNameStart + fileNameLength + extraLength;
  assertSliceBounds(dataStart, entry.compressedSize, file.size, `I dati compressi di ${fileName}`);
  const compressed = new Uint8Array(await file.slice(dataStart, dataStart + entry.compressedSize).arrayBuffer());

  let uncompressed: Uint8Array;
  if (entry.compressionMethod === 0) {
    if (compressed.byteLength !== entry.uncompressedSize) {
      throw new Error(`${fileName} ha una dimensione non coerente con l’indice ZIP.`);
    }
    uncompressed = compressed;
  } else {
    uncompressed = await inflateRaw(compressed, entry.uncompressedSize, fileName);
  }

  if (calculateCrc32(uncompressed) !== entry.crc32) {
    throw new Error(`${fileName} non supera il controllo di integrità CRC: il ZIP potrebbe essere danneggiato.`);
  }

  return decoder.decode(uncompressed).replace(/^\uFEFF/, '');
}

function extractInstagramProfileUsername(value: string): string | null {
  const normalized = value.replace(/\\\//g, '/').trim();
  const match = normalized.match(
    /(?:https?:\/\/)?(?:www\.)?instagram\.com\/(?:_u\/)?([a-zA-Z0-9._]{1,30})(?=\/|[?#]|$)/i
  );
  return match?.[1] ? sanitizeUsername(match[1]) : null;
}

function addCandidate(value: unknown, result: Set<string>): void {
  if (typeof value !== 'string') return;
  const username = extractInstagramProfileUsername(value) ?? sanitizeUsername(value);
  if (username) result.add(username);
}

function collectOfficialJsonUsernames(node: unknown, result: Set<string>): void {
  const stack: unknown[] = [node];
  let visited = 0;

  while (stack.length > 0) {
    visited += 1;
    if (visited > MAX_JSON_NODES) {
      throw new Error('Il JSON contiene una struttura insolitamente complessa e non verrà elaborato.');
    }

    const current = stack.pop();
    if (!current || typeof current !== 'object') continue;

    if (Array.isArray(current)) {
      for (let i = current.length - 1; i >= 0; i -= 1) stack.push(current[i]);
      continue;
    }

    const obj = current as Record<string, unknown>;
    if (Array.isArray(obj.string_list_data)) {
      for (const rawItem of obj.string_list_data) {
        if (!rawItem || typeof rawItem !== 'object') continue;
        const item = rawItem as Record<string, unknown>;
        addCandidate(item.value, result);
        addCandidate(item.href, result);
      }
      addCandidate(obj.title, result);
      continue;
    }

    for (const value of Object.values(obj)) {
      if (value && typeof value === 'object') stack.push(value);
    }
  }
}

function collectLargeOfficialJsonByPattern(content: string, result: Set<string>): void {
  const directValuePattern = /"(?:value|title)"\s*:\s*"([a-zA-Z0-9._]{1,30})"/g;
  const hrefPattern = /"href"\s*:\s*"([^"]+)"/gi;
  let match: RegExpExecArray | null;

  while ((match = directValuePattern.exec(content)) !== null) addCandidate(match[1], result);
  while ((match = hrefPattern.exec(content)) !== null) addCandidate(match[1], result);
}

export function extractOfficialInstagramUsernames(content: string, fileName: string): string[] {
  const result = new Set<string>();
  const lowerName = fileName.toLowerCase();

  if (lowerName.endsWith('.json')) {
    if (content.length > LARGE_JSON_PARSE_THRESHOLD) {
      collectLargeOfficialJsonByPattern(content, result);
      if (result.size > 0) return Array.from(result);
    }

    try {
      collectOfficialJsonUsernames(JSON.parse(content), result);
      return Array.from(result);
    } catch (error) {
      if (error instanceof Error && error.message.includes('insolitamente complessa')) throw error;
      throw new Error(`${getBaseName(fileName)} non contiene JSON valido o leggibile.`);
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

function validateSelectedEntries(entries: ZipEntry[]): void {
  let totalUncompressedBytes = 0;
  for (const entry of entries) {
    if (entry.uncompressedSize > MAX_RELATIONSHIP_FILE_BYTES) {
      throw new Error(`${getBaseName(entry.name)} è troppo grande per essere elaborato in sicurezza nel browser.`);
    }
    totalUncompressedBytes += entry.uncompressedSize;
    if (totalUncompressedBytes > MAX_TOTAL_RELATIONSHIP_BYTES) {
      throw new Error('I file follower/seguiti nell’archivio sono troppo grandi nel complesso.');
    }
  }
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

  const { followerEntries, followingEntries } = await findRelationshipEntries(file);

  if (followerEntries.length === 0 || followingEntries.length === 0) {
    const missing = [
      followerEntries.length === 0 ? 'followers_1.json' : null,
      followingEntries.length === 0 ? 'following.json' : null,
    ].filter(Boolean).join(' e ');

    throw new Error(
      `Nel ZIP non trovo ${missing}. In Centro gestione account esporta “Follower e seguiti”, intervallo “Dall’inizio”, in JSON o HTML.`
    );
  }

  validateSelectedEntries([...followerEntries, ...followingEntries]);
  const [followers, following] = await Promise.all([
    readSelectedEntries(file, followerEntries),
    readSelectedEntries(file, followingEntries),
  ]);

  const usingHtml = [...followerEntries, ...followingEntries].some((entry) => /\.html?$/i.test(entry.name));
  const warnings: string[] = [];
  if (usingHtml) warnings.push('Export HTML rilevato.');
  if (followerEntries.length > 1) warnings.push(`Uniti automaticamente ${followerEntries.length} file follower.`);
  if (followingEntries.length > 1) warnings.push(`Uniti automaticamente ${followingEntries.length} file seguiti.`);
  if (followers.length === 0) warnings.push('Il file follower è valido ma non contiene account.');
  if (following.length === 0) warnings.push('Il file seguiti è valido ma non contiene account.');

  return {
    followers,
    following,
    followerFiles: followerEntries.map((entry) => entry.name),
    followingFiles: followingEntries.map((entry) => entry.name),
    warnings,
  };
}
