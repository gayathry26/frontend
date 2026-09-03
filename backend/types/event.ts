export type EventCategory =
  | 'HACKATHON'
  | 'CODING_CONTEST'
  | 'WORKSHOP'
  | 'TECH_FEST'
  | 'CONFERENCE'
  | 'WEBINAR'
  | 'CTF'
  | 'IDEATHON'
  | 'PROJECT_COMPETITION'
  | 'OPEN_SOURCE'
  | 'CAREER_FAIR';

export type EventMode = 'ONLINE' | 'OFFLINE' | 'HYBRID';

export type EventStatus =
  | 'UPCOMING'
  | 'OPEN'
  | 'CLOSING_SOON'
  | 'ONGOING'
  | 'COMPLETED'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'PENDING_REVIEW';

export interface LocationStructure {
  country: string;
  state: string | null;
  city: string | null;
  mode: EventMode;
}

export interface CareerRoleMatch {
  roleId: string;
  roleTitle: string;
  score: number; // percentage match e.g. 0.85 (85%)
}

export interface OrganizerInfo {
  name: string;
  website?: string;
  contactEmail?: string;
  logoUrl?: string;
}

export interface DateInfo {
  registrationDeadline: string;
  startDate: string;
  endDate: string;
}

export interface PrizeInfo {
  amount?: number;
  currency?: string;
  description?: string;
}

export interface EventSourceRef {
  platform: string;
  sourceEventId?: string;
  sourceUrl?: string | null;
}

export interface EventDocument {
  _id?: string;
  title: string;
  slug: string;
  description: string;
  type: EventCategory;
  organizer: OrganizerInfo;
  location: LocationStructure;
  dates: DateInfo;
  eligibility: string[];
  skills: string[];
  careerRoles: string[];
  careerRoleMatches?: CareerRoleMatch[];
  prize?: PrizeInfo;
  registrationUrl?: string | null;
  registrationAvailable: boolean;
  /** Primary source (kept for backward compatibility) */
  source: {
    platform: string;
    sourceUrl?: string | null;
  };
  /** All contributing platform sources (for multi-source deduplication) */
  sources?: EventSourceRef[];
  status: EventStatus;
  lastSyncedAt?: string;
  createdAt: string;
  updatedAt: string;
}
