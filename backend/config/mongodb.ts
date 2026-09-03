import { MongoClient, Db } from 'mongodb';
import dns from 'dns';

// Set public DNS servers to resolve MongoDB Atlas SRV records reliably on Windows
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch {}

let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

export function getMongoUri(): string | undefined {
  return process.env.MONGODB_URI?.trim();
}

export function getDbName(): string {
  return (process.env.MONGODB_DB_NAME || 'TECHROLES').trim();
}

export function isMongoConfigured(): boolean {
  const uri = getMongoUri();
  return !!uri && uri.startsWith('mongodb');
}

export async function getMongoClient(): Promise<MongoClient> {
  const uri = getMongoUri();
  if (!uri) {
    throw new Error('Please set MONGODB_URI in your environment or .env.local file');
  }

  // Set standard pool, timeout and IPv4 options suitable for Windows Node.js & MongoDB Atlas
  const options = {
    family: 4, // Force IPv4 resolution to prevent Windows IPv6 OpenSSL TLS alert 80 errors
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
    maxPoolSize: 10,
    minPoolSize: 1
  };

  if (process.env.NODE_ENV === 'development') {
    if (!global._mongoClientPromise) {
      client = new MongoClient(uri, options);
      global._mongoClientPromise = client.connect().catch(err => {
        // Clear cached promise on rejection so subsequent calls retry fresh connection
        global._mongoClientPromise = undefined;
        console.error('MongoDB Atlas connection failed:', err.message);
        throw err;
      });
    }
    return global._mongoClientPromise;
  } else {
    if (!clientPromise) {
      client = new MongoClient(uri, options);
      clientPromise = client.connect().catch(err => {
        clientPromise = null;
        console.error('MongoDB Atlas connection failed:', err.message);
        throw err;
      });
    }
    return clientPromise;
  }
}

export async function getDb(): Promise<Db> {
  const clientInstance = await getMongoClient();
  return clientInstance.db(getDbName());
}

/**
 * Health check that performs an actual db.command({ ping: 1 }) against MongoDB Atlas.
 * Used by the Admin header status indicator to report REAL connection state.
 */
export async function checkMongoHealth(): Promise<{
  connected: boolean;
  dbName: string;
  host?: string;
  error?: string;
}> {
  const dbName = getDbName();
  if (!isMongoConfigured()) {
    return { connected: false, dbName, error: 'MONGODB_URI is missing' };
  }

  try {
    const db = await getDb();
    const pingResult = await db.command({ ping: 1 });
    const isOk = pingResult && (pingResult.ok === 1 || pingResult.ok === true);

    const uri = getMongoUri();
    let safeHost = 'MongoDB Atlas';
    try {
      if (uri) {
        const parsed = new URL(uri.replace('mongodb+srv://', 'https://').replace('mongodb://', 'https://'));
        safeHost = parsed.hostname;
      }
    } catch {}

    return {
      connected: Boolean(isOk),
      dbName,
      host: safeHost
    };
  } catch (err: any) {
    console.error('[MongoHealthCheck] Ping failed:', err.message);
    return {
      connected: false,
      dbName,
      error: err.message || 'Unable to connect to MongoDB Atlas'
    };
  }
}
