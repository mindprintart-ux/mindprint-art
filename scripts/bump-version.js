const { readFileSync, writeFileSync } = require('fs');
const { resolve } = require('path');

function bumpVersionWithCap(version) {
  const parts = version.split('.');
  if (parts.length !== 3) {
    throw new Error(`Unexpected version format: ${version}`);
  }
  let [major, minor, patch] = parts.map(n => parseInt(n, 10));
  if (Number.isNaN(major) || Number.isNaN(minor) || Number.isNaN(patch)) {
    throw new Error(`Invalid semver numbers in: ${version}`);
  }
  if (patch >= 199) {
    minor += 1;
    patch = 0;
  } else {
    patch += 1;
  }
  return `${major}.${minor}.${patch}`;
}

function main() {
  const pkgPath = resolve(__dirname, '..', 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  const current = pkg.version || '0.0.0';
  const next = bumpVersionWithCap(current);
  pkg.version = next;
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
  console.log(`Bumped version: ${current} -> ${next}`);
}

main();


