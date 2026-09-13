import { query } from '../backend/config/postgres';
import { initializeDatabase } from '../backend/db/initDb';
import { itRoles } from '../src/data/itRoles';
import { INITIAL_COMPANIES } from '../backend/services/companyService';
import { CURATED_IT_COMPANIES } from '../backend/services/companyDiscoveryService';
import dotenv from 'dotenv';
import path from 'path';

const DEFAULT_SOURCES = [
  { id: 'src-aws-tech', name: 'AWS Architecture Blog', url: 'https://aws.amazon.com/blogs/architecture/feed/', enabled: true },
  { id: 'src-google-dev', name: 'Google Developers Blog', url: 'https://developers.googleblog.com/feeds/posts/default', enabled: true },
  { id: 'src-microsoft-eng', name: 'Microsoft Engineering Blog', url: 'https://devblogs.microsoft.com/feed/', enabled: true }
];

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'TECHROLES';

async function migrate() {
  console.log('====================================================');
  console.log('🔄 MongoDB to PostgreSQL Migration Process');
  console.log('====================================================');

  // Step 1: Ensure Postgres schema is initialized
  console.log('\n[1/4] Ensuring PostgreSQL schema exists...');
  const initSuccess = await initializeDatabase();
  if (!initSuccess) {
    throw new Error('Failed to initialize PostgreSQL schema.');
  }

  // Step 2: Connect to MongoDB Atlas (if URI available)
  let mongoClient: any = null;
  let mongoDb: any = null;

  if (MONGODB_URI) {
    try {
      console.log('\n[2/4] Connecting to MongoDB Atlas to read existing data...');
      const { MongoClient } = await (eval('import("mongodb")') as Promise<any>);
      mongoClient = new MongoClient(MONGODB_URI, { family: 4, serverSelectionTimeoutMS: 10000 });
      await mongoClient.connect();
      mongoDb = mongoClient.db(MONGODB_DB_NAME);
      console.log(`✓ Connected to MongoDB Atlas (${MONGODB_DB_NAME})`);
    } catch (err: any) {
      console.warn('⚠️ Could not connect to MongoDB Atlas:', err.message);
      console.log('   Proceeding with static dataset seeding to PostgreSQL.');
    }
  } else {
    console.log('\n[2/4] MONGODB_URI not provided. Seeding directly from codebase datasets.');
  }

  // Step 3: Migrate each collection
  console.log('\n[3/4] Migrating data into PostgreSQL...');

  // 3.1 Migrate Roles
  let rolesToInsert: any[] = [];
  if (mongoDb) {
    try {
      rolesToInsert = await mongoDb.collection('roles').find({}).toArray();
      console.log(`   Found ${rolesToInsert.length} roles in MongoDB Atlas.`);
    } catch (e: any) {
      console.warn('   Failed to query roles from MongoDB:', e.message);
    }
  }

  if (rolesToInsert.length === 0) {
    console.log(`   Using ${itRoles.length} roles from static itRoles dataset.`);
    const now = new Date().toISOString();
    rolesToInsert = itRoles.map(r => ({
      ...r,
      status: 'approved',
      version: 1,
      verified: true,
      createdAt: now,
      updatedAt: now
    }));
  }

  let rolesMigrated = 0;
  for (const role of rolesToInsert) {
    const slug = role.id;
    const title = role.title || slug;
    const category = role.category || 'Software Development';
    const shortDesc = role.shortDescription || '';
    const scope = role.scope || '';
    const projection = role.jobMarketProjection || '';
    const codingLevel = role.codingLevel || '';
    const workMode = role.workMode || '';
    const dayToDay = role.dayToDayWork || '';
    const status = role.status || 'approved';
    const version = role.version || 1;
    const verified = role.verified !== false;
    const tags = JSON.stringify(role.tags || []);
    const altNames = JSON.stringify(role.alternateNames || []);
    const techSkills = JSON.stringify(role.technicalSkills || []);
    const softSkills = JSON.stringify(role.softSkills || []);
    const tools = JSON.stringify(role.tools || []);
    const industry = JSON.stringify(role.industry || []);
    const resp = JSON.stringify(role.responsibilities || []);
    const edu = JSON.stringify(role.education || []);
    const locs = JSON.stringify(role.locations || []);
    const relRoles = JSON.stringify(role.relatedRoles || []);
    const careerLadder = JSON.stringify(role.careerLadder || []);
    const hiringCompanies = JSON.stringify(role.hiringCompanies || []);
    const stats = JSON.stringify(role.stats || {});
    const projects = JSON.stringify(role.projects || { beginner: [], intermediate: [], advanced: [] });
    const certs = JSON.stringify(role.certifications || []);
    const resources = JSON.stringify(role.learningResources || []);
    const roadmap = JSON.stringify(role.roadmap || []);
    const assessQuestions = JSON.stringify(role.assessmentQuestions || []);
    const interviewQuestions = JSON.stringify(role.interviewQuestions || []);
    const practicePlatforms = JSON.stringify(role.practicePlatforms || []);
    const createdAt = role.createdAt || new Date().toISOString();
    const updatedAt = role.updatedAt || new Date().toISOString();

    await query(`
      INSERT INTO roles (
        id, title, category, short_description, scope, job_market_projection,
        coding_level, work_mode, day_to_day_work, status, version, verified,
        tags, alternate_names, technical_skills, soft_skills, tools, industry,
        responsibilities, education, locations, related_roles, career_ladder,
        hiring_companies, stats, projects, certifications, learning_resources,
        roadmap, assessment_questions, interview_questions, practice_platforms,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11, $12,
        $13, $14, $15, $16, $17, $18,
        $19, $20, $21, $22, $23,
        $24, $25, $26, $27, $28,
        $29, $30, $31, $32,
        $33, $34
      )
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        category = EXCLUDED.category,
        short_description = EXCLUDED.short_description,
        scope = EXCLUDED.scope,
        job_market_projection = EXCLUDED.job_market_projection,
        technical_skills = EXCLUDED.technical_skills,
        soft_skills = EXCLUDED.soft_skills,
        tools = EXCLUDED.tools,
        projects = EXCLUDED.projects,
        certifications = EXCLUDED.certifications,
        updated_at = EXCLUDED.updated_at;
    `, [
      slug, title, category, shortDesc, scope, projection,
      codingLevel, workMode, dayToDay, status, version, verified,
      tags, altNames, techSkills, softSkills, tools, industry,
      resp, edu, locs, relRoles, careerLadder,
      hiringCompanies, stats, projects, certs, resources,
      roadmap, assessQuestions, interviewQuestions, practicePlatforms,
      createdAt, updatedAt
    ]);
    rolesMigrated++;
  }
  console.log(`   ✓ Migrated/upserted ${rolesMigrated} roles into PostgreSQL.`);

  // 3.2 Migrate Role Versions
  if (mongoDb) {
    try {
      const versions = await mongoDb.collection('role_versions').find({}).toArray();
      let count = 0;
      for (const v of versions) {
        await query(`
          INSERT INTO role_versions (role_id, version, previous_data, new_data, approved_by, created_at)
          VALUES ($1, $2, $3, $4, $5, $6);
        `, [
          v.roleId,
          v.version || 1,
          JSON.stringify(v.previousData || {}),
          JSON.stringify(v.newData || {}),
          v.approvedBy || 'admin',
          v.createdAt || new Date().toISOString()
        ]);
        count++;
      }
      console.log(`   ✓ Migrated ${count} role versions.`);
    } catch (e: any) {
      console.warn('   Could not migrate role versions:', e.message);
    }
  }

  // 3.3 Migrate Events
  let eventsToInsert: any[] = [];
  if (mongoDb) {
    try {
      eventsToInsert = await mongoDb.collection('events').find({}).toArray();
      console.log(`   Found ${eventsToInsert.length} events in MongoDB.`);
    } catch (e: any) {}
  }

  let eventsMigrated = 0;
  for (const ev of eventsToInsert) {
    if (!ev.slug || !ev.title) continue;
    await query(`
      INSERT INTO events (
        slug, title, description, type, organizer, location, dates,
        skills, career_roles, prize, url, source, sources, status,
        last_synced_at, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      ON CONFLICT (slug) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        type = EXCLUDED.type,
        dates = EXCLUDED.dates,
        status = EXCLUDED.status,
        updated_at = EXCLUDED.updated_at;
    `, [
      ev.slug,
      ev.title,
      ev.description || '',
      ev.type || 'HACKATHON',
      JSON.stringify(ev.organizer || {}),
      JSON.stringify(ev.location || { country: 'India', mode: 'ONLINE' }),
      JSON.stringify(ev.dates || {}),
      JSON.stringify(ev.skills || []),
      JSON.stringify(ev.careerRoles || []),
      JSON.stringify(ev.prize || {}),
      ev.url || '',
      ev.source || '',
      JSON.stringify(ev.sources || []),
      ev.status || 'UPCOMING',
      ev.lastSyncedAt || null,
      ev.createdAt || new Date().toISOString(),
      ev.updatedAt || new Date().toISOString()
    ]);
    eventsMigrated++;
  }
  console.log(`   ✓ Migrated ${eventsMigrated} events into PostgreSQL.`);

  // 3.4 Migrate Companies
  let companiesToInsert: any[] = [];
  if (mongoDb) {
    try {
      companiesToInsert = await mongoDb.collection('companies').find({}).toArray();
      console.log(`   Found ${companiesToInsert.length} companies in MongoDB.`);
    } catch (e: any) {}
  }

  if (companiesToInsert.length === 0) {
    const combinedCompanies = [...INITIAL_COMPANIES, ...CURATED_IT_COMPANIES];
    const uniqueMap = new Map<string, any>();
    combinedCompanies.forEach(c => uniqueMap.set(c.id, c));
    companiesToInsert = Array.from(uniqueMap.values());
    console.log(`   Using ${companiesToInsert.length} curated companies from codebase.`);
  }

  let companiesMigrated = 0;
  for (const c of companiesToInsert) {
    if (!c.id || !c.name) continue;
    await query(`
      INSERT INTO companies (
        id, name, cin, type, categories, industries, domains, technologies,
        locations, description, website, email, phone, address, coordinates,
        employee_count, founded_year, hiring, startup, related_roles,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        type = EXCLUDED.type,
        technologies = EXCLUDED.technologies,
        description = EXCLUDED.description,
        hiring = EXCLUDED.hiring,
        startup = EXCLUDED.startup,
        updated_at = EXCLUDED.updated_at;
    `, [
      c.id,
      c.name,
      c.cin || null,
      c.type || 'Product',
      JSON.stringify(c.categories || []),
      JSON.stringify(c.industries || []),
      JSON.stringify(c.domains || []),
      JSON.stringify(c.technologies || []),
      JSON.stringify(c.locations || []),
      c.description || '',
      c.website || '',
      c.email || null,
      c.phone || null,
      JSON.stringify(c.address || { country: 'India' }),
      JSON.stringify(c.coordinates || null),
      c.employeeCount || null,
      c.foundedYear || null,
      Boolean(c.hiring),
      Boolean(c.startup),
      JSON.stringify(c.relatedRoles || []),
      c.createdAt || new Date().toISOString(),
      c.updatedAt || new Date().toISOString()
    ]);
    companiesMigrated++;
  }
  console.log(`   ✓ Migrated/seeded ${companiesMigrated} companies into PostgreSQL.`);

  // 3.5 Migrate Contributions
  if (mongoDb) {
    try {
      const contributions = await mongoDb.collection('contributions').find({}).toArray();
      let count = 0;
      for (const cb of contributions) {
        await query(`
          INSERT INTO contributions (
            role_id, contributor, submitted_data, source, status,
            reviewer_name, admin_notes, reviewed_at, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10);
        `, [
          cb.roleId,
          JSON.stringify(cb.contributor || {}),
          JSON.stringify(cb.submittedData || {}),
          cb.source || 'IT Professional Submission',
          cb.status || 'pending',
          cb.reviewerName || null,
          cb.adminNotes || null,
          cb.reviewedAt || null,
          cb.createdAt || new Date().toISOString(),
          cb.updatedAt || new Date().toISOString()
        ]);
        count++;
      }
      console.log(`   ✓ Migrated ${count} contributions into PostgreSQL.`);
    } catch (e: any) {
      console.warn('   Could not migrate contributions:', e.message);
    }
  }

  // 3.6 Migrate Audit Logs
  if (mongoDb) {
    try {
      const logs = await mongoDb.collection('audit_logs').find({}).toArray();
      const adminLogs = await mongoDb.collection('adminAuditLogs').find({}).toArray();
      const allLogs = [...logs, ...adminLogs];
      let count = 0;
      for (const l of allLogs) {
        await query(`
          INSERT INTO audit_logs (
            admin_id, action, role_id, role_name, field, old_value, new_value,
            before_state, after_state, details, status, performed_by, timestamp
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13);
        `, [
          l.adminId || 'admin',
          l.action || 'UPDATE',
          l.roleId || null,
          l.roleName || null,
          l.field || null,
          JSON.stringify(l.oldValue || null),
          JSON.stringify(l.newValue || null),
          JSON.stringify(l.before || null),
          JSON.stringify(l.after || null),
          l.details || null,
          l.status || 'success',
          l.performedBy || 'admin',
          l.timestamp || new Date().toISOString()
        ]);
        count++;
      }
      console.log(`   ✓ Migrated ${count} audit logs into PostgreSQL.`);
    } catch (e: any) {
      console.warn('   Could not migrate audit logs:', e.message);
    }
  }

  // 3.7 Migrate Professional Submissions
  if (mongoDb) {
    try {
      const submissions = await mongoDb.collection('professional_submissions').find({}).toArray();
      let count = 0;
      for (const s of submissions) {
        await query(`
          INSERT INTO professional_submissions (
            role_id, role_title, years_of_experience, industry,
            technical_skills, soft_skills, tools, recommended_skills, status, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10);
        `, [
          s.roleId || '',
          s.roleTitle || 'Untitled Role',
          s.yearsOfExperience || '1-3 years',
          s.industry || 'Technology',
          JSON.stringify(s.technicalSkills || []),
          JSON.stringify(s.softSkills || []),
          JSON.stringify(s.tools || []),
          JSON.stringify(s.recommendedSkills || []),
          s.status || 'approved',
          s.createdAt || new Date().toISOString()
        ]);
        count++;
      }
      console.log(`   ✓ Migrated ${count} professional submissions into PostgreSQL.`);
    } catch (e: any) {
      console.warn('   Could not migrate professional submissions:', e.message);
    }
  }

  // 3.8 Migrate Role Update Logs
  if (mongoDb) {
    try {
      const updateLogs = await mongoDb.collection('role_update_logs').find({}).toArray();
      let count = 0;
      for (const u of updateLogs) {
        await query(`
          INSERT INTO role_update_logs (
            role_id, role_title, category, change_type, added_technical_skills,
            added_soft_skills, added_tools, source_name, source_url, confidence,
            status, content_hash, reason, detected_at, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15);
        `, [
          u.roleId || '',
          u.roleTitle || '',
          u.category || '',
          u.changeType || '',
          JSON.stringify(u.addedTechnicalSkills || []),
          JSON.stringify(u.addedSoftSkills || []),
          JSON.stringify(u.addedTools || []),
          u.sourceName || '',
          u.sourceUrl || '',
          u.confidence || 0.9,
          u.status || 'APPLIED',
          u.contentHash || '',
          u.reason || '',
          u.detectedAt || new Date().toISOString(),
          u.createdAt || new Date().toISOString()
        ]);
        count++;
      }
      console.log(`   ✓ Migrated ${count} role update logs into PostgreSQL.`);
    } catch (e: any) {
      console.warn('   Could not migrate role update logs:', e.message);
    }
  }

  // 3.9 Seed Source Configs
  for (const src of DEFAULT_SOURCES) {
    await query(`
      INSERT INTO source_configs (id, name, url, enabled)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (id) DO NOTHING;
    `, [src.id, src.name, src.url, src.enabled]);
  }
  console.log(`   ✓ Initialized ${DEFAULT_SOURCES.length} automation source configs.`);

  if (mongoClient) {
    await mongoClient.close();
    console.log('\n[4/4] Closed MongoDB connection.');
  }

  // Final verification report
  console.log('\n====================================================');
  console.log('📊 Migration Complete - PostgreSQL Verification Stats:');
  console.log('====================================================');

  const statsRes = await query(`
    SELECT
      (SELECT COUNT(*) FROM roles) as roles,
      (SELECT COUNT(*) FROM role_versions) as role_versions,
      (SELECT COUNT(*) FROM events) as events,
      (SELECT COUNT(*) FROM companies) as companies,
      (SELECT COUNT(*) FROM contributions) as contributions,
      (SELECT COUNT(*) FROM audit_logs) as audit_logs,
      (SELECT COUNT(*) FROM professional_submissions) as professional_submissions,
      (SELECT COUNT(*) FROM role_update_logs) as role_update_logs,
      (SELECT COUNT(*) FROM source_configs) as source_configs;
  `);

  console.table(statsRes.rows[0]);
  console.log('🎉 Database migration successfully completed!');
}

migrate()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Fatal migration error:', err);
    process.exit(1);
  });
