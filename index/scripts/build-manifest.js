'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { validateContent, printWarnings, printSummary } = require('./validate-content.js');

const dataDir = path.resolve(__dirname, '..', 'data');
const typeOrder = { dua: 0, dhikr: 1 };

function compareFiles(left, right, categoryOrder) {
  return typeOrder[left.type] - typeOrder[right.type]
    || categoryOrder.get(`${left.type}/${left.category}`) - categoryOrder.get(`${right.type}/${right.category}`)
    || (left.path < right.path ? -1 : left.path > right.path ? 1 : 0);
}

if (require.main === module) {
  try {
    const result = validateContent();
    printWarnings(result.warnings);
    printSummary(result);

    const categoryOrder = new Map(
      ['dua', 'dhikr'].flatMap((type) => (
        result.categories[type].map((category, index) => [`${type}/${category.id}`, index])
      ))
    );
    const manifest = {
      version: 3,
      categories: result.categories,
      files: [...result.files].sort((left, right) => compareFiles(left, right, categoryOrder))
    };
    const manifestPath = path.join(dataDir, 'manifest.json');
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    console.log(`Wrote data/manifest.json (${manifest.files.length} content files).`);
  } catch (error) {
    console.error(error.message);
    console.error('Manifest build aborted; data/manifest.json was not updated.');
    process.exitCode = 1;
  }
}
