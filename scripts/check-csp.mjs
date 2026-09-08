import { readdir, readFile } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';

const root = 'dist';
const forbidden = [
  { name: 'eval()', pattern: /\beval\s*\(/ },
  { name: 'new Function()', pattern: /\bnew\s+Function\s*\(/ }
];

async function collectJavaScriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await collectJavaScriptFiles(path)));
    if (entry.isFile() && ['.js', '.mjs', '.cjs'].includes(extname(entry.name))) files.push(path);
  }
  return files;
}

const files = await collectJavaScriptFiles(root);
if (files.length === 0) {
  console.error('CSP scan failed: no generated JavaScript was found in dist/.');
  process.exit(1);
}

const violations = [];
for (const file of files) {
  const source = await readFile(file, 'utf8');
  for (const check of forbidden) {
    if (check.pattern.test(source)) {
      violations.push(`${relative(process.cwd(), file)} contains ${check.name}`);
    }
  }
}

if (violations.length > 0) {
  console.error(
    "Generated QR component assets must remain compatible with BitPay's strict CSP and must not require script-src 'unsafe-eval'."
  );
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

console.log(
  `CSP scan passed for ${files.length} generated JavaScript files: no eval() or new Function() found.`
);
