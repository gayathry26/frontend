import { EventDocument, CareerRoleMatch, EventStatus } from '../types/event';
import { getAllRolesFromDb } from './roleService';
import { validateRegistrationUrl, isPlaceholderUrl } from '../utils/validateEventUrl';

export function calculateCareerRoleMatches(
  eventSkills: string[],
  eventType: string,
  allRoles: any[]
): { careerRoles: string[]; matches: CareerRoleMatch[] } {
  const normalizedEventSkills = eventSkills.map(s => s.toLowerCase());
  const matches: CareerRoleMatch[] = [];

  for (const role of allRoles) {
    const roleSkills = (role.technicalSkills || []).map((s: string) => s.toLowerCase());
    if (roleSkills.length === 0) continue;

    let overlapCount = 0;
    for (const skill of normalizedEventSkills) {
      if (roleSkills.some((rs: string) => rs.includes(skill) || skill.includes(rs))) {
        overlapCount++;
      }
    }

    let categoryBonus = 0;
    const catLower = (role.category || '').toLowerCase();
    if (eventType === 'HACKATHON' && catLower.includes('software')) categoryBonus = 0.15;
    else if (eventType === 'CTF' && catLower.includes('cybersecurity')) categoryBonus = 0.25;
    else if ((eventType === 'WORKSHOP' || eventType === 'CODING_CONTEST') && catLower.includes('data')) categoryBonus = 0.15;

    const baseScore = overlapCount > 0 ? (overlapCount / Math.min(normalizedEventSkills.length, 4)) * 0.7 : 0;
    const finalScore = Math.min(1.0, Math.max(0, baseScore + categoryBonus));

    if (finalScore >= 0.5) {
      matches.push({
        roleId: role.id,
        roleTitle: role.title,
        score: Math.round(finalScore * 100) / 100
      });
    }
  }

  matches.sort((a, b) => b.score - a.score);
  const matchedRoleTitles = matches.slice(0, 4).map(m => m.roleTitle);

  return {
    careerRoles: matchedRoleTitles.length > 0 ? matchedRoleTitles : ['Full Stack Developer', 'Software Engineer'],
    matches: matches.slice(0, 5)
  };
}

export function resolveEventStatus(registrationDeadline: string, currentStatus?: EventStatus): EventStatus {
  if (currentStatus === 'PENDING_REVIEW' || currentStatus === 'CANCELLED') {
    return currentStatus;
  }

  const deadline = new Date(registrationDeadline).getTime();
  const now = Date.now();

  if (isNaN(deadline)) return 'OPEN';

  if (now > deadline) {
    return 'EXPIRED';
  }

  const hoursLeft = (deadline - now) / (1000 * 60 * 60);
  if (hoursLeft <= 48 && hoursLeft > 0) {
    return 'CLOSING_SOON';
  }

  return 'OPEN';
}

export async function processAndNormalizeEvent(rawEvent: Partial<EventDocument>): Promise<EventDocument> {
  const allRoles = await getAllRolesFromDb();
  const now = new Date().toISOString();

  const title = rawEvent.title || 'Untitled Opportunity';
  const slug = rawEvent.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const skills = rawEvent.skills || ['Technology'];
  const eventType = rawEvent.type || 'HACKATHON';

  const { careerRoles, matches } = calculateCareerRoleMatches(skills, eventType, allRoles);
  const status = resolveEventStatus(rawEvent.dates?.registrationDeadline || now, rawEvent.status);

  // Validate Registration URL cleanly
  const { registrationUrl, registrationAvailable } = validateRegistrationUrl(rawEvent.registrationUrl);

  // Validate Source URL
  const rawSourceUrl = rawEvent.source?.sourceUrl;
  const cleanSourceUrl = (!rawSourceUrl || isPlaceholderUrl(rawSourceUrl)) ? null : rawSourceUrl.trim();

  return {
    title,
    slug,
    description: rawEvent.description || 'Live student opportunity in India.',
    type: eventType,
    organizer: rawEvent.organizer || { name: 'Indian Student Tech Community' },
    location: rawEvent.location || { country: 'India', state: 'Tamil Nadu', city: 'Coimbatore', mode: 'HYBRID' },
    dates: rawEvent.dates || {
      registrationDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      startDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString()
    },
    eligibility: rawEvent.eligibility || ['College Students', 'Developers'],
    skills,
    careerRoles,
    careerRoleMatches: matches,
    prize: rawEvent.prize,
    registrationUrl,
    registrationAvailable,
    source: {
      platform: rawEvent.source?.platform || 'Official Event Feed',
      sourceUrl: cleanSourceUrl
    },
    status: !registrationAvailable && status === 'OPEN' ? 'PENDING_REVIEW' : status,
    lastSyncedAt: now,
    createdAt: rawEvent.createdAt || now,
    updatedAt: now
  };
}
