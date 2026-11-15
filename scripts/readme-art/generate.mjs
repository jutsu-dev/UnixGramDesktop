// Writes the README artwork into docs/images/readme.
//
//   node scripts/readme-art/generate.mjs             write the files
//   node scripts/readme-art/generate.mjs --check     exit 1 if a file is stale
//   node scripts/readme-art/generate.mjs <directory> write into another directory
//
// The drawings are in art.mjs and blueprint.mjs.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { art } from './art.mjs'
import { blueprint } from './blueprint.mjs'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const args = process.argv.slice(2)
const check = args.includes('--check')
const target = args.find((arg) => !arg.startsWith('--'))
const out = target ? path.resolve(target) : path.join(root, 'docs', 'images', 'readme')

const files = { ...art(), ...blueprint() }
// A checkout with core.autocrlf stores the files with CRLF.
const lf = (text) => text.replace(/\r\n/g, '\n')

if (check) {
  const stale = Object.entries(files)
    .filter(([name, svg]) => {
      const file = path.join(out, name)
      return !fs.existsSync(file) || lf(fs.readFileSync(file, 'utf8')) !== svg
    })
    .map(([name]) => name)
  if (stale.length > 0) {
    console.error(`Stale: ${stale.join(', ')}. Run: node scripts/readme-art/generate.mjs`)
    process.exit(1)
  }
  console.log(`${Object.keys(files).length} files are up to date`)
} else {
  fs.mkdirSync(out, { recursive: true })
  for (const [name, svg] of Object.entries(files)) {
    fs.writeFileSync(path.join(out, name), svg)
    console.log(name, Buffer.byteLength(svg))
  }
}
