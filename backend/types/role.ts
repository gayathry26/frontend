export type Tag = 'Coding' | 'Non-Coding' | 'Creative' | 'Emerging' | 'Management' | 'Hybrid';

export interface Skill {
  name: string;
  type: 'technical' | 'soft';
}

export interface CareerLevel {
  title: string;
  yearsOfExperience: string;
  salaryRange: string;
}

export interface CompanyCategory {
  category: string;
  companies: string[];
}

export interface RoleStats {
  averageSalary: string;
  jobOpenings: string;
  growthRate: string;
}

export interface RoleProjectLevels {
  beginner: string[];
  intermediate: string[];
  advanced: string[];
}

export interface CertificationItem {
  name: string;
  type: 'FREE' | 'PAID';
}

export interface LearningResourceItem {
  title: string;
  type: 'Documentation' | 'Free Course' | 'Paid Course' | 'YouTube' | 'Book' | 'Practice Platform';
  url: string;
  freeOrPaid: 'FREE' | 'PAID';
}

export interface RoadmapLevel {
  stage: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'JOB READY';
  title: string;
  skills: string[];
  description?: string;
}

export interface AssessmentQuestionItem {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
  category: 'technical' | 'soft' | 'tools';
}

export interface InterviewQuestionItem {
  question: string;
  answer: string;
  category: 'Technical' | 'Coding' | 'Scenario' | 'HR';
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
}

export interface PracticePlatformItem {
  name: string;
  url: string;
  description: string;
}

export interface ITRole {
  id: string;
  title: string;
  category: string;
  tags: Tag[];
  shortDescription: string;
  alternateNames: string[];
  technicalSkills: string[];
  softSkills: string[];
  careerLadder: CareerLevel[];
  scope: string;
  jobMarketProjection: string;
  industry: string[];
  hiringCompanies?: CompanyCategory[];
  stats?: RoleStats;

  // New MongoDB-backed sections
  projects?: RoleProjectLevels;
  certifications?: CertificationItem[];
  tools?: string[];
  learningResources?: LearningResourceItem[];
  roadmap?: RoadmapLevel[];
  assessmentQuestions?: AssessmentQuestionItem[];
  interviewQuestions?: InterviewQuestionItem[];
  practicePlatforms?: PracticePlatformItem[];

  // Metadata & extended fields for MongoDB Atlas
  codingLevel?: string;
  workMode?: string;
  responsibilities?: string[];
  education?: string[];
  dayToDayWork?: string;
  locations?: string[];
  relatedRoles?: string[];
  verified?: boolean;
  version?: number;
  status?: 'approved' | 'pending' | 'rejected' | 'archived';
  createdAt?: string;
  updatedAt?: string;
}

export interface RoleDocument extends ITRole {
  _id?: string;
}

export interface ContributorInfo {
  name: string;
  email: string;
  roleTitle?: string;
  company?: string;
  linkedin?: string;
}

export interface ContributionDocument {
  _id?: string;
  roleId: string;
  contributor: ContributorInfo;
  submittedData: Partial<ITRole>;
  source?: string;
  status: 'pending' | 'approved' | 'rejected';
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export interface RoleVersionDocument {
  _id?: string;
  roleId: string;
  version: number;
  previousData: Partial<ITRole>;
  newData: Partial<ITRole>;
  submittedBy?: ContributorInfo;
  approvedBy?: string;
  createdAt: string;
}
