const fs = require("fs");
const path = require("path");

const symbolsPath = path.join(__dirname, "..", "data", "sagemath_symbols.json");
const templatePath = path.join(
  __dirname,
  "..",
  "syntaxes",
  "sagemath.tmLanguage.template.json"
);
const outputPath = path.join(
  __dirname,
  "..",
  "syntaxes",
  "sagemath.tmLanguage.json"
);

console.log(`Reading symbols from ${symbolsPath}...`);
const symbolsData = JSON.parse(fs.readFileSync(symbolsPath, "utf8"));

console.log(`Reading template grammar from ${templatePath}...`);
let template = fs.readFileSync(templatePath, "utf8");

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Builds a regex string from a list of symbol objects.
 * @param {{name: string, doc: string}[]} list The list of symbol objects.
 * @returns {string} The regex string.
 */
function buildRegex(list) {
  if (!list || list.length === 0) {
    return "\\b(THIS_SHOULD_NEVER_MATCH)\\b";
  }
  // --- Extract 'name' from each object ---
  const names = list.map((item) => item.name);
  // ----------------------------------------
  const cleanedList = names.filter(Boolean).map(escapeRegExp);
  return `\\b(${cleanedList.join("|")})\\b`;
}

const classesRegex = buildRegex(symbolsData.classes);
const functionsRegex = buildRegex(symbolsData.functions);
const constantsRegex = buildRegex(symbolsData.constants);

console.log("Injecting symbols into grammar...");
template = template.replace('"__SAGE_CLASSES__"', JSON.stringify(classesRegex));
template = template.replace(
  '"__SAGE_FUNCTIONS__"',
  JSON.stringify(functionsRegex)
);
template = template.replace(
  '"__SAGE_CONSTANTS__"',
  JSON.stringify(constantsRegex)
);

console.log(`Writing final grammar file to ${outputPath}...`);
fs.writeFileSync(outputPath, template, "utf8");

console.log(`Updated ${outputPath} successfully!`);
