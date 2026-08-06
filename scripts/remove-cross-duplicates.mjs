/**
 * Removes all additionalCompanies entries in data/directory.ts whose slugs
 * also appear in data/brokers.ts. The brokers.ts entry is canonical — it's
 * merged first in the array and contains the full enriched data.
 *
 * Deletion is applied highest-line-number first so earlier offsets stay valid.
 */
import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dirFile = resolve(__dirname, '../data/directory.ts')

// All 62 slugs that exist in both brokers.ts and directory.ts additionalCompanies.
// The additionalCompanies section spans lines 80–30436 (before the merge at line 30494).
const CROSS_SLUGS = [
  'acy-securities', 'admirals', 'alpari', 'amarkets', 'atc-brokers', 'axi',
  'bdswiss', 'blackbull-markets', 'capital-com', 'cfi-financial', 'deriv',
  'doo-prime', 'easymarkets', 'eightcap', 'equiti', 'eurotrader', 'exness',
  'fbs', 'fibo-group', 'forex-com', 'forexmart', 'fp-markets', 'fusion-markets',
  'fxgt', 'fxpro', 'fxtm', 'gbe-brokers', 'global-prime', 'go-markets',
  'hantec-markets', 'hfm', 'hycm', 'ic-markets', 'infinox', 'instaforex',
  'interactive-brokers', 'ironfx', 'justmarkets', 'libertex', 'litefinance',
  'markets-com', 'moneta-markets', 'naga', 'nordfx', 'oanda', 'octa',
  'roboforex', 'skilling', 'squared-financial', 'swissquote', 't4trade',
  'thinkmarkets', 'tickmill', 'tmgm', 'topfx', 'vantage', 'vt-markets',
  'weltrade', 'windsor-brokers', 'xtb',
]

const lines = readFileSync(dirFile, 'utf8').split('\n')
const total = lines.length
console.log(`Total lines: ${total}`)

// additionalCompanies section: lines 80–30436 (1-indexed → 0-indexed: 79–30435)
const SECTION_START = 79   // 0-indexed
const SECTION_END   = 30435 // 0-indexed (inclusive)

// Find all blocks to delete. Each block is: open-brace line … closing-brace line.
const blocksToDelete = [] // [{start, end}] 0-indexed, inclusive

const slugSet = new Set(CROSS_SLUGS)

for (let i = SECTION_START; i <= SECTION_END; i++) {
  const m = lines[i].match(/^\s+slug:\s+'([^']+)'/)
  if (!m) continue
  const slug = m[1]
  if (!slugSet.has(slug)) continue

  // Walk back to find the opening brace '  {'
  let start = i
  while (start > SECTION_START && !/^\s+\{$/.test(lines[start])) start--

  // Walk forward to find the closing '},' or '}'
  let end = i
  while (end < SECTION_END && !/^\s+\},?$/.test(lines[end])) end++

  blocksToDelete.push({ slug, start, end })
}

console.log(`Found ${blocksToDelete.length} blocks to delete`)
if (blocksToDelete.length !== CROSS_SLUGS.length) {
  console.warn(`WARNING: expected ${CROSS_SLUGS.length}, found ${blocksToDelete.length}`)
}

// Sort descending by start line so we delete from the bottom up
blocksToDelete.sort((a, b) => b.start - a.start)

// Delete each block
for (const { slug, start, end } of blocksToDelete) {
  console.log(`  Deleting ${slug}: lines ${start + 1}–${end + 1} (${end - start + 1} lines)`)
  lines.splice(start, end - start + 1)
}

writeFileSync(dirFile, lines.join('\n'), 'utf8')
console.log(`Done. New line count: ${lines.length} (removed ${total - lines.length} lines)`)
