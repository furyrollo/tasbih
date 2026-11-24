'use strict';

const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const dataDir = path.join(projectRoot, 'data');
const typeDefinitions = [
  { type: 'dua', directory: 'duas' },
  { type: 'dhikr', directory: 'dhikr' }
];
const requiredStringFields = ['id', 'arabic', 'transliteration', 'translation', 'source'];
const allowedEntryFields = new Set([
  ...requiredStringFields,
  'recommendedCount',
  'audioUrl'
]);
const textFields = ['arabic', 'transliteration', 'translation', 'source'];
const kebabCasePattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const arabicScriptPattern = /\p{Script=Arabic}/u;

function compareStrings(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function relativePath(filePath) {
  return path.relative(projectRoot, filePath).split(path.sep).join('/');
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function readJson(filePath) {
  let source;
  try {
    source = fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    throw new Error(`Unable to read ${relativePath(filePath)}: ${error.message}`);
  }

  try {
    return JSON.parse(source);
  } catch (error) {
    throw new Error(`Invalid JSON in ${relativePath(filePath)}: ${error.message}`);
  }
}

function loadCategories() {
  const categoriesPath = path.join(dataDir, 'categories.json');
  const document = readJson(categoriesPath);
  if (!isObject(document)) {
    throw new Error(`${relativePath(categoriesPath)}: expected a JSON object.`);
  }

  const categories = {};
  for (const { type } of typeDefinitions) {
    if (!Array.isArray(document[type])) {
      throw new Error(`${relativePath(categoriesPath)}: "${type}" must be an array.`);
    }

    const seenIds = new Set();
    categories[type] = document[type].map((category, index) => {
      const location = `${relativePath(categoriesPath)} ${type} category at index ${index}`;
      if (!isObject(category)) {
        throw new Error(`${location}: expected an object.`);
      }
      for (const field of ['id', 'label', 'description']) {
        if (typeof category[field] !== 'string' || !category[field].trim()) {
          throw new Error(`${location}: "${field}" must be a non-empty string.`);
        }
      }
      if (!kebabCasePattern.test(category.id)) {
        throw new Error(`${location}: category id "${category.id}" must be kebab-case.`);
      }
      if (seenIds.has(category.id)) {
        throw new Error(`${location}: duplicate ${type} category id "${category.id}".`);
      }
      seenIds.add(category.id);
      return { id: category.id, label: category.label, description: category.description };
    });
  }

  return categories;
}

function validateContent() {
  const categories = loadCategories();
  const files = [];
  const warnings = [];
  const entryIds = new Map();
  const categoryCounts = new Map();

  for (const { type, directory } of typeDefinitions) {
    const categoryIds = new Set(categories[type].map((category) => category.id));
    for (const category of categories[type]) categoryCounts.set(`${type}/${category.id}`, 0);

    const directoryPath = path.join(dataDir, directory);
    let directoryEntries;
    try {
      directoryEntries = fs.readdirSync(directoryPath, { withFileTypes: true });
    } catch (error) {
      throw new Error(`Unable to read ${relativePath(directoryPath)}: ${error.message}`);
    }

    const unsupportedFiles = directoryEntries
      .filter((entry) => entry.isFile() && !entry.name.endsWith('.json'))
      .map((entry) => entry.name)
      .sort(compareStrings);
    if (unsupportedFiles.length) {
      throw new Error(`${relativePath(directoryPath)}: unsupported content file "${unsupportedFiles[0]}"; only .json category files are allowed.`);
    }

    const filenames = directoryEntries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
      .map((entry) => entry.name)
      .sort(compareStrings);

    for (const filename of filenames) {
      const category = filename.slice(0, -'.json'.length);
      const filePath = path.join(directoryPath, filename);
      const displayPath = relativePath(filePath);
      if (!categoryIds.has(category)) {
        throw new Error(`${displayPath}: file name "${category}" does not match a ${type} category id in data/categories.json.`);
      }

      const document = readJson(filePath);
      if (!isObject(document) || !Array.isArray(document.entries)) {
        throw new Error(`${displayPath}: "entries" must be an array.`);
      }
      const unknownRootFields = Object.keys(document).filter((field) => field !== 'entries');
      if (unknownRootFields.length) {
        throw new Error(`${displayPath}: unknown top-level field "${unknownRootFields[0]}".`);
      }

      categoryCounts.set(`${type}/${category}`, document.entries.length);
      document.entries.forEach((entry, index) => {
        const entryId = isObject(entry) && typeof entry.id === 'string' && entry.id.trim()
          ? entry.id
          : null;
        const location = `${displayPath} ${entryId ? `entry "${entryId}" ` : ''}(index ${index})`;
        if (!isObject(entry)) {
          throw new Error(`${location}: expected an object.`);
        }

        const unknownFields = Object.keys(entry).filter((field) => !allowedEntryFields.has(field));
        if (unknownFields.length) {
          throw new Error(`${location}: unknown field "${unknownFields[0]}".`);
        }

        for (const field of requiredStringFields) {
          if (!Object.hasOwn(entry, field)) {
            throw new Error(`${location}: required field "${field}" is missing.`);
          }
          if (typeof entry[field] !== 'string') {
            throw new Error(`${location}: "${field}" must be a string.`);
          }
          if (!entry[field].trim()) {
            throw new Error(`${location}: "${field}" must not be empty or whitespace-only.`);
          }
        }

        if (!kebabCasePattern.test(entry.id)) {
          throw new Error(`${location}: id "${entry.id}" must be kebab-case.`);
        }
        if (entryIds.has(entry.id)) {
          throw new Error(`${location}: duplicate id "${entry.id}" (already used in ${entryIds.get(entry.id)}).`);
        }
        entryIds.set(entry.id, displayPath);

        if (!arabicScriptPattern.test(entry.arabic)) {
          throw new Error(`${location}: "arabic" must contain Arabic-script characters.`);
        }
        if (entry.recommendedCount !== null
          && (!Number.isInteger(entry.recommendedCount) || entry.recommendedCount <= 0)) {
          throw new Error(`${location}: "recommendedCount" must be a positive integer or null.`);
        }
        if (entry.audioUrl !== null
          && (typeof entry.audioUrl !== 'string' || !entry.audioUrl.trim())) {
          throw new Error(`${location}: "audioUrl" must be null or a non-empty string.`);
        }

        for (const field of textFields) {
          if (entry[field] !== entry[field].trim()) {
            warnings.push(`${displayPath} entry "${entry.id}": "${field}" has leading or trailing whitespace.`);
          }
        }
      });

      files.push({ path: `${directory}/${filename}`, type, category });
    }
  }

  for (const { type } of typeDefinitions) {
    for (const category of categories[type]) {
      if (categoryCounts.get(`${type}/${category.id}`) === 0) {
        warnings.push(`data/categories.json ${type} category "${category.id}" has zero entries.`);
      }
    }
  }

  return { categories, files, warnings };
}

function printWarnings(warnings) {
  for (const warning of warnings) console.warn(`Warning: ${warning}`);
}

function printSummary({ categories, files }) {
  const counts = { dua: 0, dhikr: 0 };
  for (const file of files) {
    const document = readJson(path.join(dataDir, file.path));
    counts[file.type] += document.entries.length;
  }

  console.log('Content validation passed.');
  for (const { type } of typeDefinitions) {
    console.log(`${type}: ${counts[type]} entries across ${categories[type].length} categories`);
    for (const category of categories[type]) {
      const file = files.find((candidate) => candidate.type === type && candidate.category === category.id);
      const count = file ? readJson(path.join(dataDir, file.path)).entries.length : 0;
      console.log(`  ${category.id}: ${count}`);
    }
  }
  console.log(`Total: ${counts.dua + counts.dhikr} entries in ${files.length} files.`);
}

if (require.main === module) {
  try {
    const result = validateContent();
    printWarnings(result.warnings);
    printSummary(result);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { validateContent, printWarnings, printSummary };
