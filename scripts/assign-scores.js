/**
 * Assigns sequential scores to all 'basic' dataQualityStage brands in directory.ts
 * 
 * Rules:
 * - Brands with dataQualityStage: 'basic' are the batch-added brands (no existing scores)
 * - Oldest batch brands (first in file) -> score 1.0
 * - Newest batch brands (last in file) -> score 4.5
 * - Score increments by 0.1 steps, distributed evenly across all batch brands
 * - Top 15 brokers in brokers.ts are untouched (they have their own scores)
 * - Brands in additionalCompanies with 'enriched' or 'reviewed' status are untouched
 */

const { readFileSync, writeFileSync } = require('fs')

const filePath = '/vercel/share/v0-project/data/directory.ts'
let content = readFileSync(filePath, 'utf-8')

// Count total number of 'basic' brands
const basicPattern = /dataQualityStage: 'basic'/g
let countMatch
let totalBrands = 0
while ((countMatch = basicPattern.exec(content)) !== null) {
  totalBrands++
}

console.log(`Found ${totalBrands} brands with dataQualityStage: 'basic'`)

if (totalBrands === 0) {
  console.log('No brands to process. Exiting.')
  process.exit(0)
}

// Generate score for index i out of total N
// Evenly distributed from 1.0 to 4.5
function getScore(index, total) {
  if (total === 1) return 1.0
  const fraction = index / (total - 1) // 0.0 to 1.0
  const rawScore = 1.0 + fraction * 3.5 // 1.0 to 4.5
  return Math.round(rawScore * 10) / 10
}

// Show distribution summary
const scoreCounts = {}
for (let i = 0; i < totalBrands; i++) {
  const s = getScore(i, totalBrands)
  const key = s.toFixed(1)
  scoreCounts[key] = (scoreCounts[key] || 0) + 1
}
console.log('\nScore distribution plan:')
const sortedScores = Object.keys(scoreCounts).sort((a, b) => parseFloat(a) - parseFloat(b))
for (const s of sortedScores) {
  console.log(`  Score ${s}: ${scoreCounts[s]} brands`)
}

// Now insert scores into file content
// We process each brand block one at a time
// Strategy: find each dataQualityStage: 'basic' block, then find sourceUrls for that block,
// then insert score before the closing },

let newContent = content
let brandIndex = totalBrands - 1 // process in reverse

// We'll do multiple passes, processing one brand at a time from end to start
// to avoid offset issues

// Build array of all sourceUrls positions associated with 'basic' brands
// by scanning through the file

// Reset and scan sequentially
const basicPositions = []
const basicPat2 = /dataQualityStage: 'basic'/g
let m2
while ((m2 = basicPat2.exec(content)) !== null) {
  basicPositions.push(m2.index)
}

console.log(`\nProcessing ${basicPositions.length} brands...`)

// Process in reverse to preserve indices
let modifiedContent = content

for (let i = basicPositions.length - 1; i >= 0; i--) {
  const score = getScore(i, totalBrands)
  
  // Find this specific occurrence in current modifiedContent
  // We need to find the i-th occurrence of dataQualityStage: 'basic'
  const pat = /dataQualityStage: 'basic'/g
  let hit
  let idx = 0
  let targetPos = -1
  while ((hit = pat.exec(modifiedContent)) !== null) {
    if (idx === i) {
      targetPos = hit.index
      break
    }
    idx++
  }
  
  if (targetPos === -1) {
    console.log(`Warning: could not find brand ${i}`)
    continue
  }
  
  // From this position, find the sourceUrls field for this brand
  // sourceUrls will be after the dataQualityStage match
  const sourceUrlsIdx = modifiedContent.indexOf("sourceUrls:", targetPos)
  if (sourceUrlsIdx === -1) {
    console.log(`Warning: no sourceUrls found for brand ${i}`)
    continue
  }
  
  // Find the end of the sourceUrls array: '],'
  const closingBracket = modifiedContent.indexOf('],', sourceUrlsIdx)
  if (closingBracket === -1) {
    console.log(`Warning: no closing bracket for sourceUrls in brand ${i}`)
    continue
  }
  const afterSourceUrls = closingBracket + 2 // after '],'
  
  // Find the '\n  },' that closes this brand object
  const closingBrace = modifiedContent.indexOf('\n  },', afterSourceUrls)
  if (closingBrace === -1) {
    console.log(`Warning: no closing brace for brand ${i}`)
    continue
  }
  
  // Insert the score before the closing brace
  const scoreStr = `\n    scores: { overall: ${score.toFixed(1)} },`
  modifiedContent = modifiedContent.slice(0, closingBrace) + scoreStr + modifiedContent.slice(closingBrace)
}

writeFileSync(filePath, modifiedContent, 'utf-8')

console.log(`\nDone! Scores assigned to ${totalBrands} brands.`)
console.log(`First brand score: ${getScore(0, totalBrands).toFixed(1)}`)
console.log(`Last brand score: ${getScore(totalBrands - 1, totalBrands).toFixed(1)}`)
