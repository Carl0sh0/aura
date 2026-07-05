// Pre-compiles the shared TypeScript prompt/demo-content modules into plain
// JavaScript under api/_shared/, so the Vercel serverless functions in /api
// never need to import raw .ts files at runtime — Vercel's function bundler
// (Node File Trace) can't transpile TypeScript reached from a .mjs entry, so
// a runtime import of a .ts file 404s in production even though it works
// fine locally via tsx. This script is a build step (see package.json
// "build"), run before `vite build`; local dev (tsx) is unaffected.
import { build } from 'esbuild'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const outDir = join(root, 'api', '_shared')
mkdirSync(outDir, { recursive: true })

const entries = ['prompts.ts', 'demoContent.ts', 'characterPacks.ts']

for (const entry of entries) {
  await build({
    entryPoints: [join(root, 'src', 'lib', entry)],
    outfile: join(outDir, entry.replace(/\.ts$/, '.mjs')),
    bundle: false,
    format: 'esm',
    platform: 'node',
    target: 'node18',
  })
}

console.log(`✓ Compiled ${entries.join(', ')} → api/_shared/ for Vercel functions`)
