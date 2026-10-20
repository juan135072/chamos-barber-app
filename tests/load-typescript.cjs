const ts = require('typescript')
const fs = require('node:fs')
const Module = require('node:module')
const path = require('node:path')
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText, filename)
const resolve = Module._resolveFilename
Module._resolveFilename = function (name, ...args) {
  if (!name.startsWith('@/')) return resolve.call(this, name, ...args)
  const rest = name.slice(2)
  try { return resolve.call(this, path.join(__dirname, '../src', rest), ...args) }
  catch (error) {
    // tsconfig maps @/lib/* to src/lib/* first and then to the root lib/*.
    if (!rest.startsWith('lib/')) throw error
    return resolve.call(this, path.join(__dirname, '..', rest), ...args)
  }
}
