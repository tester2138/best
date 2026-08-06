import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Mapping of JSON file names to broker slugs
const fileNameToBrokerSlug = {
  'interactive-brokers-fMOsk.json': 'interactive-brokers',
  'infinox-8qEKa.json': 'infinox',
  'fxtm-JsKcX.json': 'fxtm',
  'go-markets-rykhG.json': 'go-markets',
  'fusion-markets-kXeoi.json': 'fusion-markets',
  'instaforex-Nrmh8.json': 'instaforex',
  'fp-markets-Y5Eoi.json': 'fp-markets',
  'fxgt-lzhSS.json': 'fxgt',
  'markets-com-kC5Ny.json': 'markets-com',
  'hycm-V1kaa.json': 'hycm',
  'litefinance-vDrQO.json': 'litefinance',
  'moneta-markets-nTYwm.json': 'moneta-markets',
  'nordfx-GlRPA.json': 'nordfx',
  'gbe-brokers-efozC.json': 'gbe-brokers',
  'hantec-markets-ePYQS.json': 'hantec-markets',
  'multibank-UhlEB.json': 'multibank',
  'global-prime-DvTpj.json': 'global-prime',
  'libertex-gBnvd.json': 'libertex',
  'ironfx-d6VG2.json': 'ironfx',
  'naga-pKwZL.json': 'naga',
};

async function loadBrokerData() {
  const brokerDataMap = {};

  for (const [fileName, slug] of Object.entries(fileNameToBrokerSlug)) {
    try {
      const filePath = path.join(__dirname, `../user_read_only_context/text_attachments/${fileName}`);
      const content = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(content);
      brokerDataMap[slug] = data;
      console.log(`✓ Loaded data for ${slug}`);
    } catch (err) {
      console.log(`✗ Failed to load ${fileName}: ${err.message}`);
    }
  }

  return brokerDataMap;
}

function transformBrokerData(jsonData) {
  const broker = jsonData.broker || {};
  
  return {
    longDescription: broker.longDescription || '',
    scores: broker.scores || {},
    regulators: broker.regulators || [],
    pros: broker.pros || [],
    cons: broker.cons || [],
    faq: broker.faq || [],
    quickFacts: broker.quickFacts || {},
    trustpilot: broker.trustpilot || null,
    seo: broker.seo || {},
    notAvailableIn: broker.notAvailableIn || [],
  };
}

async function readCurrentBrokers() {
  const brokerFilePath = path.join(__dirname, '../data/brokers.ts');
  return fs.readFileSync(brokerFilePath, 'utf-8');
}

async function main() {
  console.log('🔄 Loading broker data from JSON files...\n');
  const brokerDataMap = await loadBrokerData();

  console.log(`\n✓ Successfully loaded ${Object.keys(brokerDataMap).length} broker data files`);
  console.log('\nTransformation preview for sample broker (go-markets):');

  if (brokerDataMap['go-markets']) {
    const transformed = transformBrokerData(brokerDataMap['go-markets']);
    console.log(`  - New description length: ${transformed.longDescription.length} chars`);
    console.log(`  - Scores available: ${Object.keys(transformed.scores).length} metrics`);
    console.log(`  - Regulators: ${transformed.regulators.length}`);
    console.log(`  - Pros: ${transformed.pros.length}, Cons: ${transformed.cons.length}`);
    console.log(`  - FAQ items: ${transformed.faq.length}`);
  }

  // Save the broker data map for next phase
  fs.writeFileSync(
    path.join(__dirname, '../.v0/broker-data-map.json'),
    JSON.stringify(brokerDataMap, null, 2)
  );

  console.log('\n✓ Broker data map saved to .v0/broker-data-map.json');
}

main().catch(console.error);
