// Builds THIRD-PARTY-NOTICES.md: the Rust crates and npm packages that go
// into the Windows build, with their licences.
//
//   node scripts/third-party-notices.mjs           write the file
//   node scripts/third-party-notices.mjs --check   exit 1 if the file is stale
//
// Rust data comes from `cargo metadata` (resolve graph for the Windows target),
// npm data from the package.json files in node_modules. Run `npm ci` first.

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = join(root, 'THIRD-PARTY-NOTICES.md');
const cargoManifest = join(root, 'src-tauri', 'Cargo.toml');
const target = 'x86_64-pc-windows-msvc';

const UNKNOWN = 'не указана';

function compare(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

function byNameThenVersion(a, b) {
  return compare(a.name.toLowerCase(), b.name.toLowerCase()) || compare(a.version, b.version);
}

// Cargo still accepts the old "MIT/Apache-2.0" spelling; SPDX writes it as OR.
function normaliseLicense(value) {
  if (typeof value !== 'string' || value.trim() === '') return UNKNOWN;
  return value.trim().replace(/\s*\/\s*/g, ' OR ').replace(/\s+/g, ' ');
}

// "MIT OR Apache-2.0" and "Apache-2.0 OR MIT" are the same choice. The summary
// counts them together; expressions with AND or brackets stay as declared.
function summaryKey(license) {
  if (/[()]|\bAND\b|\bWITH\b/.test(license)) return license;
  return license.split(' OR ').sort(compare).join(' OR ');
}

function normaliseRepository(value) {
  const raw = typeof value === 'string' ? value : value && typeof value === 'object' ? value.url : '';
  if (typeof raw !== 'string' || raw.trim() === '') return '';
  let url = raw.trim();
  const shorthand = /^(github|gitlab|bitbucket):(.+)$/.exec(url);
  if (shorthand) {
    const host = { github: 'github.com', gitlab: 'gitlab.com', bitbucket: 'bitbucket.org' }[shorthand[1]];
    url = `https://${host}/${shorthand[2]}`;
  } else if (/^[\w.-]+\/[\w.-]+$/.test(url)) {
    url = `https://github.com/${url}`;
  }
  url = url
    .replace(/^git\+/, '')
    .replace(/^git:\/\//, 'https://')
    .replace(/^ssh:\/\/git@/, 'https://')
    .replace(/^git@([^:]+):/, 'https://$1/')
    .replace(/\.git$/, '')
    .replace(/\/$/, '');
  return /^https?:\/\//.test(url) ? url : '';
}

function collectRustCrates() {
  const stdout = execFileSync(
    'cargo',
    ['metadata', '--format-version', '1', '--locked', '--filter-platform', target, '--manifest-path', cargoManifest],
    { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 },
  );
  const metadata = JSON.parse(stdout);
  const packages = new Map(metadata.packages.map((pkg) => [pkg.id, pkg]));
  const nodes = new Map(metadata.resolve.nodes.map((node) => [node.id, node]));
  const rootId = metadata.resolve.root;

  // Walk the resolve graph from the project crate. Normal and build
  // dependencies are followed, development dependencies are not.
  const seen = new Set([rootId]);
  const queue = [rootId];
  while (queue.length > 0) {
    const node = nodes.get(queue.pop());
    for (const dep of node.deps) {
      const used = dep.dep_kinds.some((entry) => entry.kind !== 'dev');
      if (!used || seen.has(dep.pkg)) continue;
      seen.add(dep.pkg);
      queue.push(dep.pkg);
    }
  }
  seen.delete(rootId);

  return [...seen]
    .map((id) => {
      const pkg = packages.get(id);
      return {
        name: pkg.name,
        version: pkg.version,
        license: pkg.license ? normaliseLicense(pkg.license) : pkg.license_file ? `файл ${pkg.license_file}` : UNKNOWN,
        repository: normaliseRepository(pkg.repository) || `https://crates.io/crates/${pkg.name}`,
      };
    })
    .sort(byNameThenVersion);
}

function collectNpmPackages() {
  const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  const found = new Map();

  // Node resolution: look in the requiring package's node_modules, then upwards.
  function locate(name, fromDir) {
    let dir = fromDir;
    for (;;) {
      const candidate = join(dir, 'node_modules', name);
      if (existsSync(join(candidate, 'package.json'))) return candidate;
      if (dir === root) return null;
      const parent = dirname(dir);
      if (parent === dir) return null;
      dir = parent;
    }
  }

  function visit(name, fromDir, optional) {
    const dir = locate(name, fromDir);
    if (!dir) {
      if (optional) return;
      throw new Error(`Package ${name} is not installed. Run "npm ci" and try again.`);
    }
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
    const key = `${pkg.name}@${pkg.version}`;
    if (found.has(key)) return;
    const license = typeof pkg.license === 'object' && pkg.license ? pkg.license.type : pkg.license;
    found.set(key, {
      name: pkg.name,
      version: pkg.version,
      license: normaliseLicense(license),
      repository: normaliseRepository(pkg.repository) || `https://www.npmjs.com/package/${pkg.name}`,
    });
    for (const dep of Object.keys(pkg.dependencies ?? {})) visit(dep, dir, false);
    for (const dep of Object.keys(pkg.optionalDependencies ?? {})) visit(dep, dir, true);
  }

  for (const name of Object.keys(manifest.dependencies ?? {})) visit(name, root, false);
  return [...found.values()].sort(byNameThenVersion);
}

function cell(text) {
  return String(text).replace(/\|/g, '\\|');
}

function table(header, rows) {
  const lines = [`| ${header.join(' | ')} |`, `| ${header.map(() => '---').join(' | ')} |`];
  for (const row of rows) lines.push(`| ${row.map(cell).join(' | ')} |`);
  return lines.join('\n');
}

function render(crates, npmPackages) {
  const counts = new Map();
  const count = (list, column) => {
    for (const item of list) {
      const key = summaryKey(item.license);
      const entry = counts.get(key) ?? { rust: 0, npm: 0 };
      entry[column] += 1;
      counts.set(key, entry);
    }
  };
  count(crates, 'rust');
  count(npmPackages, 'npm');
  const summary = [...counts.entries()]
    .map(([license, entry]) => [license, entry.rust, entry.npm, entry.rust + entry.npm])
    .sort((a, b) => b[3] - a[3] || compare(a[0], b[0]));

  return [
    '# Сторонние компоненты',
    '',
    `Библиотеки, из которых собирается UnixGram Desktop, неофициальный клиент UnixGram для Windows (\`${target}\`). Пакетов Rust: ${crates.length}, пакетов npm: ${npmPackages.length}. Лицензии указаны так, как их объявили авторы пакетов.`,
    '',
    'В список не входят инструменты разработки (сборщик, линтер, тесты, Storybook), стандартная библиотека Rust, среда Microsoft Edge WebView2 и оболочка установщика NSIS. Текстов лицензий и строк об авторских правах в файле нет: они лежат в репозиториях пакетов.',
    '',
    'Файл создаёт скрипт [`scripts/third-party-notices.mjs`](scripts/third-party-notices.mjs). Вручную его не правят. Обновить после изменения зависимостей:',
    '',
    '```powershell',
    'npm run licenses:notices',
    '```',
    '',
    '## Лицензии',
    '',
    'Одинаковый выбор в разном порядке (`MIT OR Apache-2.0` и `Apache-2.0 OR MIT`) посчитан вместе.',
    '',
    table(['Лицензия (SPDX)', 'Rust', 'npm', 'Всего'], summary),
    '',
    '## Пакеты Rust',
    '',
    'Источник: `cargo metadata` по `src-tauri/Cargo.lock`, обычные зависимости и зависимости сборки. Часть пакетов работает только во время сборки: скрипты сборки и процедурные макросы.',
    '',
    table(
      ['Пакет', 'Версия', 'Лицензия (SPDX)', 'Репозиторий'],
      crates.map((item) => [item.name, item.version, item.license, `<${item.repository}>`]),
    ),
    '',
    '## Пакеты npm',
    '',
    'Источник: `dependencies` в `package.json` и их зависимости из `node_modules`. Из этих пакетов собирается окно настроек.',
    '',
    table(
      ['Пакет', 'Версия', 'Лицензия (SPDX)', 'Репозиторий'],
      npmPackages.map((item) => [item.name, item.version, item.license, `<${item.repository}>`]),
    ),
    '',
  ].join('\n');
}

const crates = collectRustCrates();
const npmPackages = collectNpmPackages();
const content = render(crates, npmPackages);

if (process.argv.includes('--check')) {
  const current = existsSync(outputPath) ? readFileSync(outputPath, 'utf8').replace(/\r\n/g, '\n') : '';
  if (current !== content) {
    console.error('THIRD-PARTY-NOTICES.md is out of date. Run "npm run licenses:notices".');
    process.exit(1);
  }
  console.log('THIRD-PARTY-NOTICES.md is up to date.');
} else {
  writeFileSync(outputPath, content);
  console.log(`THIRD-PARTY-NOTICES.md: ${crates.length} Rust crates, ${npmPackages.length} npm packages.`);
}
