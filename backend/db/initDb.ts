import fs from 'fs';
import path from 'path';
import { query, checkPostgresHealth } from '../config/postgres';

export async function initializeDatabase(): Promise<boolean> {
  console.log('🚀 Initializing PostgreSQL Database for IT Career Explorer...');

  try {
    const health = await checkPostgresHealth();
    if (!health.connected) {
      console.error('❌ Cannot connect to PostgreSQL database:', health.error);
      return false;
    }

    console.log(`✓ Connected to PostgreSQL database "${health.dbName}" on host "${health.host}"`);

    const schemaPath = path.join(__dirname, 'schema.sql');
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found at ${schemaPath}`);
    }

    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    console.log('⏳ Executing schema.sql DDL statements...');

    await query(schemaSql);
    console.log('✅ All tables, constraints, and indexes created successfully!');

    // Query list of tables in public schema to verify
    const tableRes = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    const tables = tableRes.rows.map(r => r.table_name);
    console.log(`📋 Verified ${tables.length} tables in PostgreSQL database:`);
    tables.forEach(t => console.log(`   - ${t}`));

    return true;
  } catch (err: any) {
    console.error('❌ Failed to initialize database:', err.message);
    return false;
  }
}

if (require.main === module) {
  initializeDatabase()
    .then(success => {
      if (!success) process.exit(1);
      process.exit(0);
    })
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}
