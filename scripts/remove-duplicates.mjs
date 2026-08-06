/**
 * Removes 32 duplicate brand entries from data/directory.ts.
 *
 * Deletions are applied from the highest line number downward so that
 * earlier line ranges remain valid throughout the process.
 *
 * Each range is INCLUSIVE (start line through end line).
 */
import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const FILE = resolve(__dirname, '../data/directory.ts')

// [slug, startLine, endLine] — end is inclusive
// Ordered here arbitrarily; the script will sort by startLine DESC before applying.
const BLOCKS_TO_DELETE = [
  // ── Category A: same slug, second (stale stub) occurrence ─────────────────
  ['aft-fx (2nd)',                   14305, 14320],
  ['ark-world-market (2nd)',         14465, 14480],
  ['audacity-capital (2nd)',         30626, 30641],
  ['brokercreditservice-cyprus (2nd)', 14689, 14704],
  ['cambiste (2nd)',                 14705, 14720],
  ['caya-capital-markets (2nd)',     14769, 14784],
  ['cfd-market (2nd)',               14785, 14800],
  ['cfi-financial (2nd)',            26653, 26668],
  ['cobra-trading (2nd)',            14849, 14864],
  ['daniels-trading (2nd)',          25793, 25808],
  ['dorman-trading (2nd)',           28201, 28216],
  ['everybody-fx (2nd)',             15217, 15232],
  ['ftmo (2nd)',                     30466, 30481],
  ['funding-traders (2nd)',          26009, 26024],
  ['kvb-prime (2nd)',                27441, 27456],
  ['marex (2nd)',                    30446, 30461],
  ['nadex (2nd)',                    30150, 30165],
  ['optimus-futures (2nd)',          28137, 28152],
  ['prop-number-one (2nd)',          26137, 26152],
  ['rj-obrien (2nd)',                25761, 25776],
  ['tanius-technology (2nd)',        18573, 18588],
  ['taurex (2nd)',                   27829, 27844],
  ['the-funded-trader (2nd)',        30850, 30865],
  ['tp-icap (2nd)',                  20557, 20572],
  ['winton (2nd)',                   19941, 19956],
  // ── Category B: same name, different (lower-quality) slug ─────────────────
  ['tradeview-markets',              29634, 29649],
  ['systematica-investments',        18557, 18572],
  ['stake',                          22653, 22668],
  ['stage-5-trading',                25697, 25712],
  ['ironbeam',                       25665, 25680],
  ['cannon-trading',                 28169, 28184],
  ['aqr-capital-management',         19973, 19988],
]

// Sort descending by start line so we delete from the bottom up
BLOCKS_TO_DELETE.sort((a, b) => b[1] - a[1])

const raw = readFileSync(FILE, 'utf8')
let lines = raw.split('\n')

console.log(`File has ${lines.length} lines before deletion.`)

for (const [label, start, end] of BLOCKS_TO_DELETE) {
  // Convert 1-based line numbers to 0-based array indices
  const s = start - 1
  const e = end - 1
  const count = e - s + 1
  lines.splice(s, count)
  console.log(`Deleted "${label}" (lines ${start}–${end}, ${count} lines). File now has ${lines.length} lines.`)
}

writeFileSync(FILE, lines.join('\n'), 'utf8')
console.log(`\nDone. File has ${lines.length} lines after deletion.`)
console.log(`Removed ${BLOCKS_TO_DELETE.length} blocks (${BLOCKS_TO_DELETE.reduce((s, b) => s + b[2] - b[1] + 1, 0)} lines total).`)
