import { query, isPostgresConfigured } from '../config/postgres';
import { EventDocument, EventCategory, EventMode, EventStatus } from '../types/event';
import { processAndNormalizeEvent, resolveEventStatus } from './eventIngestionService';

export interface EventFilterQuery {
  category?: EventCategory;
  state?: string;
  city?: string;
  mode?: EventMode;
  skill?: string;
  role?: string;
  status?: EventStatus;
  search?: string;
  limit?: number;
}

export function mapRowToEventDocument(row: any): EventDocument {
  const dates = typeof row.dates === 'string' ? JSON.parse(row.dates) : (row.dates || {});
  const updatedStatus = resolveEventStatus(dates.registrationDeadline, row.status);

  return {
    _id: String(row.id),
    title: row.title,
    slug: row.slug,
    description: row.description || '',
    type: row.type,
    organizer: typeof row.organizer === 'string' ? JSON.parse(row.organizer) : (row.organizer || {}),
    location: typeof row.location === 'string' ? JSON.parse(row.location) : (row.location || {}),
    dates: dates,
    eligibility: Array.isArray(row.eligibility) ? row.eligibility : (typeof row.eligibility === 'string' ? JSON.parse(row.eligibility) : []),
    skills: Array.isArray(row.skills) ? row.skills : (typeof row.skills === 'string' ? JSON.parse(row.skills) : []),
    careerRoles: Array.isArray(row.career_roles) ? row.career_roles : (typeof row.career_roles === 'string' ? JSON.parse(row.career_roles) : []),
    prize: typeof row.prize === 'string' ? JSON.parse(row.prize) : (row.prize || {}),
    registrationUrl: row.registrationUrl ?? null,
    registrationAvailable: row.registrationAvailable ?? true,
    source: typeof row.source === 'string' ? { platform: row.source } : (row.source || { platform: 'Unknown' }),
    sources: Array.isArray(row.sources) ? row.sources : (typeof row.sources === 'string' ? JSON.parse(row.sources) : []),
    status: updatedStatus,
    createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : (row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString()),
    updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : (row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString())
  };
}

