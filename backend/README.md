# IT Career Explorer — Backend Architecture & MongoDB Atlas Data Hub

This directory contains the entire backend implementation powering the **IT Career Explorer** website using **MongoDB Atlas** with live, continuously updateable data.

---

## Folder Structure

```text
backend/
├── config/
│   └── mongodb.ts           # Reusable MongoDB Atlas connection singleton
├── models/ / types/
│   └── role.ts              # TypeScript schemas (ITRole, ContributionDocument, RoleVersionDocument)
├── validations/
│   └── roleSchemas.ts       # Zod validation schemas for input validation
├── services/
│   ├── roleService.ts       # Core MongoDB CRUD operations, text search, versioning
│   └── contributionService.ts # IT Professional submission, approval, rejection, version history
├── scripts/
│   └── seedRoles.ts         # Database seed & index migration script
└── README.md                # Backend documentation
```

---

## Environment Configuration

Stored in `.env.local`:

```env
MONGODB_URI=mongodb+srv://gayathry2610_db_user:oZQ1e9OonRdPcCQq@techrole.xldw3h7.mongodb.net/?appName=TECHROLE
MONGODB_DB_NAME=TECHROLES
```

---

## Core Database Collections

1. **`roles`**: Contains all public, approved IT career roles.
2. **`contributions`**: Stores live submissions from IT professionals awaiting admin review (`pending`, `approved`, `rejected`).
3. **`role_versions`**: Audit trail storing version snapshots whenever a role is updated.

---

## API Endpoints

* `GET /api/roles`: List all roles from MongoDB Atlas (supports `query`, `category`, `tags`).
* `GET /api/roles/[slug]`: Fetch single role document by slug.
* `POST /api/contributions`: Public submission endpoint for IT professionals.
* `GET /api/contributions`: Admin endpoint to list submissions.
* `POST /api/admin/contributions/[id]/approve`: Approve submission and publish live to MongoDB Atlas.
* `POST /api/admin/contributions/[id]/reject`: Reject submission.

---

## Running Seed Operations

To seed or re-seed roles into your MongoDB Atlas database:

```bash
npx tsx backend/scripts/seedRoles.ts
```
