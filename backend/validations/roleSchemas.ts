import { z } from 'zod';

export const TagEnum = z.enum([
  'Coding',
  'Non-Coding',
  'Creative',
  'Emerging',
  'Management',
  'Hybrid'
]);

export const CareerLevelSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  yearsOfExperience: z.string().min(1, 'Years of experience is required'),
  salaryRange: z.string().min(1, 'Salary range is required')
});

export const CompanyCategorySchema = z.object({
  category: z.string(),
  companies: z.array(z.string())
});

export const RoleStatsSchema = z.object({
  averageSalary: z.string(),
  jobOpenings: z.string(),
  growthRate: z.string()
});

export const CertificationItemSchema = z.object({
  name: z.string(),
  type: z.enum(['FREE', 'PAID'])
});

export const RoleProjectLevelsSchema = z.object({
  beginner: z.array(z.string()).default([]),
  intermediate: z.array(z.string()).default([]),
  advanced: z.array(z.string()).default([])
});

export const ITRoleSchema = z.object({
  id: z.string().min(1, 'ID/slug is required'),
  title: z.string().min(1, 'Title is required'),
  category: z.string().min(1, 'Category is required'),
  tags: z.array(TagEnum).min(1, 'At least one tag is required'),
  shortDescription: z.string().min(1, 'Short description is required'),
  alternateNames: z.array(z.string()).default([]),
  technicalSkills: z.array(z.string()).default([]),
  softSkills: z.array(z.string()).default([]),
  careerLadder: z.array(CareerLevelSchema).default([]),
  scope: z.string().default(''),
  jobMarketProjection: z.string().default(''),
  industry: z.array(z.string()).default([]),
  hiringCompanies: z.array(CompanyCategorySchema).optional(),
  stats: RoleStatsSchema.optional(),

  // New sections
  projects: RoleProjectLevelsSchema.optional(),
  certifications: z.any().optional(),

  // Extended metadata
  codingLevel: z.string().optional(),
  workMode: z.string().optional(),
  responsibilities: z.array(z.string()).optional(),
  tools: z.array(z.string()).optional(),
  education: z.array(z.string()).optional(),
  dayToDayWork: z.string().optional(),
  locations: z.array(z.string()).optional(),
  relatedRoles: z.array(z.string()).optional()
});

export const ContributorInfoSchema = z.object({
  name: z.string().min(1, 'Contributor name is required'),
  email: z.string().email('Valid email is required'),
  roleTitle: z.string().optional(),
  company: z.string().optional(),
  linkedin: z.string().optional()
});

export const RoleContributionSubmissionSchema = z.object({
  roleId: z.string().min(1, 'Role ID/slug is required'),
  contributor: ContributorInfoSchema,
  submittedData: ITRoleSchema.partial(),
  source: z.string().optional()
});

export const AdminReviewSchema = z.object({
  contributionId: z.string().min(1, 'Contribution ID is required'),
  adminNotes: z.string().optional(),
  approvedBy: z.string().optional()
});
