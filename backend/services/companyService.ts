import { getDb } from '../config/mongodb';

export interface CompanyItem {
  id: string;
  name: string;
  type: string; // "Product Company", "Startup", "Service-Based", "FinTech", "HealthTech", "EdTech", "AI / ML Companies", "Cybersecurity", "Cloud / DevOps", "SaaS", "E-Commerce", "Other"
  industries: string[];
  domains: string[];
  technologies: string[];
  locations: string[];
  website?: string;
  description?: string;
  relatedRoles: string[];
}

export const INITIAL_COMPANIES: CompanyItem[] = [
  {
    id: 'microsoft',
    name: 'Microsoft',
    type: 'PRODUCT COMPANIES',
    industries: ['Cloud', 'Software', 'AI'],
    domains: ['Software Development', 'AI & Machine Learning', 'Cloud & DevOps'],
    technologies: ['Azure', 'C#', '.NET', 'TypeScript', 'Python'],
    locations: ['Hyderabad', 'Bangalore', 'Noida'],
    website: 'https://microsoft.com',
    description: 'Empowering every person and organization on the planet to achieve more through cloud computing and software solutions.',
    relatedRoles: ['software-engineer', 'frontend-developer', 'backend-developer', 'cloud-architect', 'ai-engineer', 'product-manager']
  },
  {
    id: 'google',
    name: 'Google',
    type: 'PRODUCT COMPANIES',
    industries: ['Search', 'Cloud', 'AI', 'SaaS'],
    domains: ['Software Development', 'AI & Machine Learning', 'Cloud & DevOps'],
    technologies: ['GCP', 'Go', 'Python', 'TensorFlow', 'Kubernetes'],
    locations: ['Bangalore', 'Hyderabad', 'Gurgaon'],
    website: 'https://google.com',
    description: 'Organizing the world’s information and making it universally accessible and useful.',
    relatedRoles: ['software-engineer', 'ai-research-scientist', 'data-scientist', 'cloud-architect', 'product-manager']
  },
  {
    id: 'razorpay',
    name: 'Razorpay',
    type: 'FINTECH',
    industries: ['FinTech', 'Payments', 'SaaS'],
    domains: ['Software Development', 'Cybersecurity', 'Data & Analytics'],
    technologies: ['Node.js', 'React', 'Go', 'AWS', 'MySQL'],
    locations: ['Bangalore'],
    website: 'https://razorpay.com',
    description: 'Leading financial technology platform powering online payments, banking, and credit for Indian businesses.',
    relatedRoles: ['software-engineer', 'frontend-developer', 'backend-developer', 'cyber-security-analyst', 'product-manager']
  },
  {
    id: 'postman',
    name: 'Postman',
    type: 'SAAS',
    industries: ['Developer Tools', 'SaaS', 'API'],
    domains: ['Software Development', 'UI/UX Design', 'Cloud & DevOps'],
    technologies: ['Node.js', 'React', 'TypeScript', 'Electron', 'AWS'],
    locations: ['Bangalore', 'Remote'],
    website: 'https://postman.com',
    description: 'The world’s leading API platform used by over 30 million developers to design, build, and test APIs.',
    relatedRoles: ['frontend-developer', 'software-engineer', 'devops-engineer', 'ui-ux-designer', 'product-manager']
  },
  {
    id: 'zerodha',
    name: 'Zerodha',
    type: 'FINTECH',
    industries: ['FinTech', 'Stock Broking', 'Trading'],
    domains: ['Software Development', 'Data & Analytics', 'Cybersecurity'],
    technologies: ['Python', 'Go', 'PostgreSQL', 'Vue.js', 'Redis'],
    locations: ['Bangalore'],
    website: 'https://zerodha.com',
    description: 'India’s largest stockbroker offering zero-brokerage investments across stocks, mutual funds, and derivatives.',
    relatedRoles: ['backend-developer', 'software-engineer', 'data-analyst', 'cyber-security-analyst', 'ui-ux-designer']
  },
  {
    id: 'swiggy',
    name: 'Swiggy',
    type: 'STARTUPS',
    industries: ['E-Commerce', 'Logistics', 'Consumer Tech'],
    domains: ['Software Development', 'Data & Analytics', 'AI & Machine Learning'],
    technologies: ['Java', 'Go', 'React Native', 'AWS', 'Spark'],
    locations: ['Bangalore'],
    website: 'https://swiggy.com',
    description: 'India’s leading on-demand convenience platform connecting consumers to food delivery, grocery, and dining.',
    relatedRoles: ['software-engineer', 'frontend-developer', 'data-scientist', 'mobile-app-developer', 'product-manager']
  },
  {
    id: 'crowdstrike',
    name: 'CrowdStrike',
    type: 'CYBERSECURITY',
    industries: ['Cybersecurity', 'Cloud Security', 'Endpoint Protection'],
    domains: ['Cybersecurity', 'Cloud & DevOps', 'Software Development'],
    technologies: ['Go', 'C++', 'Python', 'AWS', 'Kafka'],
    locations: ['Pune', 'Bangalore'],
    website: 'https://crowdstrike.com',
    description: 'Global cybersecurity leader delivering cloud-native endpoint and workload protection against modern threats.',
    relatedRoles: ['cyber-security-analyst', 'penetration-tester', 'devops-engineer', 'backend-developer']
  },
  {
    id: 'tcs',
    name: 'TCS (Tata Consultancy Services)',
    type: 'SERVICE-BASED COMPANIES',
    industries: ['IT Services', 'Consulting', 'Enterprise Software'],
    domains: ['Software Development', 'Cloud & DevOps', 'Cybersecurity', 'Data & Analytics'],
    technologies: ['Java', 'Python', 'Azure', 'Salesforce', 'SQL'],
    locations: ['Mumbai', 'Bangalore', 'Chennai', 'Hyderabad', 'Pune'],
    website: 'https://tcs.com',
    description: 'Global leader in IT services, consulting, and business solutions partnering with top global enterprises.',
    relatedRoles: ['software-engineer', 'cloud-architect', 'data-analyst', 'database-administrator', 'network-engineer']
  },
  {
    id: 'zomato',
    name: 'Zomato',
    type: 'E-COMMERCE',
    industries: ['E-Commerce', 'Food Tech', 'Consumer Tech'],
    domains: ['Software Development', 'UI/UX Design', 'Data & Analytics'],
    technologies: ['React', 'Node.js', 'Python', 'AWS', 'Redis'],
    locations: ['Gurgaon', 'Bangalore'],
    website: 'https://zomato.com',
    description: 'Technology platform connecting customers, restaurant partners, and delivery partners across India.',
    relatedRoles: ['frontend-developer', 'software-engineer', 'ui-ux-designer', 'data-analyst', 'product-manager']
  },
  {
    id: 'freshworks',
    name: 'Freshworks',
    type: 'SAAS',
    industries: ['SaaS', 'Customer Experience', 'ITSM'],
    domains: ['Software Development', 'Cloud & DevOps', 'UI/UX Design'],
    technologies: ['Ruby on Rails', 'React', 'AWS', 'MySQL'],
    locations: ['Chennai', 'Bangalore'],
    website: 'https://freshworks.com',
    description: 'Leading provider of cloud-based business software for customer engagement, IT service management, and CRM.',
    relatedRoles: ['software-engineer', 'frontend-developer', 'devops-engineer', 'ui-ux-designer', 'product-manager']
  },
  {
    id: 'practo',
    name: 'Practo',
    type: 'HEALTHTECH',
    industries: ['HealthTech', 'Healthcare', 'Telemedicine'],
    domains: ['Software Development', 'Data & Analytics', 'Mobile Development'],
    technologies: ['Python', 'React Native', 'Node.js', 'MySQL'],
    locations: ['Bangalore'],
    website: 'https://practo.com',
    description: 'Leading healthcare platform enabling patients to find doctors, book appointments, and consult online.',
    relatedRoles: ['software-engineer', 'mobile-app-developer', 'data-analyst', 'backend-developer']
  },
  {
    id: 'unacademy',
    name: 'Unacademy',
    type: 'EDTECH',
    industries: ['EdTech', 'Online Learning', 'Education'],
    domains: ['Software Development', 'UI/UX Design', 'Cloud & DevOps'],
    technologies: ['React', 'Node.js', 'Python', 'AWS'],
    locations: ['Bangalore'],
    website: 'https://unacademy.com',
    description: 'India’s largest learning platform empowering millions of students through live classes and courses.',
    relatedRoles: ['frontend-developer', 'software-engineer', 'ui-ux-designer', 'devops-engineer']
  }
];

export async function getAllCompaniesFromDb(): Promise<CompanyItem[]> {
  try {
    const db = await getDb();
    const collection = db.collection<CompanyItem>('companies');
    const companies = await collection.find({}).toArray();

    if (companies.length === 0) {
      // Seed initial companies into MongoDB Atlas
      await collection.insertMany(INITIAL_COMPANIES as any);
      return INITIAL_COMPANIES;
    }

    return companies.map(c => {
      const { _id, ...rest } = c as any;
      return rest as CompanyItem;
    });
  } catch (err) {
    console.error('Error fetching companies from MongoDB Atlas:', err);
    return INITIAL_COMPANIES;
  }
}
