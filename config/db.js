import pg from 'pg';
import dotenv from 'dotenv';

// Load environment variables from .env
dotenv.config();

const { Pool } = pg;

/**
 * Configure PostgreSQL SSL for Supabase.
 * Supabase pooler connections require SSL encryption.
 * In development, setting rejectUnauthorized: false ensures seamless SSL connection
 * to Supabase poolers without local CA bundle issues.
 */
function getSslConfig() {
  const strict = process.env.DATABASE_SSL_STRICT === 'true';
  return strict
    ? { rejectUnauthorized: true }
    : { rejectUnauthorized: false };
}

/**
 * Parse and validate DATABASE_URL
 */
const connectionString = process.env.DATABASE_URL ? process.env.DATABASE_URL.trim() : '';

export const pool = new Pool({
  connectionString: connectionString || undefined,
  ssl: connectionString ? getSslConfig() : false,
  max: 10, // Optimal pool size for Supabase Session Pooler
  min: 0,  // Never force idle connections with Supabase pooler (prevents stale socket disconnects)
  idleTimeoutMillis: 15000, // Recycle idle connections after 15 seconds
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  // Silent handling of idle client disconnects (normal for Supabase pooler)
  console.warn('ℹ️ Notice on idle PostgreSQL connection (will reconnect automatically):', err.message);
});

/**
 * Executes a parameterized SQL query safely with auto-reconnect on stale connection
 * @param {string} text - SQL query string
 * @param {Array} params - Array of parameter values (protects against SQL injection)
 */
export async function query(text, params) {
  try {
    return await pool.query(text, params);
  } catch (error) {
    const msg = (error.message || '').toLowerCase();
    // Auto-retry once if a pooled connection was dropped while idle by Supabase
    if (
      msg.includes('connection terminated') ||
      msg.includes('connection timeout') ||
      msg.includes('timeout') ||
      msg.includes('econnreset') ||
      msg.includes('closed') ||
      msg.includes('broken pipe')
    ) {
      console.warn('⚠️ Stale database connection detected, auto-retrying query with fresh connection...');
      return await pool.query(text, params);
    }
    console.error('Database query error:', {
      query: text.slice(0, 120),
      error: error.message,
    });
    throw error;
  }
}

/**
 * Gets a dedicated client from the pool for transactions
 */
export async function getClient() {
  const client = await pool.connect();
  return client;
}

/**
 * Test the database connection and return diagnostic info
 */
export async function testConnection() {
  if (!connectionString || connectionString === '' || connectionString.includes('YOUR-PASSWORD')) {
    return {
      success: false,
      error: 'DATABASE_URL is not configured in .env',
      hint: 'Open your .env file and paste your real Supabase connection string under DATABASE_URL="...". Make sure to replace [YOUR-PASSWORD] with your actual database password.',
    };
  }

  let client;
  try {
    client = await pool.connect();
    const res = await client.query('SELECT NOW() as current_time, current_database() as db_name, version() as pg_version;');
    return {
      success: true,
      time: res.rows[0].current_time,
      database: res.rows[0].db_name,
      version: res.rows[0].pg_version,
    };
  } catch (err) {
    let hint = 'Check that your Supabase project is active, your password is correct, and that you are using the Session Pooler URI.';
    if (err.message.includes('password authentication failed')) {
      hint = 'The password in DATABASE_URL was rejected by Supabase. Verify your database password in the Supabase Dashboard.';
    } else if (err.message.includes('ENOTFOUND') || err.message.includes('getaddrinfo')) {
      hint = 'Could not resolve the Supabase host domain. Check the host portion of your DATABASE_URL.';
    } else if (err.message.includes('ETIMEDOUT') || err.message.includes('timeout')) {
      hint = 'Connection timed out. Check your internet connection or verify if your network allows outbound port 5432.';
    } else if (err.message.includes('self-signed certificate') || err.message.includes('SSL')) {
      hint = 'SSL error occurred. Ensure DATABASE_SSL_STRICT=false is set in .env for Supabase poolers.';
    }
    return {
      success: false,
      error: err.message,
      hint,
    };
  } finally {
    if (client) client.release();
  }
}

