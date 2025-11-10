const { execSync } = require('child_process');
const { writeFileSync, readFileSync } = require('fs');
const { resolve } = require('path');

function getGitSha() {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

function main() {
  const pkgPath = resolve(__dirname, '..', 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  const version = pkg.version || '0.0.0';
  const sha = getGitSha();
  const dateISO = new Date().toISOString();
  const out = { version, sha, dateISO };
  const outPath = resolve(__dirname, '..', 'version.json');
  writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n', 'utf8');
  console.log('Wrote version.json:', out);
}

main();


