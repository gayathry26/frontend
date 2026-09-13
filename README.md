# IT Career Explorer

A comprehensive career guidance and discovery platform for IT professionals and students, powered by Next.js and PostgreSQL.

## Backend Database: PostgreSQL

The application backend uses **PostgreSQL** as the primary and only database, featuring relational schemas, foreign keys, cascade deletes, JSONB fields with GIN indexes, connection pooling (`pg.Pool`), and atomic transactions.

For detailed database architecture and setup instructions, see [POSTGRES_SETUP.md](./POSTGRES_SETUP.md).

## Getting Started

### 1. Configure Environment

Create or update `.env.local` with your PostgreSQL database credentials:

```env
# PostgreSQL Database Connection
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/techroles_db
DB_HOST=localhost
DB_PORT=5432
DB_NAME=techroles_db
DB_USER=postgres
DB_PASSWORD=postgres
DB_PORT=5432
DB_SSL=false
```

### 2. Initialize Database & Seed

```bash
# 1. Initialize PostgreSQL schema (creates all 18 tables, indexes, constraints)
npm run db:init

# 2. Seed initial roles
npm run seed:roles

# 3. Seed initial student opportunities & events
npm run seed:events
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Database Tables

* `roles` — Full IT career profiles (categories, technical & soft skills, certifications, roadmap, salaries)
* `role_versions` — Audit history of role changes
* `contributions` — Community submissions from IT professionals
* `events` — Hackathons, workshops, and student opportunities with role matching
* `companies` — IT company directory & hiring insights
* `audit_logs` — System administration audit log
* `role_update_logs` — Pipeline update diff logs
* `interview_sessions` & `projects` — Project interview AI assessments

