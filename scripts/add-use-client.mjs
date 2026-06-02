import { readFileSync, writeFileSync } from "node:fs";

const files = ["dist/index.js", "dist/index.cjs"];
const directive = '"use client";\n';

for (const file of files) {
  const content = readFileSync(file, "utf8");
  if (!content.startsWith('"use client"')) {
    writeFileSync(file, directive + content);
    console.log(`  patched: ${file}`);
  }
}
