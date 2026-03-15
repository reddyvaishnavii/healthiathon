import pkg from 'pg'
const { Pool } = pkg
import dotenv from 'dotenv'
import mockDb from './db-mock.js'

dotenv.config()

let pool = null
let useMock = process.env.USE_MOCK_DB === 'true' // Force mock if env var set

// Try to create PostgreSQL connection pool only if not forced to mock
if (!useMock) {
  try {
    pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'social_subtext_decoder',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'localpassword',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 1000,
    })

    pool.on('connect', () => {
      console.log('✅ PostgreSQL pool created')
    })

    pool.on('error', (err) => {
      console.error('⚠️ PostgreSQL error, switching to mock database:', err.message.substring(0, 50))
      useMock = true
    })
  } catch (error) {
    console.log('⚠️ PostgreSQL not available, using mock in-memory database for testing')
    useMock = true
  }
} else {
  console.log('📝 Mock database mode FORCED via USE_MOCK_DB=true')
}

export async function query(text, params) {
  const start = Date.now()
  try {
    // Try PostgreSQL first if available and not forced to mock
    if (pool && !useMock) {
      try {
        // Add timeout wrapper
        const pg_result = await Promise.race([
          pool.query(text, params),
          new Promise((_, reject) => setTimeout(() => reject(new Error('PostgreSQL timeout')), 5000))
        ])
        const duration = Date.now() - start
        console.log('📊 PostgreSQL query', { text: text.substring(0, 40), duration, rows: pg_result.rowCount })
        return pg_result
      } catch (error) {
        console.warn('⚠️ PostgreSQL query failed:', error.message.substring(0, 50))
        console.log('📝 Falling back to mock database for this query')
        useMock = true
        // Fall through to mock
      }
    }

    // Use mock database
    console.log('🗄️ Using mock database for query:', text.substring(0, 50) + '...')
    const res = await mockDb.query(text, params)
    const duration = Date.now() - start
    console.log('📊 Mock query result', { duration, rows: res.rowCount })
    return res

  } catch (error) {
    console.error('❌ Database query error:', error.message)
    throw error
  }
}

export async function getClient() {
  if (pool && !useMock) {
    return pool.connect()
  }
  return mockDb.getClient()
}

export default pool || mockDb
