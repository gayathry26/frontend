/**
 * Event Role Matcher
 *
 * Computes career role matches for normalized events by comparing event skills
 * against MongoDB Atlas `roles` collection technical skill lists.
 * Updates events in-place with populated `careerRoles` and `careerRoleMatches` arrays.
 */

import { EventDocument, CareerRoleMatch } from '../../types/event';
import { EventWithSources } from './eventDeduplicator';

interface RoleRecord {
  id: string;
  title: string;
  category: string;
  technicalSkills?: string[];
}

// ---------------------------------------------------------------------------
// Category-Type Bonus Matching
// ---------------------------------------------------------------------------

const CATEGORY_ROLE_BONUS: Record<string, string[]> = {
  'HACKATHON':           ['Software Engineer', 'Full Stack Developer', 'Mobile Developer'],
  'CTF':                 ['Cybersecurity Analyst', 'Penetration Tester', 'Security Engineer'],
  'CODING_CONTEST':      ['Software Engineer', 'Data Structures Engineer', 'Competitive Programmer'],
  'WORKSHOP':            ['Data Scientist', 'Machine Learning Engineer', 'Cloud Engineer'],
  'WEBINAR':             ['Cloud Architect', 'DevOps Engineer', 'Software Engineer'],
  'OPEN_SOURCE':         ['Full Stack Developer', 'Backend Developer', 'Frontend Developer'],
  'IDEATHON':            ['Product Manager', 'UX Designer', 'Entrepreneur'],
  'CAREER_FAIR':         ['Software Engineer', 'Data Analyst', 'Business Analyst'],
  'PROJECT_COMPETITION': ['Software Engineer', 'Data Scientist', 'Full Stack Developer'],
  'TECH_FEST':           ['Software Engineer', 'Full Stack Developer', 'Robotics Engineer'],
  'CONFERENCE':          ['Software Architect', 'CTO', 'Technical Lead']
};

const CATEGORY_BONUS_VALUE = 0.2;
const MIN_SCORE_THRESHOLD = 0.4;

// ---------------------------------------------------------------------------
// Skill Matching Engine
// ---------------------------------------------------------------------------

function computeSkillOverlap(eventSkills: string[], roleSkills: string[]): number {
  if (eventSkills.length === 0 || roleSkills.length === 0) return 0;

  const normalizedEvent = eventSkills.map(s => s.toLowerCase().trim());
  const normalizedRole = roleSkills.map(s => s.toLowerCase().trim());

  let overlap = 0;
  for (const es of normalizedEvent) {
    for (const rs of normalizedRole) {
      if (es === rs || es.includes(rs) || rs.includes(es)) {
        overlap++;
        break; // Count each event skill once
      }
    }
  }

  // Jaccard-based score — normalize against a cap of 5 skills
  const denominator = Math.min(normalizedEvent.length, 5);
  return overlap / denominator;
}

// ---------------------------------------------------------------------------
// Main Role Matcher
// ---------------------------------------------------------------------------

export function matchRolesToEvent(
  event: EventDocument | EventWithSources,
  allRoles: RoleRecord[]
): { careerRoles: string[]; careerRoleMatches: CareerRoleMatch[] } {
  const eventSkills = event.skills || [];
  const eventType = event.type || 'HACKATHON';

  const scoredRoles: CareerRoleMatch[] = [];

  for (const role of allRoles) {
    const roleSkills = role.technicalSkills || [];
    const skillScore = computeSkillOverlap(eventSkills, roleSkills);

    // Category bonus — roles that typically match this event type
    let bonus = 0;
    const bonusRoles = CATEGORY_ROLE_BONUS[eventType] || [];
    if (bonusRoles.some(br => role.title.toLowerCase().includes(br.toLowerCase()))) {
      bonus = CATEGORY_BONUS_VALUE;
    }

    const finalScore = Math.min(1.0, Math.round((skillScore + bonus) * 100) / 100);

    if (finalScore >= MIN_SCORE_THRESHOLD) {
      scoredRoles.push({
        roleId: role.id,
        roleTitle: role.title,
        score: finalScore
      });
    }
  }

  // Sort by score descending, take top 5
  scoredRoles.sort((a, b) => b.score - a.score);
  const topMatches = scoredRoles.slice(0, 5);

  // If no matches, use category fallback
  const fallback = (CATEGORY_ROLE_BONUS[eventType] || ['Software Engineer', 'Full Stack Developer']).slice(0, 2);
  const careerRoles = topMatches.length > 0
    ? topMatches.map(m => m.roleTitle)
    : fallback;

  return {
    careerRoles,
    careerRoleMatches: topMatches
  };
}

// ---------------------------------------------------------------------------
// Bulk Matcher — Updates array of events in-place
// ---------------------------------------------------------------------------

export function matchRolesForAllEvents(
  events: (EventDocument | EventWithSources)[],
  allRoles: RoleRecord[]
): void {
  let matched = 0;
  for (const event of events) {
    const { careerRoles, careerRoleMatches } = matchRolesToEvent(event, allRoles);
    event.careerRoles = careerRoles;
    event.careerRoleMatches = careerRoleMatches;
    if (careerRoleMatches.length > 0) matched++;
  }
  console.log(`[RoleMatcher] Matched ${matched}/${events.length} events to career roles.`);
}
