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
  // Build number: prefer CI run number, otherwise count commits
  let build = process.env.GITHUB_RUN_NUMBER;
  if (!build) {
    try {
      build = execSync('git rev-list --count HEAD', { encoding: 'utf8' }).trim();
    } catch {
      build = '0';
    }
  }
  const out = { version, build, sha, dateISO };
  const outPath = resolve(__dirname, '..', 'version.json');
  writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n', 'utf8');
  console.log('Wrote version.json:', out);
}

main();


