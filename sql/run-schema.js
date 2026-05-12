const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

async function run() {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8')
  try {
    await pool.query(sql)
    console.log('✅ Schema creato con successo!')
    console.log('   Tabelle create: leads, conversations, messages')
  } catch (err) {
    console.error('❌ Errore:', err.message)
  } finally {
    await pool.end()
  }
}

run()
