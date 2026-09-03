import { z } from 'zod';

export const EventCategoryEnum = z.enum([
  'HACKATHON',
  'CODING_CONTEST',
  'WORKSHOP',
  'TECH_FEST',
  'CONFERENCE',
  'WEBINAR',
  'CTF',
  'IDEATHON',
  'PROJECT_COMPETITION',
  'OPEN_SOURCE',
  'CAREER_FAIR'
]);

export const EventModeEnum = z.enum(['ONLINE', 'OFFLINE', 'HYBRID']);

export const LocationStructureSchema = z.object({
  country: z.string().default('India'),
  state: z.string().nullable().optional().transform(v => v ?? null),
  city: z.string().nullable().optional().transform(v => v ?? null),
  mode: EventModeEnum
});

export const OrganizerInfoSchema = z.object({
  name: z.string().min(1, 'Organizer name is required'),
  website: z.string().optional(),
  contactEmail: z.string().optional(),
  logoUrl: z.string().optional()
});

export const DateInfoSchema = z.object({
  registrationDeadline: z.string().min(1, 'Registration deadline is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required')
});

export const PrizeInfoSchema = z.object({
  amount: z.number().optional(),
  currency: z.string().default('INR'),
  description: z.string().optional()
});

export const EventSubmissionSchema = z.object({
  title: z.string().min(3, 'Event title is required'),
  description: z.string().min(10, 'Description is required'),
  type: EventCategoryEnum,
  organizer: OrganizerInfoSchema,
  location: LocationStructureSchema,
  dates: DateInfoSchema,
  eligibility: z.array(z.string()).default(['College Students']),
  skills: z.array(z.string()).min(1, 'At least one skill is required'),
  prize: PrizeInfoSchema.optional(),
  registrationUrl: z.string().url('Must be a valid URL').optional().nullable()
});