export async function getEvents(filters: EventFilterQuery = {}): Promise<EventDocument[]> {
  if (!isPostgresConfigured()) return [];

  try {
    const conditions: string[] = ["status != 'CANCELLED'"];
    const params: any[] = [];
    let pIdx = 1;

    if (filters.category) {
      conditions.push(`type = $${pIdx++}`);
      params.push(filters.category);
    }

    if (filters.mode) {
      conditions.push(`location->>'mode' = $${pIdx++}`);
      params.push(filters.mode);
    }

    if (filters.state) {
      conditions.push(`location->>'state' ILIKE $${pIdx++}`);
      params.push(filters.state);
    }

    if (filters.city) {
      conditions.push(`location->>'city' ILIKE $${pIdx++}`);
      params.push(filters.city);
    }

    if (filters.status) {
      conditions.push(`status = $${pIdx++}`);
      params.push(filters.status);
    }

    if (filters.role) {
      conditions.push(`career_roles::text ILIKE $${pIdx++}`);
      params.push(`%${filters.role}%`);
    }

    if (filters.skill) {
      conditions.push(`skills::text ILIKE $${pIdx++}`);
      params.push(`%${filters.skill}%`);
    }

    if (filters.search) {
      const searchPattern = `%${filters.search}%`;
      conditions.push(`(
        title ILIKE $${pIdx} OR
        description ILIKE $${pIdx} OR
        organizer->>'name' ILIKE $${pIdx} OR
        skills::text ILIKE $${pIdx} OR
        career_roles::text ILIKE $${pIdx}
      )`);
      params.push(searchPattern);
      pIdx++;
    }

    const limit = filters.limit || 100;
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT * FROM events
      ${whereClause}
      ORDER BY (dates->>'registrationDeadline') ASC NULLS LAST, created_at DESC
      LIMIT $${pIdx};
    `;
    params.push(limit);

    const res = await query(sql, params);
    return res.rows.map(mapRowToEventDocument);
  } catch (error) {
    console.error('Error fetching events from PostgreSQL:', error);
    return [];
  }
}

export async function getEventBySlug(slug: string): Promise<EventDocument | null> {
  if (!isPostgresConfigured()) return null;

  try {
    const res = await query(`SELECT * FROM events WHERE slug = $1 LIMIT 1;`, [slug]);
    if (res.rows.length === 0) return null;

    return mapRowToEventDocument(res.rows[0]);
  } catch (error) {
    console.error(`Error fetching event ${slug}:`, error);
    return null;
  }
}

export async function getEventsForCareerRole(roleTitle: string, roleCategory?: string): Promise<EventDocument[]> {
  if (!isPostgresConfigured()) return [];

  try {
    const res = await query(`
      SELECT * FROM events
      WHERE status IN ('OPEN', 'CLOSING_SOON', 'UPCOMING', 'ONGOING')
        AND career_roles::text ILIKE $1
      ORDER BY (dates->>'registrationDeadline') ASC NULLS LAST
      LIMIT 10;
    `, [`%${roleTitle}%`]);

    return res.rows.map(mapRowToEventDocument);
  } catch (error) {
    console.error(`Error fetching events for role ${roleTitle}:`, error);
    return [];
  }
}

export async function upsertEvent(eventData: Partial<EventDocument>): Promise<EventDocument> {
  const normalized = await processAndNormalizeEvent(eventData);

  const eventId = (normalized as any)._id || (normalized as any).id || `evt_${normalized.slug}`;

  const sql = `
    INSERT INTO events (
      id, slug, title, description, type, organizer, location, dates,
      eligibility, skills, career_roles, prize, "registrationUrl", "registrationAvailable",
      source, sources, status, "lastSyncedAt", "createdAt", "updatedAt"
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW(), NOW()
    )
    ON CONFLICT (slug) DO UPDATE SET
      title = EXCLUDED.title,
      description = EXCLUDED.description,
      type = EXCLUDED.type,
      organizer = EXCLUDED.organizer,
      location = EXCLUDED.location,
      dates = EXCLUDED.dates,
      eligibility = EXCLUDED.eligibility,
      skills = EXCLUDED.skills,
      career_roles = EXCLUDED.career_roles,
      prize = EXCLUDED.prize,
      "registrationUrl" = EXCLUDED."registrationUrl",
      "registrationAvailable" = EXCLUDED."registrationAvailable",
      source = EXCLUDED.source,
      sources = EXCLUDED.sources,
      status = EXCLUDED.status,
      "lastSyncedAt" = EXCLUDED."lastSyncedAt",
      "updatedAt" = NOW()
    RETURNING *;
  `;

  const values = [
    eventId,
    normalized.slug,
    normalized.title,
    normalized.description || '',
    normalized.type || 'HACKATHON',
    JSON.stringify(normalized.organizer || {}),
    JSON.stringify(normalized.location || { country: 'India', mode: 'ONLINE' }),
    JSON.stringify(normalized.dates || {}),
    JSON.stringify(normalized.eligibility || []),
    JSON.stringify(normalized.skills || []),
    JSON.stringify(normalized.careerRoles || []),
    JSON.stringify(normalized.prize || {}),
    normalized.registrationUrl || null,
    normalized.registrationAvailable ?? true,
    JSON.stringify(normalized.source || {}),
    JSON.stringify(normalized.sources || []),
    normalized.status || 'UPCOMING',
    normalized.lastSyncedAt || null
  ];

  const res = await query(sql, values);
  return mapRowToEventDocument(res.rows[0]);
}

export async function submitOrganizerEvent(rawEvent: Partial<EventDocument>): Promise<EventDocument> {
  const normalized = await processAndNormalizeEvent({
    ...rawEvent,
    status: 'PENDING_REVIEW'
  });

  const eventId = (normalized as any)._id || (normalized as any).id || `evt_${normalized.slug}`;

  const sql = `
    INSERT INTO events (
      id, slug, title, description, type, organizer, location, dates,
      eligibility, skills, career_roles, prize, "registrationUrl", "registrationAvailable",
      source, sources, status, "createdAt", "updatedAt"
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'PENDING_REVIEW', NOW(), NOW()
    )
    ON CONFLICT (slug) DO UPDATE SET
      title = EXCLUDED.title,
      description = EXCLUDED.description,
      "updatedAt" = NOW()
    RETURNING *;
  `;

  const values = [
    eventId,
    normalized.slug,
    normalized.title,
    normalized.description || '',
    normalized.type || 'HACKATHON',
    JSON.stringify(normalized.organizer || {}),
    JSON.stringify(normalized.location || { country: 'India', mode: 'ONLINE' }),
    JSON.stringify(normalized.dates || {}),
    JSON.stringify(normalized.eligibility || []),
    JSON.stringify(normalized.skills || []),
    JSON.stringify(normalized.careerRoles || []),
    JSON.stringify(normalized.prize || {}),
    normalized.registrationUrl || null,
    normalized.registrationAvailable ?? true,
    JSON.stringify(normalized.source || {}),
    JSON.stringify(normalized.sources || [])
  ];

  const res = await query(sql, values);
  return mapRowToEventDocument(res.rows[0]);
}

export async function approveEvent(eventId: string): Promise<boolean> {
  if (!isPostgresConfigured()) return false;
  try {
    const id = parseInt(eventId, 10);
    const res = isNaN(id)
      ? await query(`UPDATE events SET status = 'OPEN', updated_at = NOW() WHERE slug = $1;`, [eventId])
      : await query(`UPDATE events SET status = 'OPEN', updated_at = NOW() WHERE id = $1;`, [id]);

    return (res.rowCount ?? 0) > 0;
  } catch (e) {
    return false;
  }
}
