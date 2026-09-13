import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

let poolInstance: Pool | null = null;

declare global {
  // eslint-disable-next-line no-var
  var _postgresPool: Pool | undefined;
}

export function getDatabaseUrl(): string | undefined {
  return process.env.DATABASE_URL?.trim();
}

export function getDbConfig() {
  const databaseUrl = getDatabaseUrl();
  if (databaseUrl) {
    return { connectionString: databaseUrl };
  }

  const host = process.env.DB_HOST?.trim() || 'localhost';
  const port = parseInt(process.env.DB_PORT?.trim() || '5432', 10);
  const database = process.env.DB_NAME?.trim() || 'techroles_db';
  const user = process.env.DB_USER?.trim() || 'postgres';
  const password = process.env.DB_PASSWORD !== undefined ? String(process.env.DB_PASSWORD) : 'postgres';

  return {
    host,
    port,
    database,
    user,
    password
  };
}

export function isPostgresConfigured(): boolean {
  return !!(process.env.DATABASE_URL || process.env.DB_NAME || process.env.DB_HOST);
}

export function getPostgresPool(): Pool {
  if (process.env.NODE_ENV === 'development') {
    if (!global._postgresPool) {
      const config = getDbConfig();
      global._postgresPool = new Pool({
        ...config,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
      });

      global._postgresPool.on('error', (err) => {
        console.error('Unexpected error on idle PostgreSQL client', err);
      });
    }
    return global._postgresPool;
  }

  if (!poolInstance) {
    const config = getDbConfig();
    poolInstance = new Pool({
      ...config,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
    });

    poolInstance.on('error', (err) => {
      console.error('Unexpected error on idle PostgreSQL client', err);
    });
  }

  return poolInstance;
}

/**
 * Direct access to the connection pool
 */
export const pool = new Proxy({} as Pool, {
  get(_target, prop) {
    const realPool = getPostgresPool() as any;
    const value = realPool[prop];
    if (typeof value === 'function') {
      return value.bind(realPool);
    }
    return value;
  }
});

/**
 * Execute a parameterized query using a pooled connection.
 */
export async function query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
  const clientPool = getPostgresPool();
  const start = Date.now();
  try {
    const res = await clientPool.query<T>(text, params);
    return res;
  } catch (err: any) {
    console.error(`PostgreSQL query error: ${err.message}\nQuery: ${text}\nParams:`, params);
    throw err;
  }
}

/**
 * Run a multi-statement transaction with automatic BEGIN, COMMIT, and ROLLBACK.
 */
export async function transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
  const clientPool = getPostgresPool();
  const client = await clientPool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Health check that performs SELECT 1 against PostgreSQL.
 * Used by the Admin header status indicator to report real connection state.
 */
export async function checkPostgresHealth(): Promise<{
  connected: boolean;
  dbName: string;
  host?: string;
  error?: string;
}> {
  const config = getDbConfig();
  const dbName = ('database' in config ? config.database : 'techroles_db') || 'techroles_db';
  const host = ('host' in config ? config.host : 'localhost') || 'localhost';

  try {
    const res = await query('SELECT 1 as ping, current_database() as db, inet_server_addr() as server_ip');
    const connected = res.rows.length > 0 && res.rows[0].ping === 1;

    return {
      connected,
      dbName: res.rows[0]?.db || dbName,
      host: host
    };
  } catch (err: any) {
    console.error('[PostgresHealthCheck] Ping failed:', err.message);
    return {
      connected: false,
      dbName,
      host,
      error: err.message || 'Unable to connect to PostgreSQL'
    };
  }
}
