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
  registrationDeadline: string | null;
  startDate: string | null;
  endDate: string | null;
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
  description: string | null;
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
  source: {
    platform: string;
    sourceUrl?: string | null;
  };
  sources?: EventSourceRef[];
  status: EventStatus;
  lastSyncedAt?: string;
  createdAt: string;
  updatedAt: string;
}