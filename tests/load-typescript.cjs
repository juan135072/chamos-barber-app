const ts = require('typescript')
const fs = require('node:fs')
const Module = require('node:module')
const path = require('node:path')
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText, filename)
const resolve = Module._resolveFilename
Module._resolveFilename = function (name, ...args) { return resolve.call(this, name.startsWith('@/') ? path.join(__dirname, '../src', name.slice(2)) : name, ...args) }
