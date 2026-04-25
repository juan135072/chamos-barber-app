/**
 * Postbuild script for standalone output mode.
 * Next.js standalone build does NOT copy public/ or .next/static/ automatically.
 * This script copies them so the container can serve them at runtime.
 */
const fs = require('fs')
const path = require('path')

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return
  fs.mkdirSync(dest, { recursive: true })
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}

const root = path.join(__dirname, '..')
const standaloneDir = path.join(root, '.next', 'standalone')

if (!fs.existsSync(standaloneDir)) {
  console.log('⚠️  [postbuild] .next/standalone not found — skipping (output is not standalone)')
  process.exit(0)
}

// Copy public/ → .next/standalone/public/
copyDir(path.join(root, 'public'), path.join(standaloneDir, 'public'))
console.log('✅ [postbuild] Copied public/ → .next/standalone/public/')

// Copy .next/static/ → .next/standalone/.next/static/
copyDir(
  path.join(root, '.next', 'static'),
  path.join(standaloneDir, '.next', 'static')
)
console.log('✅ [postbuild] Copied .next/static/ → .next/standalone/.next/static/')
