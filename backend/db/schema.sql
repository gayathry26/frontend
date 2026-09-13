-- ============================================================================
-- PostgreSQL Database Schema for IT Career Explorer
-- Completely replaces MongoDB with PostgreSQL 18+
-- ============================================================================

-- 1. ROLES TABLE
CREATE TABLE IF NOT EXISTS roles (
  id VARCHAR(100) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  short_description TEXT NOT NULL DEFAULT '',
  scope TEXT DEFAULT '',
  job_market_projection TEXT DEFAULT '',
  coding_level VARCHAR(50) DEFAULT '',
  work_mode VARCHAR(50) DEFAULT '',
  day_to_day_work TEXT DEFAULT '',
  status VARCHAR(50) NOT NULL DEFAULT 'approved',
  version INTEGER NOT NULL DEFAULT 1,
  verified BOOLEAN NOT NULL DEFAULT true,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  alternate_names JSONB NOT NULL DEFAULT '[]'::jsonb,
  technical_skills JSONB NOT NULL DEFAULT '[]'::jsonb,
  soft_skills JSONB NOT NULL DEFAULT '[]'::jsonb,
  tools JSONB NOT NULL DEFAULT '[]'::jsonb,
  industry JSONB NOT NULL DEFAULT '[]'::jsonb,
  responsibilities JSONB NOT NULL DEFAULT '[]'::jsonb,
  education JSONB NOT NULL DEFAULT '[]'::jsonb,
  locations JSONB NOT NULL DEFAULT '[]'::jsonb,
  related_roles JSONB NOT NULL DEFAULT '[]'::jsonb,
  career_ladder JSONB NOT NULL DEFAULT '[]'::jsonb,
  hiring_companies JSONB NOT NULL DEFAULT '[]'::jsonb,
  stats JSONB NOT NULL DEFAULT '{}'::jsonb,
  projects JSONB NOT NULL DEFAULT '{"beginner":[],"intermediate":[],"advanced":[]}'::jsonb,
  certifications JSONB NOT NULL DEFAULT '[]'::jsonb,
  learning_resources JSONB NOT NULL DEFAULT '[]'::jsonb,
  roadmap JSONB NOT NULL DEFAULT '[]'::jsonb,
  assessment_questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  interview_questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  practice_platforms JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_roles_category ON roles(category);
CREATE INDEX IF NOT EXISTS idx_roles_status ON roles(status);
CREATE INDEX IF NOT EXISTS idx_roles_title ON roles(title);
CREATE INDEX IF NOT EXISTS idx_roles_tech_skills ON roles USING GIN(technical_skills);
CREATE INDEX IF NOT EXISTS idx_roles_soft_skills ON roles USING GIN(soft_skills);
CREATE INDEX IF NOT EXISTS idx_roles_tools ON roles USING GIN(tools);

-- 2. ROLE VERSIONS TABLE (Tracks history & audit trail of role modifications)
CREATE TABLE IF NOT EXISTS role_versions (
  id SERIAL PRIMARY KEY,
  role_id VARCHAR(100) NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  previous_data JSONB NOT NULL,
  new_data JSONB NOT NULL,
  approved_by VARCHAR(100) DEFAULT 'admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_role_versions_role_id ON role_versions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_versions_created_at ON role_versions(created_at DESC);

-- 3. EVENTS TABLE (Hackathons, webinars, workshops, tech fests, etc.)
CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(255) UNIQUE NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT DEFAULT '',
  type VARCHAR(100) NOT NULL DEFAULT 'HACKATHON',
  organizer JSONB NOT NULL DEFAULT '{}'::jsonb,
  location JSONB NOT NULL DEFAULT '{"country":"India","mode":"ONLINE"}'::jsonb,
  dates JSONB NOT NULL DEFAULT '{}'::jsonb,
  skills JSONB NOT NULL DEFAULT '[]'::jsonb,
  career_roles JSONB NOT NULL DEFAULT '[]'::jsonb,
  prize JSONB DEFAULT '{}'::jsonb,
  url TEXT DEFAULT '',
  source VARCHAR(100) DEFAULT '',
  sources JSONB NOT NULL DEFAULT '[]'::jsonb,
  status VARCHAR(50) NOT NULL DEFAULT 'UPCOMING',
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_events_slug ON events(slug);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_skills ON events USING GIN(skills);
CREATE INDEX IF NOT EXISTS idx_events_career_roles ON events USING GIN(career_roles);

-- 4. EVENT SYNC LOGS TABLE
CREATE TABLE IF NOT EXISTS event_sync_logs (
  id SERIAL PRIMARY KEY,
  sync_id VARCHAR(100) NOT NULL,
  report JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_event_sync_logs_sync_id ON event_sync_logs(sync_id);

-- 5. COMPANIES TABLE
CREATE TABLE IF NOT EXISTS companies (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  cin VARCHAR(100),
  type VARCHAR(100) DEFAULT 'Product',
  categories JSONB NOT NULL DEFAULT '[]'::jsonb,
  industries JSONB NOT NULL DEFAULT '[]'::jsonb,
  domains JSONB NOT NULL DEFAULT '[]'::jsonb,
  technologies JSONB NOT NULL DEFAULT '[]'::jsonb,
  locations JSONB NOT NULL DEFAULT '[]'::jsonb,
  description TEXT DEFAULT '',
  website TEXT DEFAULT '',
  email VARCHAR(255),
  phone VARCHAR(100),
  address JSONB NOT NULL DEFAULT '{"country":"India"}'::jsonb,
  coordinates JSONB,
  employee_count VARCHAR(100),
  founded_year INTEGER,
  hiring BOOLEAN NOT NULL DEFAULT false,
  startup BOOLEAN NOT NULL DEFAULT false,
  related_roles JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);
CREATE INDEX IF NOT EXISTS idx_companies_type ON companies(type);
CREATE INDEX IF NOT EXISTS idx_companies_hiring ON companies(hiring);
CREATE INDEX IF NOT EXISTS idx_companies_startup ON companies(startup);
CREATE INDEX IF NOT EXISTS idx_companies_technologies ON companies USING GIN(technologies);

-- 6. CONTRIBUTIONS TABLE (IT Professional role contributions)
CREATE TABLE IF NOT EXISTS contributions (
  id SERIAL PRIMARY KEY,
  role_id VARCHAR(100) NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  contributor JSONB NOT NULL DEFAULT '{}'::jsonb,
  submitted_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  source VARCHAR(255) DEFAULT 'IT Professional Submission',
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  reviewer_name VARCHAR(100),
  admin_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_contributions_role_id ON contributions(role_id);
CREATE INDEX IF NOT EXISTS idx_contributions_status ON contributions(status);

-- 7. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  admin_id VARCHAR(100) DEFAULT 'admin',
  action VARCHAR(100) NOT NULL,
  role_id VARCHAR(100),
  role_name VARCHAR(255),
  field VARCHAR(100),
  old_value JSONB,
  new_value JSONB,
  before_state JSONB,
  after_state JSONB,
  details TEXT,
  status VARCHAR(50) DEFAULT 'success',
  performed_by VARCHAR(100) DEFAULT 'admin',
  timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_role_id ON audit_logs(role_id);

-- 8. PROFESSIONAL SUBMISSIONS TABLE (Experience survey submissions)
CREATE TABLE IF NOT EXISTS professional_submissions (
  id SERIAL PRIMARY KEY,
  role_id VARCHAR(100),
  role_title VARCHAR(255) NOT NULL,
  years_of_experience VARCHAR(50),
  industry VARCHAR(100),
  technical_skills JSONB NOT NULL DEFAULT '[]'::jsonb,
  soft_skills JSONB NOT NULL DEFAULT '[]'::jsonb,
  tools JSONB NOT NULL DEFAULT '[]'::jsonb,
  recommended_skills JSONB NOT NULL DEFAULT '[]'::jsonb,
  status VARCHAR(50) NOT NULL DEFAULT 'approved',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_prof_sub_role_id ON professional_submissions(role_id);
CREATE INDEX IF NOT EXISTS idx_prof_sub_created_at ON professional_submissions(created_at DESC);

-- 9. PROJECTS TABLE
CREATE TABLE IF NOT EXISTS projects (
  project_id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255),
  readme_content TEXT,
  profile JSONB DEFAULT '{}'::jsonb,
  claims JSONB DEFAULT '[]'::jsonb,
  knowledge_nodes JSONB DEFAULT '[]'::jsonb,
  chunks_count INTEGER DEFAULT 0,
  topics JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 10. INTERVIEW SESSIONS TABLE (Project interview RAG sessions)
CREATE TABLE IF NOT EXISTS interview_sessions (
  session_id VARCHAR(255) PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(50) DEFAULT 'IN_PROGRESS',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_interview_sessions_status ON interview_sessions(status);

-- 11. ANALYZED GITHUB REPOSITORIES TABLE
CREATE TABLE IF NOT EXISTS analyzed_github_repositories (
  project_id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255),
  url TEXT,
  project_knowledge JSONB DEFAULT '{}'::jsonb,
  summary TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 12. ADAPTIVE INTERVIEW SESSIONS TABLE
CREATE TABLE IF NOT EXISTS adaptive_interview_sessions (
  session_id VARCHAR(255) PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(50) DEFAULT 'IN_PROGRESS',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_adapt_interview_sessions_status ON adaptive_interview_sessions(status);

-- 13. ROLE UPDATE LOGS TABLE (Automated pipeline detection logs)
CREATE TABLE IF NOT EXISTS role_update_logs (
  id SERIAL PRIMARY KEY,
  role_id VARCHAR(100),
  role_title VARCHAR(255),
  category VARCHAR(100),
  change_type VARCHAR(100),
  added_technical_skills JSONB DEFAULT '[]'::jsonb,
  added_soft_skills JSONB DEFAULT '[]'::jsonb,
  added_tools JSONB DEFAULT '[]'::jsonb,
  source_name VARCHAR(255),
  source_url TEXT,
  confidence FLOAT,
  status VARCHAR(50),
  content_hash VARCHAR(255),
  reason TEXT,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_role_update_logs_role_id ON role_update_logs(role_id);
CREATE INDEX IF NOT EXISTS idx_role_update_logs_status ON role_update_logs(status);
CREATE INDEX IF NOT EXISTS idx_role_update_logs_detected_at ON role_update_logs(detected_at DESC);

-- 14. SOURCE CONFIGS TABLE
CREATE TABLE IF NOT EXISTS source_configs (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 15. SOURCE CONTENT HASHES TABLE
CREATE TABLE IF NOT EXISTS source_content_hashes (
  content_hash VARCHAR(255) PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 16. DOCUMENT CHUNKS TABLE (RAG vector knowledge chunks)
CREATE TABLE IF NOT EXISTS document_chunks (
  id SERIAL PRIMARY KEY,
  chunk_id VARCHAR(255),
  project_id VARCHAR(255) NOT NULL,
  file_path TEXT,
  content TEXT,
  embedding JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_doc_chunks_project_id ON document_chunks(project_id);

-- 17. INTERNSHIPS TABLE (Future-proof for overview count and internship tracking)
CREATE TABLE IF NOT EXISTS internships (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  company VARCHAR(255),
  location VARCHAR(255),
  stipend VARCHAR(100),
  duration VARCHAR(100),
  url TEXT,
  status VARCHAR(50) DEFAULT 'OPEN',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 18. LEARNING RESOURCES TABLE (Future-proof for overview count and resource tracking)
CREATE TABLE IF NOT EXISTS learning_resources (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  type VARCHAR(100),
  url TEXT,
  category VARCHAR(100),
  free_or_paid VARCHAR(20) DEFAULT 'FREE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
