export interface SkillItem {
  id: string;
  name: string;
  category: 'FRONTEND' | 'BACKEND' | 'DATABASE' | 'PROGRAMMING' | 'DEVOPS & CLOUD' | 'DATA & AI' | 'OTHER';
  popular?: boolean;
}

export const SKILL_CATEGORIES = [
  'FRONTEND',
  'BACKEND',
  'DATABASE',
  'PROGRAMMING',
  'DEVOPS & CLOUD',
  'DATA & AI',
  'OTHER',
] as const;

export const SKILLS_CATALOG: SkillItem[] = [
  // FRONTEND
  { id: 'react', name: 'React', category: 'FRONTEND', popular: true },
  { id: 'angular', name: 'Angular', category: 'FRONTEND' },
  { id: 'vue', name: 'Vue.js', category: 'FRONTEND', popular: true },
  { id: 'nextjs', name: 'Next.js', category: 'FRONTEND', popular: true },
  { id: 'html', name: 'HTML', category: 'FRONTEND' },
  { id: 'css', name: 'CSS', category: 'FRONTEND' },
  { id: 'tailwind', name: 'Tailwind CSS', category: 'FRONTEND', popular: true },
  { id: 'redux', name: 'Redux', category: 'FRONTEND' },
  { id: 'typescript_fe', name: 'TypeScript (Frontend)', category: 'FRONTEND' },

  // BACKEND
  { id: 'nodejs', name: 'Node.js', category: 'BACKEND', popular: true },
  { id: 'express', name: 'Express.js', category: 'BACKEND', popular: true },
  { id: 'django', name: 'Django', category: 'BACKEND', popular: true },
  { id: 'flask', name: 'Flask', category: 'BACKEND' },
  { id: 'fastapi', name: 'FastAPI', category: 'BACKEND', popular: true },
  { id: 'springboot', name: 'Spring Boot', category: 'BACKEND', popular: true },
  { id: 'nest', name: 'NestJS', category: 'BACKEND' },
  { id: 'aspnet', name: 'ASP.NET Core', category: 'BACKEND' },

  // DATABASE
  { id: 'mongodb', name: 'MongoDB', category: 'DATABASE', popular: true },
  { id: 'mysql', name: 'MySQL', category: 'DATABASE', popular: true },
  { id: 'postgresql', name: 'PostgreSQL', category: 'DATABASE', popular: true },
  { id: 'redis', name: 'Redis', category: 'DATABASE', popular: true },
  { id: 'firebase', name: 'Firebase', category: 'DATABASE' },
  { id: 'dynamodb', name: 'DynamoDB', category: 'DATABASE' },
  { id: 'sqlite', name: 'SQLite', category: 'DATABASE' },

  // PROGRAMMING
  { id: 'python', name: 'Python', category: 'PROGRAMMING', popular: true },
  { id: 'java', name: 'Java', category: 'PROGRAMMING', popular: true },
  { id: 'cpp', name: 'C++', category: 'PROGRAMMING' },
  { id: 'javascript', name: 'JavaScript', category: 'PROGRAMMING', popular: true },
  { id: 'typescript', name: 'TypeScript', category: 'PROGRAMMING', popular: true },
  { id: 'csharp', name: 'C#', category: 'PROGRAMMING' },
  { id: 'go', name: 'Go (Golang)', category: 'PROGRAMMING' },
  { id: 'rust', name: 'Rust', category: 'PROGRAMMING' },

  // DEVOPS & CLOUD
  { id: 'docker', name: 'Docker', category: 'DEVOPS & CLOUD', popular: true },
  { id: 'kubernetes', name: 'Kubernetes', category: 'DEVOPS & CLOUD', popular: true },
  { id: 'aws', name: 'AWS', category: 'DEVOPS & CLOUD', popular: true },
  { id: 'azure', name: 'Azure', category: 'DEVOPS & CLOUD' },
  { id: 'gcp', name: 'Google Cloud (GCP)', category: 'DEVOPS & CLOUD' },
  { id: 'github_actions', name: 'GitHub Actions', category: 'DEVOPS & CLOUD', popular: true },
  { id: 'terraform', name: 'Terraform', category: 'DEVOPS & CLOUD' },
  { id: 'linux', name: 'Linux', category: 'DEVOPS & CLOUD', popular: true },

  // DATA & AI
  { id: 'pandas', name: 'Pandas', category: 'DATA & AI', popular: true },
  { id: 'numpy', name: 'NumPy', category: 'DATA & AI' },
  { id: 'scikitlearn', name: 'Scikit-learn', category: 'DATA & AI', popular: true },
  { id: 'tensorflow', name: 'TensorFlow', category: 'DATA & AI', popular: true },
  { id: 'pytorch', name: 'PyTorch', category: 'DATA & AI', popular: true },
  { id: 'powerbi', name: 'Power BI', category: 'DATA & AI', popular: true },
  { id: 'sql', name: 'SQL', category: 'DATA & AI', popular: true },
  { id: 'tableau', name: 'Tableau', category: 'DATA & AI' },

  // OTHER
  { id: 'git', name: 'Git', category: 'OTHER', popular: true },
  { id: 'rest_apis', name: 'REST APIs', category: 'OTHER', popular: true },
  { id: 'graphql', name: 'GraphQL', category: 'OTHER' },
  { id: 'problem_solving', name: 'Problem Solving', category: 'OTHER', popular: true },
  { id: 'testing', name: 'Automated Testing / Jest / Cypress', category: 'OTHER' },
  { id: 'figma', name: 'Figma / UI Design', category: 'OTHER' },
];
