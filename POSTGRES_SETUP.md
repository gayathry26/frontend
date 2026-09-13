# PostgreSQL Database Architecture & Setup Guide

This document provides complete instructions for setting up, configuring, and maintaining the **PostgreSQL** database for the **IT Career Explorer** platform.

---

## 1. Overview

The backend has been completely migrated from MongoDB to **PostgreSQL**. All database queries use parameterized SQL via connection pooling (`pg.Pool`), transactions for multi-step mutations, relational foreign keys with cascade rules, and JSONB fields with GIN indexes for fast lookup.

### Architecture Highlights
- **Primary Database**: PostgreSQL 14+ (Tested and verified with PostgreSQL 18)
- **Driver**: Node `pg` (with connection pooling, parameterization, and transaction rollback)
- **Primary Schema**: 18 relational tables with constraints and indexes
- **Performance**: GIN indexes on JSONB arrays, B-Tree indexes on slugs, foreign keys, and status flags

---

## 2. Environment Configuration

Define these variables in your `.env.local` (for local development) or deployment environment:

```env
# Full Connection URL (preferred)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/techroles_db

# Granular Connection Parameters (fallback)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=techroles_db
DB_USER=postgres
DB_PASSWORD=postgres
DB_SSL=false
```

---

## 3. Database Setup Steps

### Step 3.1: Create Database in PostgreSQL

Using `psql` or pgAdmin:

```sql
CREATE DATABASE techroles_db;
```

### Step 3.2: Initialize Schema

Run the automated schema creation script. It reads `backend/db/schema.sql` and creates all tables, foreign keys, and indexes idempotently:

```bash
npm run db:init
```

### Step 3.3: Seed Data

Seed initial career roles and curated student opportunities:

```bash
# Seed 31+ IT career roles
npm run seed:roles

# Seed verified hackathons, CTFs, and workshops
npm run seed:events
```

---

## 4. Database Schema Structure

The PostgreSQL schema is defined in [backend/db/schema.sql](file:///backend/db/schema.sql) and includes:

| Table Name | Primary Key | Foreign Keys | Description |
| :--- | :--- | :--- | :--- |
| `roles` | `id` (VARCHAR) | None | Core IT career profiles (title, category, salary, roadmap, JSONB fields) |
| `role_skills` | `id` (SERIAL) | `role_id` -> `roles(id)` ON DELETE CASCADE | Atomic normalized skill links (technical, soft, tools) |
| `role_projects` | `id` (SERIAL) | `role_id` -> `roles(id)` ON DELETE CASCADE | Project recommendations by level |
| `role_certifications` | `id` (SERIAL) | `role_id` -> `roles(id)` ON DELETE CASCADE | Recommended industry certifications |
| `role_tools` | `id` (SERIAL) | `role_id` -> `roles(id)` ON DELETE CASCADE | Tools associated with roles |
| `role_versions` | `id` (SERIAL) | `role_id` -> `roles(id)` ON DELETE CASCADE | Historical version snapshots for audit trails |
| `contributions` | `id` (VARCHAR) | `role_id` -> `roles(id)` ON DELETE SET NULL | IT professional role submissions & peer edits |
| `events` | `id` (VARCHAR) | None | Hackathons, workshops, and student opportunities |
| `event_sync_logs` | `id` (VARCHAR) | None | Multi-source event ingestion sync runs |
| `companies` | `id` (VARCHAR) | None | Curated tech companies and hiring metadata |
| `audit_logs` | `id` (VARCHAR) | None | Administrative actions and security audit log |
| `role_update_logs` | `id` (VARCHAR) | `role_id` -> `roles(id)` ON DELETE CASCADE | Automation diff logs and change records |
| `source_configs` | `id` (VARCHAR) | None | Ingestion source configuration & enable states |
| `document_chunks` | `id` (VARCHAR) | None | Vector store / knowledge embeddings text chunks |
| `projects` | `id` (VARCHAR) | None | Student repository project analysis records |
| `interview_sessions`| `id` (VARCHAR) | `project_id` -> `projects(id)` ON DELETE CASCADE | Mock interview questions, answers, and evaluations |
| `adaptive_interview_sessions` | `id` (VARCHAR) | None | Adaptive interview engine sessions & logs |
| `survey_responses`| `id` (VARCHAR) | None | Career recommendation questionnaire responses |

---

## 5. Security & Query Safety

1. **Zero SQL Injection**: All queries use `$1, $2, ...` parameterized place-holders. No user input is directly concatenated into SQL strings.
2. **Transactions**: Multi-table updates (such as role creation + atomic skill mapping + version logging, or contribution approval) run within `BEGIN ... COMMIT` with automatic `ROLLBACK` upon errors.
3. **Connection Pooling**: Managed through a singleton `pg.Pool` with idle timeouts and automatic client release.

---

## 6. Verification & Health Monitoring

The health check endpoint tests the live PostgreSQL database:

```bash
GET /api/admin/health
```

Expected Response:
```json
{
  "status": "healthy",
  "database": {
    "status": "connected",
    "tablesCount": 18
  },
  "rolesCount": 31,
  "eventsCount": 18
}
```
