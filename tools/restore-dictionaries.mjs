#!/usr/bin/env node
/**
 * Restores the language gate's word lists from `tools/dictionaries.lock.json` into the
 * untracked cache the lock names — the same split as `package-lock.json` and
 * `node_modules` (decision 0040). The gate used to read `/usr/share/dict`, and that is an
 * ambient fact of the machine: absent on a fresh runner, and versioned by whatever the
 * distribution last shipped. The lock's hashes are the identity of the input; this module
 * is only the road from them to two files on disk.
 *
 * EVERY STEP IS VERIFIED AT BOTH ENDS, and that is why the unpackers may be the ~30 hand
 * lines they are with no fixture tree behind them: the fetched archive must match the
 * lock's deb hash BEFORE anything parses it — so the parsers only ever see bytes that were
 * inspected when the pin was made — and the extracted list must match the lock's file hash
 * AFTER, so any parsing fault whatsoever lands as a loud mismatch rather than a silently
 * wrong word list. The one thing this arrangement cannot catch is a wrong hash written
 * into the lock itself, which is exactly the line a review of a pin bump is for.
 *
 * A deb is `ar`, holding `data.tar.zst`; zstd is in node's own zlib and tar is 512-byte
 * headers — so the whole road is the standard library, and a network request on a cold
 * cache (`check-consumer` walks the same kind of road to the registry). Warm, it is two
 * hash checks and no network at all.
 *
 * Usage: node tools/restore-dictionaries.mjs — or through any gate that needs the lists.
 */
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { zstdDecompressSync } from 'node:zlib';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LOCK = 'tools/dictionaries.lock.json';

export class DictionaryError extends Error {
  constructor(rule, description) {
    super(description);
    this.rule = rule;
  }
}

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

/**
 * One member of an `ar` archive, by name. The format is a fixed global magic and 60-byte
 * member headers: name in the first 16 bytes (GNU pads short names with a trailing `/`),
 * decimal size at offset 48, data aligned to two bytes.
 */
const arMember = (archive, name) => {
  if (archive.subarray(0, 8).toString('latin1') !== '!<arch>\n')
    throw new DictionaryError(
      'not-a-deb',
      `the fetched file is not an \`ar\` archive — a deb always is. An HTML error page ` +
        `from a mirror in trouble is the classic body here.`,
    );
  let at = 8;
  while (at + 60 <= archive.length) {
    const header = archive.subarray(at, at + 60);
    const member = header
      .subarray(0, 16)
      .toString('latin1')
      .trim()
      .replace(/\/$/, '');
    const size = parseInt(header.subarray(48, 58).toString('latin1'), 10);
    if (member === name) return archive.subarray(at + 60, at + 60 + size);
    at += 60 + size + (size % 2);
  }
  return null;
};

/**
 * One member of a tar, by path. 512-byte headers: a name in the first 100 bytes ending
 * at the first zero byte, octal size at offset 124, data padded to the block. The paths a deb writes are
 * short, so the ustar `prefix` field never carries anything here — and if that assumption
 * ever broke, the member would go unfound and the caller fails loudly, not wrongly.
 */
const tarMember = (archive, path) => {
  let at = 0;
  while (at + 512 <= archive.length) {
    const header = archive.subarray(at, at + 512);
    const name = header.subarray(0, 100).toString('latin1').split('\0')[0];
    if (!name) break; // the terminating run of zero blocks
    const size = parseInt(header.subarray(124, 136).toString('latin1'), 8);
    if (name === path) return archive.subarray(at + 512, at + 512 + size);
    at += 512 + Math.ceil(size / 512) * 512;
  }
  return null;
};

const fetched = async (entry) => {
  let response;
  try {
    response = await fetch(entry.url);
  } catch (cause) {
    throw new DictionaryError(
      'unreachable',
      `\`${entry.url}\` could not be fetched (${cause.cause?.code ?? cause.message}). ` +
        `The hash is the identity, the URL only a road: any mirror serving ` +
        `${entry.package} at sha256 \`${entry.deb.sha256}\` restores the same input.`,
    );
  }
  if (!response.ok)
    throw new DictionaryError(
      'unreachable',
      `\`${entry.url}\` answered ${response.status}. Pools rotate superseded versions — ` +
        `that is the event this lock exists for. Any mirror serving ${entry.package} at ` +
        `sha256 \`${entry.deb.sha256}\` restores the same input; point \`url\` at one.`,
    );
  return Buffer.from(await response.arrayBuffer());
};

/**
 * Ensures every list the lock names is in the cache and matches its hash — fetching,
 * verifying and unpacking whatever is missing or wrong. A tampered or half-written cache
 * file is therefore not an error but a refetch: the hash check runs on EVERY restore, so
 * the cache never has to be trusted, only the lock. Returns `{ paths, report }`.
 */
export const restoreDictionaries = async () => {
  const lock = JSON.parse(readFileSync(join(ROOT, LOCK), 'utf8'));
  const paths = {};
  const report = [];
  for (const entry of lock.dictionaries) {
    const path = join(ROOT, lock.cache, entry.name);
    paths[entry.name] = path;
    if (existsSync(path) && sha256(readFileSync(path)) === entry.file.sha256) {
      report.push(`${entry.name} verified in the cache`);
      continue;
    }
    const deb = await fetched(entry);
    if (sha256(deb) !== entry.deb.sha256)
      throw new DictionaryError(
        'archive-mismatch',
        `\`${entry.url}\` served ${deb.length} bytes whose sha256 is not the lock's. ` +
          `The road answered with SOMETHING — but not the pinned ${entry.package}, and a ` +
          `word list of unknown version is the exact input this lock retired.`,
      );
    const compressed = arMember(deb, 'data.tar.zst');
    if (!compressed)
      throw new DictionaryError(
        'member-missing',
        `the archive of ${entry.package} holds no \`data.tar.zst\`. The pin was made on ` +
          `a zstd-built deb — node's zlib reads no xz, so a re-pin has to stay on one ` +
          `(Debian's own builds of these packages are the xz era; Ubuntu's are zstd).`,
      );
    const file = tarMember(zstdDecompressSync(compressed), entry.member);
    if (!file)
      throw new DictionaryError(
        'member-missing',
        `\`${entry.member}\` is not in the data archive of ${entry.package} — the ` +
          `package moved its payload, which a version bump may legitimately do; re-pin ` +
          `with the member path the new version really uses.`,
      );
    if (sha256(file) !== entry.file.sha256)
      throw new DictionaryError(
        'file-mismatch',
        `the extracted \`${entry.name}\` does not match the lock's file hash. The deb ` +
          `itself verified, so this is the unpacking road broken between two good ends — ` +
          `fix the road, never the hash: rewriting the expectation to match a wrong ` +
          `output is how a verified input turns back into an ambient one.`,
      );
    mkdirSync(join(ROOT, lock.cache), { recursive: true });
    writeFileSync(`${path}.part`, file);
    renameSync(`${path}.part`, path);
    report.push(`${entry.name} fetched and verified (${file.length} bytes)`);
  }
  return { paths, report };
};

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    const { report } = await restoreDictionaries();
    console.log(`✓ Dictionaries: ${report.join(', ')}.`);
  } catch (error) {
    if (!(error instanceof DictionaryError)) throw error;
    console.error(`X Dictionaries — ${error.rule}: ${error.message}`);
    process.exit(1);
  }
}
