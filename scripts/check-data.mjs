// Validates data/programs.json against the Program schema.
// Run with:  npm run check-data
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataPath = path.join(__dirname, "..", "data", "programs.json");

const LEVELS = ["bachelor", "master"];
const TIERS = ["high", "medium", "low"];

function fail(msg) {
  console.error(`\x1b[31m✗ ${msg}\x1b[0m`);
}
function warn(msg) {
  console.warn(`\x1b[33m! ${msg}\x1b[0m`);
}

let raw;
try {
  raw = fs.readFileSync(dataPath, "utf8");
} catch {
  fail(`Could not read ${dataPath}`);
  process.exit(1);
}

let data;
try {
  data = JSON.parse(raw);
} catch (e) {
  fail(`programs.json is not valid JSON: ${e.message}`);
  fail("Tip: a stray or missing comma is the usual cause.");
  process.exit(1);
}

if (!Array.isArray(data)) {
  fail("The top level of programs.json must be an array [ ... ].");
  process.exit(1);
}

let errors = 0;
let warnings = 0;
let placeholders = 0;
const ids = new Map();

const requiredStrings = [
  "id",
  "name",
  "university",
  "country",
  "city",
  "language",
  "field",
  "distinctiveNote",
  "url",
];

data.forEach((p, i) => {
  const where = `record #${i + 1}${p && p.id ? ` (id: ${p.id})` : ""}`;

  if (typeof p !== "object" || p === null) {
    fail(`${where}: not an object.`);
    errors++;
    return;
  }

  for (const key of requiredStrings) {
    if (typeof p[key] !== "string" || p[key].trim() === "") {
      fail(`${where}: "${key}" must be a non-empty string.`);
      errors++;
    }
  }

  // Unique id
  if (typeof p.id === "string") {
    if (ids.has(p.id)) {
      fail(`${where}: duplicate id — also used by record #${ids.get(p.id)}.`);
      errors++;
    } else {
      ids.set(p.id, i + 1);
    }
  }

  // Enums
  if (!LEVELS.includes(p.level)) {
    fail(`${where}: "level" must be "bachelor" or "master" (got ${JSON.stringify(p.level)}).`);
    errors++;
  }
  if (!TIERS.includes(p.selectivityTier)) {
    fail(`${where}: "selectivityTier" must be "high", "medium", or "low" (got ${JSON.stringify(p.selectivityTier)}).`);
    errors++;
  }

  // Language must be English for the MVP filter
  if (typeof p.language === "string" && p.language.trim().toLowerCase() !== "english") {
    warn(`${where}: language is "${p.language}" — only English-taught programs survive the filter.`);
    warnings++;
  }

  // Numbers
  if (typeof p.durationMonths !== "number" || !Number.isFinite(p.durationMonths) || p.durationMonths <= 0) {
    fail(`${where}: "durationMonths" must be a positive number (got ${JSON.stringify(p.durationMonths)}).`);
    errors++;
  }
  if (!(p.tuitionEurPerYear === null || (typeof p.tuitionEurPerYear === "number" && Number.isFinite(p.tuitionEurPerYear) && p.tuitionEurPerYear >= 0))) {
    fail(`${where}: "tuitionEurPerYear" must be a number ≥ 0 or null (got ${JSON.stringify(p.tuitionEurPerYear)}).`);
    errors++;
  }

  // Leftover placeholders
  const blob = JSON.stringify(p).toLowerCase();
  if (blob.includes("example —") || blob.includes("placeholder") || blob.includes("replace-me") || blob.includes("replace with real")) {
    placeholders++;
  }

  // Quality nudge
  if (typeof p.distinctiveNote === "string" && p.distinctiveNote.trim().length < 40) {
    warn(`${where}: distinctiveNote is very short — specific notes produce far better recommendations.`);
    warnings++;
  }
});

console.log("");
console.log(`Checked ${data.length} program record(s).`);
if (placeholders > 0) {
  warn(`${placeholders} record(s) still look like EXAMPLE/placeholder data — replace these with real programs.`);
}
if (warnings > 0) console.log(`\x1b[33m${warnings} warning(s).\x1b[0m`);

if (errors > 0) {
  console.log(`\x1b[31m${errors} error(s) — fix these before running the app.\x1b[0m`);
  process.exit(1);
}

console.log("\x1b[32m✓ All checks passed.\x1b[0m");
