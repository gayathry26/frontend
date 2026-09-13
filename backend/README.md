# IT Career Explorer — Backend Architecture & PostgreSQL Data Hub

This directory contains the entire backend implementation powering the **IT Career Explorer** website using **PostgreSQL** with connection pooling, relational tables, transactions, JSONB indexing, and live updateable data.

---

## Folder Structure

```text
backend/
├── config/
│   └── postgres.ts          # Reusable PostgreSQL connection pool singleton (pg.Pool)
├── db/
│   ├── schema.sql           # Canonical PostgreSQL relational DDL schema
│   └── initDb.ts            # Schema initializer & table verification script
├── types/
│   ├── role.ts              # TypeScript schemas (ITRole, ContributionDocument, RoleVersionDocument)
│   └── event.ts             # Event, Workshop, Hackathon, and sync schemas
├── validations/
│   └── roleSchemas.ts       # Zod validation schemas for input validation
├── services/
│   ├── roleService.ts       # Core PostgreSQL CRUD operations, parameterized search, versioning
│   ├── eventService.ts      # Event filtering, full-text search, role-matching, and upserting
│   ├── companyService.ts    # Companies catalog & discovery
│   ├── contributionService.ts # IT Professional submission, approval, rejection, version history
│   ├── auditService.ts      # Administrative audit logging
│   └── automationPipelineService.ts # Ingestion pipelines, hashing, and source tracking
├── scripts/
│   ├── seedRoles.ts         # Database seed script for roles
│   ├── seedEvents.ts        # Database seed script for verified events
│   └── syncEvents.ts        # Ingestion synchronization script
└── README.md                # Backend documentation
```

---

## Environment Configuration

Stored in `.env.local`:

```env
# PostgreSQL Database Connection
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/techroles_db
DB_HOST=localhost
DB_PORT=5432
DB_NAME=techroles_db
DB_USER=postgres
DB_PASSWORD=postgres
DB_SSL=false
```

---

## Core Database Tables

1. **`roles`**: Contains all public, approved IT career roles with JSONB arrays/objects for deep career data.
2. **`role_versions`**: Audit trail storing version snapshots whenever a role is updated.
3. **`contributions`**: Stores live submissions from IT professionals awaiting admin review (`pending`, `approved`, `rejected`).
4. **`events`**: Ingested and curated hackathons, CTFs, workshops, and student opportunities with GIN index on career roles.
5. **`companies`**: Curated tech companies and hiring metadata.
6. **`audit_logs`**: System-wide administrative action logs.
7. **`role_update_logs`**: Detailed diff and automation logs per role update.
8. **`interview_sessions`** & **`projects`**: Student interview analysis, assessment questions, and generated reports.

---

## Database Management Commands

```bash
# Initialize PostgreSQL schema (creates tables, indexes, constraints)
npm run db:init

# Seed roles into PostgreSQL
npm run seed:roles

# Seed verified student events into PostgreSQL
npm run seed:events
```
