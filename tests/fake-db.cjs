// In-memory stand-in for the Supabase-shaped InsForge client that API routes
// receive from createPagesAdminClient(). It evaluates the simple filters the
// booking code uses and records every write, RPC call and realtime publish.
const { randomUUID } = require('node:crypto')

function createFakeDb({ tables = {}, rpc, fail = {}, onInsert, onUpdate } = {}) {
  const calls = { inserts: [], updates: [], rpc: [], published: [], or: [], selects: [] }
  const db = {
    tables,
    calls,
    fail,
    onInsert,
    onUpdate,
    from: (table) => new Query(db, table),
    async rpc(name, args) {
      calls.rpc.push({ name, args })
      return rpc ? rpc(name, args, db) : { data: [], error: null }
    },
    _insforge: {
      realtime: {
        async publish(channel, event, payload) { calls.published.push({ channel, event, payload }) },
      },
    },
  }
  return db
}

class Query {
  constructor(db, table) {
    this.db = db
    this.table = table
    this.mode = 'select'
    this.filters = []
    this.orders = []
    this.limitN = null
    this.singleRow = false
    this.maybe = false
  }
  select(columns) { this.columns = columns; return this }
  insert(rows) { this.mode = 'insert'; this.payload = rows; return this }
  update(patch) { this.mode = 'update'; this.payload = patch; return this }
  eq(column, value) { this.filters.push([column, 'eq', value, (row) => row[column] === value]); return this }
  neq(column, value) { this.filters.push([column, 'neq', value, (row) => row[column] !== value]); return this }
  in(column, values) { this.filters.push([column, 'in', values, (row) => values.includes(row[column])]); return this }
  gt(column, value) { this.filters.push([column, 'gt', value, (row) => row[column] > value]); return this }
  gte(column, value) { this.filters.push([column, 'gte', value, (row) => row[column] >= value]); return this }
  lt(column, value) { this.filters.push([column, 'lt', value, (row) => row[column] < value]); return this }
  lte(column, value) { this.filters.push([column, 'lte', value, (row) => row[column] <= value]); return this }
  // PostgREST "or" expressions are recorded, not evaluated.
  or(expression) { this.db.calls.or.push({ table: this.table, expression }); return this }
  order(column, { ascending = true } = {}) { this.orders.push([column, ascending]); return this }
  limit(n) { this.limitN = n; return this }
  single() { this.singleRow = true; return this }
  maybeSingle() { this.singleRow = true; this.maybe = true; return this }
  then(resolve, reject) { return this.run().then(resolve, reject) }

  rows() { return (this.db.tables[this.table] ||= []) }
  matches(row) { return this.filters.every(([, , , test]) => test(row)) }
  shape(rows) {
    const copy = structuredClone(rows)
    if (!this.singleRow) return { data: copy, error: null }
    if (copy.length === 1) return { data: copy[0], error: null }
    if (this.maybe && copy.length === 0) return { data: null, error: null }
    return { data: null, error: { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' } }
  }

  async run() {
    const failure = this.db.fail[`${this.table}.${this.mode}`]
    if (failure) return { data: null, error: failure }
    if (this.mode === 'insert') {
      const inserted = []
      for (const input of [].concat(this.payload)) {
        const error = this.db.onInsert?.(this.table, input)
        if (error) return { data: null, error }
        const row = { id: randomUUID(), ...structuredClone(input) }
        this.rows().push(row)
        this.db.calls.inserts.push({ table: this.table, row: structuredClone(row) })
        inserted.push(row)
      }
      return this.shape(inserted)
    }
    if (this.mode === 'update') {
      const matched = this.rows().filter((row) => this.matches(row))
      const error = this.db.onUpdate?.(this.table, this.payload, matched)
      if (error) return { data: null, error }
      for (const row of matched) Object.assign(row, structuredClone(this.payload))
      this.db.calls.updates.push({ table: this.table, patch: structuredClone(this.payload), ids: matched.map((r) => r.id), filters: this.filters.map(([c, op, v]) => [c, op, v]) })
      return this.shape(matched)
    }
    this.db.calls.selects.push({ table: this.table, filters: this.filters.map(([c, op, v]) => [c, op, v]) })
    let rows = this.rows().filter((row) => this.matches(row))
    for (const [column, ascending] of [...this.orders].reverse()) {
      rows = [...rows].sort((a, b) => (a[column] === b[column] ? 0 : (a[column] > b[column]) === ascending ? 1 : -1))
    }
    if (this.limitN != null) rows = rows.slice(0, this.limitN)
    return this.shape(rows)
  }
}

// Minimal NextApiResponse double.
function createResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: undefined,
    setHeader(key, value) { this.headers[key.toLowerCase()] = value; return this },
    getHeader(key) { return this.headers[key.toLowerCase()] },
    status(code) { this.statusCode = code; return this },
    json(body) { this.body = body; return this },
  }
}

// Replace a module in the require cache before the code under test loads it.
function stubModule(relativePath, exports) {
  const file = require.resolve(relativePath)
  require.cache[file] = { id: file, filename: file, loaded: true, exports }
  return exports
}

module.exports = { createFakeDb, createResponse, stubModule }
