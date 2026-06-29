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
  stats?: {
    averageSalary: string;
    jobOpenings: string;
    growthRate: string;
  };
}

export const categories = [
  'Software Development',
  'Data & Analytics',
  'Cybersecurity',
  'Cloud & DevOps',
  'AI & Machine Learning',
  'UI/UX Design',
  'Product & Project Management',
  'Network & Infrastructure',
  'Quality Assurance',
  'Emerging Technologies'
];

export const itRoles: ITRole[] = [
  // Software Development
  {
    id: 'full-stack-developer',
    title: 'Full Stack Developer (FSD)',
    category: 'Software Development',
    tags: ['Coding'],
    shortDescription: 'Develops both front-end and back-end of web applications',
    alternateNames: ['Full Stack Engineer', 'Web Developer', 'Software Engineer'],
    technicalSkills: ['JavaScript', 'React', 'Node.js', 'Python', 'SQL', 'Git', 'REST APIs', 'Docker'],
    softSkills: ['Problem Solving', 'Communication', 'Time Management', 'Adaptability', 'Teamwork'],
    careerLadder: [
      { title: 'Junior Full Stack Developer', yearsOfExperience: '0-2 years', salaryRange: '$50k - $70k' },
      { title: 'Full Stack Developer', yearsOfExperience: '2-5 years', salaryRange: '$70k - $100k' },
      { title: 'Senior Full Stack Developer', yearsOfExperience: '5-8 years', salaryRange: '$100k - $140k' },
      { title: 'Lead Full Stack Developer', yearsOfExperience: '8-12 years', salaryRange: '$140k - $180k' },
      { title: 'Principal Engineer', yearsOfExperience: '12+ years', salaryRange: '$180k - $250k+' }
    ],
    scope: 'Full stack developers work on both client and server-side development, creating complete web applications. They bridge the gap between design and technical implementation.',
    jobMarketProjection: 'Expected 25% growth in the next 5 years. High demand for full-stack developers as companies seek versatile engineers who can handle multiple aspects of development.',
    industry: ['Tech Startups', 'E-commerce', 'Fintech', 'Healthcare Tech', 'SaaS Companies'],
    hiringCompanies: [
      {
        category: 'Pure IT/Tech Companies',
        companies: ['Microsoft', 'Google', 'Meta', 'Netflix', 'Spotify', 'LinkedIn', 'Twitter']
      },
      {
        category: 'Tech-First Companies',
        companies: ['Stripe', 'Shopify', 'Amazon', 'PayPal', 'Square', 'Robinhood', 'Coinbase']
      },
      {
        category: 'Startups & Unicorns',
        companies: ['Databricks', 'Notion', 'Airtable', 'Figma', 'Canva']
      }
    ],
    stats: {
      averageSalary: '$95k',
      jobOpenings: '120k+',
      growthRate: '25%'
    }
  },
  {
    id: 'frontend-developer',
    title: 'Frontend Developer',
    category: 'Software Development',
    tags: ['Coding', 'Creative'],
    shortDescription: 'Creates user interfaces and client-side functionality for websites and apps',
    alternateNames: ['Frontend Engineer', 'UI Developer', 'Web UI Developer'],
    technicalSkills: ['HTML', 'CSS', 'JavaScript', 'React', 'Vue.js', 'TypeScript', 'Responsive Design', 'Webpack'],
    softSkills: ['Attention to Detail', 'Creativity', 'Collaboration', 'User Empathy', 'Communication'],
    careerLadder: [
      { title: 'Junior Frontend Developer', yearsOfExperience: '0-2 years', salaryRange: '$45k - $65k' },
      { title: 'Frontend Developer', yearsOfExperience: '2-5 years', salaryRange: '$65k - $95k' },
      { title: 'Senior Frontend Developer', yearsOfExperience: '5-8 years', salaryRange: '$95k - $130k' },
      { title: 'Lead Frontend Engineer', yearsOfExperience: '8-12 years', salaryRange: '$130k - $170k' },
      { title: 'Frontend Architect', yearsOfExperience: '12+ years', salaryRange: '$170k - $230k+' }
    ],
    scope: 'Frontend developers focus on creating engaging, responsive, and accessible user interfaces. They translate design mockups into functional code and optimize user experiences.',
    jobMarketProjection: 'Steady 20% growth expected over 5 years. Increasing demand for developers skilled in modern frameworks like React, Vue, and Angular.',
    industry: ['Web Agencies', 'E-commerce', 'Media & Entertainment', 'SaaS', 'Social Media Platforms'],
    hiringCompanies: [
      {
        category: 'Pure IT/Tech Companies',
        companies: ['Google', 'Meta', 'Netflix', 'Spotify', 'Adobe', 'Salesforce']
      },
      {
        category: 'Tech-First Companies',
        companies: ['Shopify', 'Amazon', 'eBay', 'Etsy', 'BigCommerce']
      },
      {
        category: 'Startups & Unicorns',
        companies: ['Canva', 'Notion', 'Figma', 'Airtable']
      }
    ],
    stats: {
      averageSalary: '$85k',
      jobOpenings: '95k+',
      growthRate: '20%'
    }
  },
  {
    id: 'backend-developer',
    title: 'Backend Developer',
    category: 'Software Development',
    tags: ['Coding'],
    shortDescription: 'Builds server-side logic, databases, and APIs for applications',
    alternateNames: ['Backend Engineer', 'Server-Side Developer', 'API Developer'],
    technicalSkills: ['Python', 'Java', 'Node.js', 'SQL', 'MongoDB', 'REST APIs', 'GraphQL', 'Microservices'],
    softSkills: ['Logical Thinking', 'Problem Solving', 'Attention to Detail', 'Collaboration', 'Documentation'],
    careerLadder: [
      { title: 'Junior Backend Developer', yearsOfExperience: '0-2 years', salaryRange: '$50k - $70k' },
      { title: 'Backend Developer', yearsOfExperience: '2-5 years', salaryRange: '$70k - $100k' },
      { title: 'Senior Backend Developer', yearsOfExperience: '5-8 years', salaryRange: '$100k - $135k' },
      { title: 'Lead Backend Engineer', yearsOfExperience: '8-12 years', salaryRange: '$135k - $175k' },
      { title: 'Backend Architect', yearsOfExperience: '12+ years', salaryRange: '$175k - $240k+' }
    ],
    scope: 'Backend developers create and maintain the server-side infrastructure that powers applications, including databases, APIs, and business logic.',
    jobMarketProjection: 'Strong 22% growth in next 5 years. Continuous demand for backend developers as applications become more complex and data-driven.',
    industry: ['Fintech', 'E-commerce', 'Healthcare', 'Cloud Services', 'Gaming'],
    hiringCompanies: [
      {
        category: 'Pure IT/Tech Companies',
        companies: ['Microsoft', 'Oracle', 'SAP', 'IBM', 'AWS', 'MongoDB']
      },
      {
        category: 'Tech-First Companies',
        companies: ['Stripe', 'PayPal', 'Plaid', 'Intuit', 'Bloomberg']
      },
      {
        category: 'Cloud & Infrastructure',
        companies: ['AWS', 'Microsoft Azure', 'Google Cloud', 'MongoDB', 'Redis Labs']
      }
    ],
    stats: {
      averageSalary: '$92k',
      jobOpenings: '110k+',
      growthRate: '22%'
    }
  },
  {
    id: 'mobile-developer',
    title: 'Mobile App Developer',
    category: 'Software Development',
    tags: ['Coding'],
    shortDescription: 'Develops applications for mobile devices (iOS/Android)',
    alternateNames: ['iOS Developer', 'Android Developer', 'Mobile Engineer'],
    technicalSkills: ['Swift', 'Kotlin', 'React Native', 'Flutter', 'Mobile UI/UX', 'API Integration', 'Firebase'],
    softSkills: ['Problem Solving', 'User Focus', 'Creativity', 'Patience', 'Collaboration'],
    careerLadder: [
      { title: 'Junior Mobile Developer', yearsOfExperience: '0-2 years', salaryRange: '$50k - $75k' },
      { title: 'Mobile Developer', yearsOfExperience: '2-5 years', salaryRange: '$75k - $105k' },
      { title: 'Senior Mobile Developer', yearsOfExperience: '5-8 years', salaryRange: '$105k - $140k' },
      { title: 'Lead Mobile Engineer', yearsOfExperience: '8-12 years', salaryRange: '$140k - $180k' },
      { title: 'Mobile Architect', yearsOfExperience: '12+ years', salaryRange: '$180k - $240k+' }
    ],
    scope: 'Mobile developers create native or cross-platform applications for smartphones and tablets, focusing on performance and user experience.',
    jobMarketProjection: 'Expected 30% growth over next 5 years. Mobile-first approach driving increased demand for mobile developers.',
    industry: ['Mobile Gaming', 'E-commerce', 'Social Media', 'Fintech', 'Health & Fitness'],
    hiringCompanies: [
      {
        category: 'Pure IT/Tech Companies',
        companies: ['Apple', 'Google', 'Meta', 'Uber', 'Lyft', 'Snap', 'TikTok']
      },
      {
        category: 'Gaming Tech',
        companies: ['Epic Games', 'Unity Technologies', 'Roblox', 'Riot Games']
      },
      {
        category: 'Tech-First Companies',
        companies: ['Uber', 'DoorDash', 'Instacart', 'Robinhood']
      }
    ],
    stats: {
      averageSalary: '$98k',
      jobOpenings: '85k+',
      growthRate: '30%'
    }
  },

  // Data & Analytics
  {
    id: 'data-scientist',
    title: 'Data Scientist',
    category: 'Data & Analytics',
    tags: ['Coding', 'Emerging'],
    shortDescription: 'Analyzes complex data to extract insights and build predictive models',
    alternateNames: ['Data Analyst', 'ML Engineer', 'Analytics Engineer'],
    technicalSkills: ['Python', 'R', 'SQL', 'Machine Learning', 'Statistics', 'Pandas', 'Scikit-learn', 'Tableau'],
    softSkills: ['Analytical Thinking', 'Communication', 'Business Acumen', 'Curiosity', 'Problem Solving'],
    careerLadder: [
      { title: 'Junior Data Scientist', yearsOfExperience: '0-2 years', salaryRange: '$60k - $85k' },
      { title: 'Data Scientist', yearsOfExperience: '2-5 years', salaryRange: '$85k - $120k' },
      { title: 'Senior Data Scientist', yearsOfExperience: '5-8 years', salaryRange: '$120k - $160k' },
      { title: 'Lead Data Scientist', yearsOfExperience: '8-12 years', salaryRange: '$160k - $200k' },
      { title: 'Principal Data Scientist', yearsOfExperience: '12+ years', salaryRange: '$200k - $280k+' }
    ],
    scope: 'Data scientists extract valuable insights from large datasets, build predictive models, and help organizations make data-driven decisions.',
    jobMarketProjection: 'Explosive 35% growth expected in next 5 years. Organizations increasingly relying on data science for competitive advantage.',
    industry: ['Tech', 'Finance', 'Healthcare', 'Retail', 'Consulting'],
    hiringCompanies: [
      {
        category: 'Pure IT/Tech Companies',
        companies: ['Google', 'Microsoft', 'Meta', 'Netflix', 'Apple', 'Amazon', 'IBM']
      },
      {
        category: 'Tech-First Companies',
        companies: ['Bloomberg', 'Stripe', 'PayPal', 'Robinhood', 'Intuit']
      },
      {
        category: 'AI/ML Specialized',
        companies: ['OpenAI', 'Anthropic', 'DeepMind', 'Hugging Face', 'DataRobot', 'Scale AI']
      },
      {
        category: 'Service-Based IT Companies',
        companies: ['Deloitte', 'Accenture', 'PwC', 'EY', 'KPMG']
      }
    ],
    stats: {
      averageSalary: '$115k',
      jobOpenings: '75k+',
      growthRate: '35%'
    }
  },
  {
    id: 'data-engineer',
    title: 'Data Engineer',
    category: 'Data & Analytics',
    tags: ['Coding'],
    shortDescription: 'Builds and maintains data pipelines and infrastructure',
    alternateNames: ['Big Data Engineer', 'ETL Developer', 'Data Platform Engineer'],
    technicalSkills: ['Python', 'SQL', 'Apache Spark', 'Airflow', 'AWS/Azure', 'ETL', 'Data Warehousing', 'Kafka'],
    softSkills: ['Problem Solving', 'Attention to Detail', 'Communication', 'Collaboration', 'Critical Thinking'],
    careerLadder: [
      { title: 'Junior Data Engineer', yearsOfExperience: '0-2 years', salaryRange: '$55k - $80k' },
      { title: 'Data Engineer', yearsOfExperience: '2-5 years', salaryRange: '$80k - $115k' },
      { title: 'Senior Data Engineer', yearsOfExperience: '5-8 years', salaryRange: '$115k - $150k' },
      { title: 'Lead Data Engineer', yearsOfExperience: '8-12 years', salaryRange: '$150k - $190k' },
      { title: 'Data Engineering Architect', yearsOfExperience: '12+ years', salaryRange: '$190k - $260k+' }
    ],
    scope: 'Data engineers design and build systems for collecting, storing, and analyzing data at scale. They create the infrastructure that enables data science and analytics.',
    jobMarketProjection: 'Strong 32% growth over 5 years. Critical role as data volumes continue to explode across industries.',
    industry: ['Tech Giants', 'Finance', 'E-commerce', 'Healthcare', 'Streaming Services'],
    hiringCompanies: [
      {
        category: 'Pure IT/Tech Companies',
        companies: ['Amazon', 'Netflix', 'Spotify', 'Google', 'Microsoft', 'Uber', 'Lyft']
      },
      {
        category: 'Cloud & Infrastructure',
        companies: ['AWS', 'Microsoft Azure', 'Google Cloud', 'Snowflake', 'Databricks']
      },
      {
        category: 'Startups & Unicorns',
        companies: ['Databricks', 'Snowflake', 'Airbnb']
      }
    ],
    stats: {
      averageSalary: '$110k',
      jobOpenings: '68k+',
      growthRate: '32%'
    }
  },
  {
    id: 'business-intelligence',
    title: 'Business Intelligence Analyst',
    category: 'Data & Analytics',
    tags: ['Hybrid', 'Non-Coding'],
    shortDescription: 'Transforms data into actionable business insights',
    alternateNames: ['BI Analyst', 'Data Analyst', 'Analytics Consultant'],
    technicalSkills: ['SQL', 'Tableau', 'Power BI', 'Excel', 'Data Visualization', 'ETL', 'Python (Basic)'],
    softSkills: ['Business Acumen', 'Communication', 'Critical Thinking', 'Presentation', 'Stakeholder Management'],
    careerLadder: [
      { title: 'Junior BI Analyst', yearsOfExperience: '0-2 years', salaryRange: '$45k - $65k' },
      { title: 'BI Analyst', yearsOfExperience: '2-5 years', salaryRange: '$65k - $90k' },
      { title: 'Senior BI Analyst', yearsOfExperience: '5-8 years', salaryRange: '$90k - $120k' },
      { title: 'BI Manager', yearsOfExperience: '8-12 years', salaryRange: '$120k - $150k' },
      { title: 'Director of Business Intelligence', yearsOfExperience: '12+ years', salaryRange: '$150k - $200k+' }
    ],
    scope: 'BI analysts create reports, dashboards, and visualizations that help businesses understand their performance and make informed decisions.',
    jobMarketProjection: 'Steady 18% growth in next 5 years. Every industry needs BI professionals to make sense of growing data volumes.',
    industry: ['Consulting', 'Finance', 'Retail', 'Healthcare', 'Manufacturing'],
    hiringCompanies: [
      {
        category: 'Service-Based IT Companies',
        companies: ['Accenture', 'Deloitte', 'Capgemini', 'Cognizant', 'TCS', 'Infosys']
      },
      {
        category: 'Traditional Companies with Tech Divisions',
        companies: ['JPMorgan Chase', 'Goldman Sachs', 'Walmart Labs', 'Target Tech']
      },
      {
        category: 'Pure IT/Tech Companies',
        companies: ['Microsoft', 'Oracle', 'SAP', 'Salesforce']
      }
    ],
    stats: {
      averageSalary: '$82k',
      jobOpenings: '55k+',
      growthRate: '18%'
    }
  },

  // Cybersecurity
  {
    id: 'cybersecurity-analyst',
    title: 'Cybersecurity Analyst',
    category: 'Cybersecurity',
    tags: ['Coding', 'Emerging'],
    shortDescription: 'Protects organizations from cyber threats and security breaches',
    alternateNames: ['Security Analyst', 'Information Security Analyst', 'SOC Analyst'],
    technicalSkills: ['Network Security', 'SIEM Tools', 'Penetration Testing', 'Python', 'Firewalls', 'Vulnerability Assessment', 'Incident Response'],
    softSkills: ['Analytical Thinking', 'Attention to Detail', 'Problem Solving', 'Communication', 'Stress Management'],
    careerLadder: [
      { title: 'Junior Security Analyst', yearsOfExperience: '0-2 years', salaryRange: '$50k - $70k' },
      { title: 'Cybersecurity Analyst', yearsOfExperience: '2-5 years', salaryRange: '$70k - $100k' },
      { title: 'Senior Security Analyst', yearsOfExperience: '5-8 years', salaryRange: '$100k - $135k' },
      { title: 'Security Architect', yearsOfExperience: '8-12 years', salaryRange: '$135k - $175k' },
      { title: 'Chief Information Security Officer', yearsOfExperience: '12+ years', salaryRange: '$175k - $300k+' }
    ],
    scope: 'Cybersecurity analysts monitor networks, detect threats, respond to incidents, and implement security measures to protect organizational assets.',
    jobMarketProjection: 'Explosive 35% growth expected over 5 years. Rising cyber threats making this one of the fastest-growing tech fields.',
    industry: ['Finance', 'Healthcare', 'Government', 'Tech', 'Defense'],
    hiringCompanies: [
      {
        category: 'Cybersecurity',
        companies: ['CrowdStrike', 'Palo Alto Networks', 'Cloudflare', 'Okta', 'Zscaler', 'Fortinet', 'Check Point']
      },
      {
        category: 'Traditional Companies with Tech Divisions',
        companies: ['JPMorgan Chase', 'Goldman Sachs', 'Morgan Stanley', 'Visa', 'Mastercard']
      },
      {
        category: 'Pure IT/Tech Companies',
        companies: ['Microsoft', 'Google', 'Amazon', 'Cisco']
      }
    ],
    stats: {
      averageSalary: '$95k',
      jobOpenings: '70k+',
      growthRate: '35%'
    }
  },
  {
    id: 'ethical-hacker',
    title: 'Ethical Hacker',
    category: 'Cybersecurity',
    tags: ['Coding', 'Emerging'],
    shortDescription: 'Tests systems for vulnerabilities to improve security',
    alternateNames: ['Penetration Tester', 'White Hat Hacker', 'Security Researcher'],
    technicalSkills: ['Penetration Testing', 'Kali Linux', 'Metasploit', 'Network Protocols', 'Python', 'Web Security', 'Cryptography'],
    softSkills: ['Critical Thinking', 'Creativity', 'Ethics', 'Communication', 'Continuous Learning'],
    careerLadder: [
      { title: 'Junior Penetration Tester', yearsOfExperience: '0-2 years', salaryRange: '$55k - $75k' },
      { title: 'Penetration Tester', yearsOfExperience: '2-5 years', salaryRange: '$75k - $110k' },
      { title: 'Senior Penetration Tester', yearsOfExperience: '5-8 years', salaryRange: '$110k - $145k' },
      { title: 'Lead Security Researcher', yearsOfExperience: '8-12 years', salaryRange: '$145k - $185k' },
      { title: 'Director of Security Research', yearsOfExperience: '12+ years', salaryRange: '$185k - $250k+' }
    ],
    scope: 'Ethical hackers identify security vulnerabilities before malicious actors can exploit them, helping organizations strengthen their defenses.',
    jobMarketProjection: 'Strong 28% growth in next 5 years. Companies increasingly investing in proactive security testing.',
    industry: ['Cybersecurity Firms', 'Finance', 'Tech', 'Government', 'Consulting'],
    hiringCompanies: [
      {
        category: 'Cybersecurity',
        companies: ['CrowdStrike', 'Palo Alto Networks', 'Fortinet', 'Check Point']
      },
      {
        category: 'Service-Based IT Companies',
        companies: ['Deloitte', 'Accenture', 'PwC', 'EY']
      },
      {
        category: 'Pure IT/Tech Companies',
        companies: ['Google', 'Meta', 'Apple', 'Microsoft']
      }
    ],
    stats: {
      averageSalary: '$105k',
      jobOpenings: '42k+',
      growthRate: '28%'
    }
  },

  // Cloud & DevOps
  {
    id: 'devops-engineer',
    title: 'DevOps Engineer',
    category: 'Cloud & DevOps',
    tags: ['Coding'],
    shortDescription: 'Automates and streamlines development and deployment processes',
    alternateNames: ['Site Reliability Engineer', 'Platform Engineer', 'Release Engineer'],
    technicalSkills: ['Docker', 'Kubernetes', 'CI/CD', 'AWS/Azure/GCP', 'Terraform', 'Jenkins', 'Python', 'Linux'],
    softSkills: ['Problem Solving', 'Collaboration', 'Communication', 'Adaptability', 'Time Management'],
    careerLadder: [
      { title: 'Junior DevOps Engineer', yearsOfExperience: '0-2 years', salaryRange: '$55k - $80k' },
      { title: 'DevOps Engineer', yearsOfExperience: '2-5 years', salaryRange: '$80k - $115k' },
      { title: 'Senior DevOps Engineer', yearsOfExperience: '5-8 years', salaryRange: '$115k - $150k' },
      { title: 'Lead DevOps Engineer', yearsOfExperience: '8-12 years', salaryRange: '$150k - $190k' },
      { title: 'DevOps Architect', yearsOfExperience: '12+ years', salaryRange: '$190k - $250k+' }
    ],
    scope: 'DevOps engineers bridge development and operations, automating deployment pipelines, ensuring system reliability, and improving development workflows.',
    jobMarketProjection: 'Robust 27% growth over next 5 years. Essential role as companies adopt cloud and continuous delivery practices.',
    industry: ['Tech', 'Fintech', 'E-commerce', 'SaaS', 'Startups'],
    hiringCompanies: [
      {
        category: 'Cloud & Infrastructure',
        companies: ['AWS', 'Microsoft Azure', 'Google Cloud', 'DigitalOcean', 'Vercel', 'Netlify', 'Cloudflare']
      },
      {
        category: 'Pure IT/Tech Companies',
        companies: ['Netflix', 'Uber', 'Lyft', 'Spotify', 'Meta']
      },
      {
        category: 'Developer Tools',
        companies: ['GitHub', 'GitLab', 'Docker', 'Atlassian', 'HashiCorp']
      }
    ],
    stats: {
      averageSalary: '$112k',
      jobOpenings: '88k+',
      growthRate: '27%'
    }
  },
  {
    id: 'cloud-architect',
    title: 'Cloud Architect',
    category: 'Cloud & DevOps',
    tags: ['Coding'],
    shortDescription: 'Designs and oversees cloud computing strategies',
    alternateNames: ['Cloud Solutions Architect', 'Cloud Engineer', 'Infrastructure Architect'],
    technicalSkills: ['AWS', 'Azure', 'GCP', 'Cloud Security', 'Microservices', 'Serverless', 'Networking', 'Infrastructure as Code'],
    softSkills: ['Strategic Thinking', 'Leadership', 'Communication', 'Problem Solving', 'Business Acumen'],
    careerLadder: [
      { title: 'Cloud Engineer', yearsOfExperience: '0-3 years', salaryRange: '$65k - $95k' },
      { title: 'Cloud Solutions Architect', yearsOfExperience: '3-6 years', salaryRange: '$95k - $135k' },
      { title: 'Senior Cloud Architect', yearsOfExperience: '6-10 years', salaryRange: '$135k - $175k' },
      { title: 'Principal Cloud Architect', yearsOfExperience: '10-15 years', salaryRange: '$175k - $220k' },
      { title: 'Chief Cloud Officer', yearsOfExperience: '15+ years', salaryRange: '$220k - $350k+' }
    ],
    scope: 'Cloud architects design and implement cloud infrastructure, ensuring scalability, security, and cost-effectiveness for organizational needs.',
    jobMarketProjection: 'Explosive 40% growth expected over 5 years. Cloud migration driving massive demand for cloud expertise.',
    industry: ['Tech', 'Finance', 'Healthcare', 'Enterprise', 'Consulting'],
    hiringCompanies: [
      {
        category: 'Cloud & Infrastructure',
        companies: ['AWS', 'Microsoft Azure', 'Google Cloud', 'Oracle Cloud']
      },
      {
        category: 'Service-Based IT Companies',
        companies: ['Accenture', 'Deloitte', 'Capgemini', 'Cognizant', 'TCS', 'Infosys', 'Wipro']
      },
      {
        category: 'Pure IT/Tech Companies',
        companies: ['Microsoft', 'Google', 'Amazon', 'IBM', 'Oracle']
      }
    ],
    stats: {
      averageSalary: '$135k',
      jobOpenings: '65k+',
      growthRate: '40%'
    }
  },

  // AI & Machine Learning
  {
    id: 'ml-engineer',
    title: 'Machine Learning Engineer',
    category: 'AI & Machine Learning',
    tags: ['Coding', 'Emerging'],
    shortDescription: 'Builds and deploys machine learning models and systems',
    alternateNames: ['ML Engineer', 'AI Engineer', 'Applied ML Scientist'],
    technicalSkills: ['Python', 'TensorFlow', 'PyTorch', 'Deep Learning', 'MLOps', 'Model Deployment', 'Statistics', 'Computer Vision'],
    softSkills: ['Problem Solving', 'Research Skills', 'Communication', 'Collaboration', 'Critical Thinking'],
    careerLadder: [
      { title: 'Junior ML Engineer', yearsOfExperience: '0-2 years', salaryRange: '$70k - $95k' },
      { title: 'ML Engineer', yearsOfExperience: '2-5 years', salaryRange: '$95k - $140k' },
      { title: 'Senior ML Engineer', yearsOfExperience: '5-8 years', salaryRange: '$140k - $185k' },
      { title: 'Lead ML Engineer', yearsOfExperience: '8-12 years', salaryRange: '$185k - $235k' },
      { title: 'ML Architect', yearsOfExperience: '12+ years', salaryRange: '$235k - $350k+' }
    ],
    scope: 'ML engineers develop, train, and deploy machine learning models at scale, bridging the gap between data science and production systems.',
    jobMarketProjection: 'Explosive 45% growth over next 5 years. AI revolution driving unprecedented demand for ML expertise.',
    industry: ['Tech Giants', 'Autonomous Vehicles', 'Healthcare', 'Finance', 'Robotics'],
    hiringCompanies: [
      {
        category: 'AI/ML Specialized',
        companies: ['OpenAI', 'Anthropic', 'DeepMind', 'Hugging Face', 'DataRobot', 'Scale AI']
      },
      {
        category: 'Pure IT/Tech Companies',
        companies: ['Google', 'Meta', 'Microsoft', 'Apple', 'Amazon', 'NVIDIA']
      },
      {
        category: 'Automotive Tech',
        companies: ['Tesla', 'Waymo', 'Cruise']
      }
    ],
    stats: {
      averageSalary: '$145k',
      jobOpenings: '52k+',
      growthRate: '45%'
    }
  },
  {
    id: 'ai-research-scientist',
    title: 'AI Research Scientist',
    category: 'AI & Machine Learning',
    tags: ['Coding', 'Emerging'],
    shortDescription: 'Conducts cutting-edge research in artificial intelligence',
    alternateNames: ['Research Scientist', 'ML Researcher', 'AI Scientist'],
    technicalSkills: ['Deep Learning', 'Python', 'Mathematics', 'Research Methodology', 'PyTorch', 'NLP', 'Computer Vision', 'Reinforcement Learning'],
    softSkills: ['Research Skills', 'Critical Thinking', 'Communication', 'Collaboration', 'Creativity'],
    careerLadder: [
      { title: 'Research Engineer', yearsOfExperience: '0-3 years', salaryRange: '$80k - $110k' },
      { title: 'Research Scientist', yearsOfExperience: '3-6 years', salaryRange: '$110k - $160k' },
      { title: 'Senior Research Scientist', yearsOfExperience: '6-10 years', salaryRange: '$160k - $220k' },
      { title: 'Principal Research Scientist', yearsOfExperience: '10-15 years', salaryRange: '$220k - $300k' },
      { title: 'Distinguished Research Scientist', yearsOfExperience: '15+ years', salaryRange: '$300k - $500k+' }
    ],
    scope: 'AI research scientists push the boundaries of artificial intelligence, publishing papers and developing novel algorithms and techniques.',
    jobMarketProjection: 'Strong 38% growth in next 5 years. Continuous investment in AI research by tech companies and research institutions.',
    industry: ['Tech Giants', 'Research Labs', 'Universities', 'AI Startups', 'Defense'],
    hiringCompanies: [
      {
        category: 'AI/ML Specialized',
        companies: ['OpenAI', 'Anthropic', 'DeepMind', 'Hugging Face']
      },
      {
        category: 'Pure IT/Tech Companies',
        companies: ['Google', 'Meta', 'Microsoft', 'Apple', 'IBM']
      },
      {
        category: 'Space Tech',
        companies: ['SpaceX', 'Blue Origin']
      }
    ],
    stats: {
      averageSalary: '$165k',
      jobOpenings: '28k+',
      growthRate: '38%'
    }
  },

  // UI/UX Design
  {
    id: 'ux-designer',
    title: 'UX Designer',
    category: 'UI/UX Design',
    tags: ['Creative', 'Non-Coding'],
    shortDescription: 'Designs user experiences and interfaces for digital products',
    alternateNames: ['User Experience Designer', 'Product Designer', 'Interaction Designer'],
    technicalSkills: ['Figma', 'Adobe XD', 'User Research', 'Wireframing', 'Prototyping', 'Usability Testing', 'Information Architecture'],
    softSkills: ['Empathy', 'Communication', 'Collaboration', 'Problem Solving', 'Creativity', 'Attention to Detail'],
    careerLadder: [
      { title: 'Junior UX Designer', yearsOfExperience: '0-2 years', salaryRange: '$45k - $65k' },
      { title: 'UX Designer', yearsOfExperience: '2-5 years', salaryRange: '$65k - $95k' },
      { title: 'Senior UX Designer', yearsOfExperience: '5-8 years', salaryRange: '$95k - $130k' },
      { title: 'Lead UX Designer', yearsOfExperience: '8-12 years', salaryRange: '$130k - $165k' },
      { title: 'Design Director', yearsOfExperience: '12+ years', salaryRange: '$165k - $220k+' }
    ],
    scope: 'UX designers focus on creating intuitive, user-friendly experiences through research, wireframing, prototyping, and testing.',
    jobMarketProjection: 'Solid 23% growth over next 5 years. Companies prioritizing user experience as competitive differentiator.',
    industry: ['Tech', 'E-commerce', 'SaaS', 'Finance', 'Healthcare'],
    hiringCompanies: [
      {
        category: 'Pure IT/Tech Companies',
        companies: ['Google', 'Meta', 'Apple', 'Microsoft', 'Adobe', 'Salesforce']
      },
      {
        category: 'Startups & Unicorns',
        companies: ['Figma', 'Canva', 'Notion', 'Airtable']
      },
      {
        category: 'Tech-First Companies',
        companies: ['Shopify', 'Airbnb', 'Uber']
      }
    ],
    stats: {
      averageSalary: '$92k',
      jobOpenings: '48k+',
      growthRate: '23%'
    }
  },
  {
    id: 'ui-designer',
    title: 'UI Designer',
    category: 'UI/UX Design',
    tags: ['Creative', 'Non-Coding'],
    shortDescription: 'Creates visual designs and interfaces for digital products',
    alternateNames: ['Visual Designer', 'Interface Designer', 'Digital Designer'],
    technicalSkills: ['Figma', 'Adobe Creative Suite', 'Design Systems', 'Typography', 'Color Theory', 'Responsive Design', 'Prototyping'],
    softSkills: ['Creativity', 'Attention to Detail', 'Communication', 'Collaboration', 'Time Management'],
    careerLadder: [
      { title: 'Junior UI Designer', yearsOfExperience: '0-2 years', salaryRange: '$42k - $62k' },
      { title: 'UI Designer', yearsOfExperience: '2-5 years', salaryRange: '$62k - $90k' },
      { title: 'Senior UI Designer', yearsOfExperience: '5-8 years', salaryRange: '$90k - $125k' },
      { title: 'Lead UI Designer', yearsOfExperience: '8-12 years', salaryRange: '$125k - $160k' },
      { title: 'Creative Director', yearsOfExperience: '12+ years', salaryRange: '$160k - $210k+' }
    ],
    scope: 'UI designers create visually appealing and consistent interfaces, working with design systems, typography, and color to enhance user experience.',
    jobMarketProjection: 'Steady 20% growth in next 5 years. Visual design remains crucial as digital products proliferate.',
    industry: ['Design Agencies', 'Tech', 'E-commerce', 'Gaming', 'Media'],
    hiringCompanies: [
      {
        category: 'Pure IT/Tech Companies',
        companies: ['Adobe', 'Apple', 'Google', 'Meta', 'Netflix']
      },
      {
        category: 'Gaming Tech',
        companies: ['Epic Games', 'Unity Technologies', 'Roblox', 'Electronic Arts', 'Riot Games']
      },
      {
        category: 'Startups & Unicorns',
        companies: ['Figma', 'Canva']
      }
    ],
    stats: {
      averageSalary: '$85k',
      jobOpenings: '42k+',
      growthRate: '20%'
    }
  },

  // Product & Project Management
  {
    id: 'product-manager',
    title: 'Product Manager',
    category: 'Product & Project Management',
    tags: ['Management', 'Non-Coding'],
    shortDescription: 'Defines product strategy and guides development teams',
    alternateNames: ['Technical Product Manager', 'Digital Product Manager', 'Product Owner'],
    technicalSkills: ['Product Strategy', 'Analytics', 'A/B Testing', 'SQL (Basic)', 'Roadmapping', 'User Stories', 'Market Research'],
    softSkills: ['Leadership', 'Communication', 'Strategic Thinking', 'Stakeholder Management', 'Decision Making', 'Negotiation'],
    careerLadder: [
      { title: 'Associate Product Manager', yearsOfExperience: '0-2 years', salaryRange: '$60k - $85k' },
      { title: 'Product Manager', yearsOfExperience: '2-5 years', salaryRange: '$85k - $125k' },
      { title: 'Senior Product Manager', yearsOfExperience: '5-8 years', salaryRange: '$125k - $165k' },
      { title: 'Director of Product', yearsOfExperience: '8-12 years', salaryRange: '$165k - $220k' },
      { title: 'VP of Product', yearsOfExperience: '12+ years', salaryRange: '$220k - $350k+' }
    ],
    scope: 'Product managers define product vision, prioritize features, and work with cross-functional teams to deliver successful products.',
    jobMarketProjection: 'Strong 28% growth over next 5 years. Product management becoming central to tech company success.',
    industry: ['Tech', 'SaaS', 'E-commerce', 'Fintech', 'Enterprise Software'],
    hiringCompanies: [
      {
        category: 'Pure IT/Tech Companies',
        companies: ['Google', 'Meta', 'Microsoft', 'Amazon', 'Apple', 'Netflix', 'Salesforce']
      },
      {
        category: 'Tech-First Companies',
        companies: ['Stripe', 'Shopify', 'Airbnb', 'Uber', 'DoorDash']
      },
      {
        category: 'Startups & Unicorns',
        companies: ['Notion', 'Airtable', 'Figma', 'Databricks']
      }
    ],
    stats: {
      averageSalary: '$125k',
      jobOpenings: '62k+',
      growthRate: '28%'
    }
  },
  {
    id: 'scrum-master',
    title: 'Scrum Master',
    category: 'Product & Project Management',
    tags: ['Management', 'Non-Coding'],
    shortDescription: 'Facilitates Agile processes and removes team blockers',
    alternateNames: ['Agile Coach', 'Agile Project Manager', 'Delivery Lead'],
    technicalSkills: ['Scrum Framework', 'Agile Methodologies', 'Jira', 'Confluence', 'Sprint Planning', 'Metrics & Reporting'],
    softSkills: ['Facilitation', 'Communication', 'Conflict Resolution', 'Coaching', 'Leadership', 'Problem Solving'],
    careerLadder: [
      { title: 'Junior Scrum Master', yearsOfExperience: '0-2 years', salaryRange: '$50k - $70k' },
      { title: 'Scrum Master', yearsOfExperience: '2-5 years', salaryRange: '$70k - $100k' },
      { title: 'Senior Scrum Master', yearsOfExperience: '5-8 years', salaryRange: '$100k - $130k' },
      { title: 'Agile Coach', yearsOfExperience: '8-12 years', salaryRange: '$130k - $165k' },
      { title: 'Director of Agile Practices', yearsOfExperience: '12+ years', salaryRange: '$165k - $210k+' }
    ],
    scope: 'Scrum masters ensure teams follow Agile methodologies effectively, facilitate ceremonies, and help teams continuously improve.',
    jobMarketProjection: 'Moderate 15% growth in next 5 years. Agile adoption maturing but still expanding in traditional industries.',
    industry: ['Tech', 'Finance', 'Healthcare', 'Consulting', 'Retail'],
    hiringCompanies: [
      {
        category: 'Service-Based IT Companies',
        companies: ['Accenture', 'Deloitte', 'Capgemini', 'Cognizant', 'TCS', 'Infosys']
      },
      {
        category: 'Traditional Companies with Tech Divisions',
        companies: ['JPMorgan Chase', 'Goldman Sachs', 'Walmart Labs', 'Target Tech']
      },
      {
        category: 'Developer Tools',
        companies: ['Atlassian', 'GitHub']
      }
    ],
    stats: {
      averageSalary: '$95k',
      jobOpenings: '38k+',
      growthRate: '15%'
    }
  },

  // Network & Infrastructure
  {
    id: 'network-engineer',
    title: 'Network Engineer',
    category: 'Network & Infrastructure',
    tags: ['Coding'],
    shortDescription: 'Designs and maintains network infrastructure',
    alternateNames: ['Network Administrator', 'Network Architect', 'Infrastructure Engineer'],
    technicalSkills: ['TCP/IP', 'Routing & Switching', 'Cisco', 'Network Security', 'VPN', 'Firewalls', 'Network Monitoring'],
    softSkills: ['Problem Solving', 'Attention to Detail', 'Communication', 'Time Management', 'Analytical Thinking'],
    careerLadder: [
      { title: 'Junior Network Engineer', yearsOfExperience: '0-2 years', salaryRange: '$45k - $65k' },
      { title: 'Network Engineer', yearsOfExperience: '2-5 years', salaryRange: '$65k - $95k' },
      { title: 'Senior Network Engineer', yearsOfExperience: '5-8 years', salaryRange: '$95k - $125k' },
      { title: 'Network Architect', yearsOfExperience: '8-12 years', salaryRange: '$125k - $160k' },
      { title: 'Director of Network Operations', yearsOfExperience: '12+ years', salaryRange: '$160k - $210k+' }
    ],
    scope: 'Network engineers design, implement, and maintain network infrastructure ensuring reliable and secure connectivity.',
    jobMarketProjection: 'Steady 12% growth over next 5 years. Ongoing need for network expertise despite cloud shift.',
    industry: ['Telecommunications', 'Enterprise', 'ISPs', 'Healthcare', 'Finance'],
    hiringCompanies: [
      {
        category: 'IoT & Hardware',
        companies: ['Cisco', 'Dell', 'HP', 'Lenovo', 'Intel', 'Qualcomm']
      },
      {
        category: 'Traditional Companies with Tech Divisions',
        companies: ['Verizon', 'AT&T', 'T-Mobile']
      },
      {
        category: 'Service-Based IT Companies',
        companies: ['HCL', 'Tech Mahindra', 'Wipro']
      }
    ],
    stats: {
      averageSalary: '$88k',
      jobOpenings: '45k+',
      growthRate: '12%'
    }
  },
  {
    id: 'systems-administrator',
    title: 'Systems Administrator',
    category: 'Network & Infrastructure',
    tags: ['Coding'],
    shortDescription: 'Manages and maintains IT systems and servers',
    alternateNames: ['System Admin', 'IT Administrator', 'Systems Engineer'],
    technicalSkills: ['Linux', 'Windows Server', 'Active Directory', 'Scripting', 'Backup & Recovery', 'Virtualization', 'Monitoring'],
    softSkills: ['Problem Solving', 'Organization', 'Communication', 'Time Management', 'Stress Management'],
    careerLadder: [
      { title: 'Junior Systems Admin', yearsOfExperience: '0-2 years', salaryRange: '$42k - $60k' },
      { title: 'Systems Administrator', yearsOfExperience: '2-5 years', salaryRange: '$60k - $85k' },
      { title: 'Senior Systems Admin', yearsOfExperience: '5-8 years', salaryRange: '$85k - $115k' },
      { title: 'Systems Architect', yearsOfExperience: '8-12 years', salaryRange: '$115k - $145k' },
      { title: 'Director of IT Operations', yearsOfExperience: '12+ years', salaryRange: '$145k - $190k+' }
    ],
    scope: 'Systems administrators ensure IT infrastructure runs smoothly, managing servers, networks, and systems maintenance.',
    jobMarketProjection: 'Modest 8% growth in next 5 years. Role evolving with cloud adoption but still essential.',
    industry: ['Enterprise', 'Healthcare', 'Education', 'Government', 'Finance'],
    hiringCompanies: [
      {
        category: 'Service-Based IT Companies',
        companies: ['TCS', 'Infosys', 'Wipro', 'HCL', 'Tech Mahindra']
      },
      {
        category: 'IoT & Hardware',
        companies: ['Dell', 'HP', 'Lenovo', 'IBM']
      },
      {
        category: 'Pure IT/Tech Companies',
        companies: ['Microsoft', 'Oracle']
      }
    ],
    stats: {
      averageSalary: '$78k',
      jobOpenings: '52k+',
      growthRate: '8%'
    }
  },

  // Quality Assurance
  {
    id: 'qa-engineer',
    title: 'QA Engineer',
    category: 'Quality Assurance',
    tags: ['Coding', 'Hybrid'],
    shortDescription: 'Tests software to ensure quality and identify bugs',
    alternateNames: ['Software Tester', 'QA Analyst', 'Test Engineer'],
    technicalSkills: ['Test Automation', 'Selenium', 'JIRA', 'Test Cases', 'API Testing', 'Performance Testing', 'SQL'],
    softSkills: ['Attention to Detail', 'Analytical Thinking', 'Communication', 'Patience', 'Problem Solving'],
    careerLadder: [
      { title: 'Junior QA Engineer', yearsOfExperience: '0-2 years', salaryRange: '$40k - $58k' },
      { title: 'QA Engineer', yearsOfExperience: '2-5 years', salaryRange: '$58k - $82k' },
      { title: 'Senior QA Engineer', yearsOfExperience: '5-8 years', salaryRange: '$82k - $110k' },
      { title: 'QA Lead', yearsOfExperience: '8-12 years', salaryRange: '$110k - $140k' },
      { title: 'Director of QA', yearsOfExperience: '12+ years', salaryRange: '$140k - $180k+' }
    ],
    scope: 'QA engineers ensure software quality through manual and automated testing, finding bugs before products reach users.',
    jobMarketProjection: 'Steady 18% growth over next 5 years. Quality remains critical as software complexity increases.',
    industry: ['Tech', 'Finance', 'Healthcare', 'Gaming', 'E-commerce'],
    hiringCompanies: [
      {
        category: 'Pure IT/Tech Companies',
        companies: ['Microsoft', 'Google', 'Amazon', 'Meta', 'Netflix']
      },
      {
        category: 'Gaming Tech',
        companies: ['Electronic Arts', 'Activision Blizzard', 'Unity Technologies']
      },
      {
        category: 'Service-Based IT Companies',
        companies: ['TCS', 'Infosys', 'Cognizant', 'Wipro']
      }
    ],
    stats: {
      averageSalary: '$78k',
      jobOpenings: '58k+',
      growthRate: '18%'
    }
  },

  // Emerging Technologies
  {
    id: 'blockchain-developer',
    title: 'Blockchain Developer',
    category: 'Emerging Technologies',
    tags: ['Coding', 'Emerging'],
    shortDescription: 'Develops decentralized applications and smart contracts',
    alternateNames: ['Web3 Developer', 'Smart Contract Developer', 'DApp Developer'],
    technicalSkills: ['Solidity', 'Ethereum', 'Smart Contracts', 'Web3.js', 'Cryptography', 'JavaScript', 'Blockchain Protocols'],
    softSkills: ['Problem Solving', 'Innovation', 'Security Mindset', 'Continuous Learning', 'Attention to Detail'],
    careerLadder: [
      { title: 'Junior Blockchain Developer', yearsOfExperience: '0-2 years', salaryRange: '$60k - $90k' },
      { title: 'Blockchain Developer', yearsOfExperience: '2-5 years', salaryRange: '$90k - $135k' },
      { title: 'Senior Blockchain Developer', yearsOfExperience: '5-8 years', salaryRange: '$135k - $180k' },
      { title: 'Blockchain Architect', yearsOfExperience: '8-12 years', salaryRange: '$180k - $240k' },
      { title: 'Chief Blockchain Officer', yearsOfExperience: '12+ years', salaryRange: '$240k - $350k+' }
    ],
    scope: 'Blockchain developers create decentralized applications, smart contracts, and blockchain infrastructure for Web3 projects.',
    jobMarketProjection: 'Volatile but strong 30% growth expected over 5 years. Blockchain adoption expanding beyond crypto.',
    industry: ['Crypto', 'Finance', 'Supply Chain', 'Healthcare', 'Gaming'],
    hiringCompanies: [
      {
        category: 'Blockchain/Web3',
        companies: ['ConsenSys', 'Chainalysis', 'Alchemy', 'Polygon', 'Coinbase', 'Binance']
      },
      {
        category: 'Tech-First Companies',
        companies: ['Coinbase', 'Robinhood']
      },
      {
        category: 'Startups & Unicorns',
        companies: ['Coinbase', 'Polygon']
      }
    ],
    stats: {
      averageSalary: '$130k',
      jobOpenings: '18k+',
      growthRate: '30%'
    }
  },
  {
    id: 'ar-vr-developer',
    title: 'AR/VR Developer',
    category: 'Emerging Technologies',
    tags: ['Coding', 'Creative', 'Emerging'],
    shortDescription: 'Creates immersive augmented and virtual reality experiences',
    alternateNames: ['XR Developer', 'Mixed Reality Developer', 'Metaverse Developer'],
    technicalSkills: ['Unity', 'Unreal Engine', 'C#', 'C++', '3D Modeling', 'ARKit', 'ARCore', 'VR SDKs'],
    softSkills: ['Creativity', 'Problem Solving', 'Spatial Thinking', 'Collaboration', 'User Empathy'],
    careerLadder: [
      { title: 'Junior AR/VR Developer', yearsOfExperience: '0-2 years', salaryRange: '$55k - $80k' },
      { title: 'AR/VR Developer', yearsOfExperience: '2-5 years', salaryRange: '$80k - $120k' },
      { title: 'Senior AR/VR Developer', yearsOfExperience: '5-8 years', salaryRange: '$120k - $160k' },
      { title: 'Lead XR Engineer', yearsOfExperience: '8-12 years', salaryRange: '$160k - $200k' },
      { title: 'XR Architect', yearsOfExperience: '12+ years', salaryRange: '$200k - $280k+' }
    ],
    scope: 'AR/VR developers create immersive experiences for gaming, training, education, and enterprise applications.',
    jobMarketProjection: 'Strong 35% growth over next 5 years. Metaverse and spatial computing driving demand.',
    industry: ['Gaming', 'Entertainment', 'Education', 'Healthcare', 'Retail'],
    hiringCompanies: [
      {
        category: 'Pure IT/Tech Companies',
        companies: ['Meta', 'Apple', 'Google', 'Microsoft']
      },
      {
        category: 'Gaming Tech',
        companies: ['Epic Games', 'Unity Technologies', 'Roblox', 'Nintendo']
      },
      {
        category: 'EdTech',
        companies: ['Coursera', 'Udemy']
      }
    ],
    stats: {
      averageSalary: '$115k',
      jobOpenings: '22k+',
      growthRate: '35%'
    }
  },
  {
    id: 'iot-engineer',
    title: 'IoT Engineer',
    category: 'Emerging Technologies',
    tags: ['Coding', 'Emerging'],
    shortDescription: 'Develops connected devices and Internet of Things solutions',
    alternateNames: ['IoT Developer', 'Embedded Systems Engineer', 'Connected Devices Engineer'],
    technicalSkills: ['Embedded C', 'Python', 'Arduino', 'Raspberry Pi', 'MQTT', 'Sensor Integration', 'Edge Computing', 'Cloud IoT'],
    softSkills: ['Problem Solving', 'Innovation', 'Attention to Detail', 'Collaboration', 'Systems Thinking'],
    careerLadder: [
      { title: 'Junior IoT Engineer', yearsOfExperience: '0-2 years', salaryRange: '$50k - $75k' },
      { title: 'IoT Engineer', yearsOfExperience: '2-5 years', salaryRange: '$75k - $110k' },
      { title: 'Senior IoT Engineer', yearsOfExperience: '5-8 years', salaryRange: '$110k - $145k' },
      { title: 'IoT Architect', yearsOfExperience: '8-12 years', salaryRange: '$145k - $185k' },
      { title: 'Director of IoT Engineering', yearsOfExperience: '12+ years', salaryRange: '$185k - $240k+' }
    ],
    scope: 'IoT engineers design and build connected devices and systems, bridging hardware and software for smart solutions.',
    jobMarketProjection: 'Strong 28% growth in next 5 years. Proliferation of smart devices driving IoT demand.',
    industry: ['Manufacturing', 'Smart Home', 'Healthcare', 'Automotive', 'Agriculture'],
    hiringCompanies: [
      {
        category: 'IoT & Hardware',
        companies: ['Samsung', 'Apple', 'Google Hardware', 'Intel', 'AMD', 'Qualcomm', 'Cisco']
      },
      {
        category: 'Automotive Tech',
        companies: ['Tesla', 'General Motors Tech', 'Ford Smart Mobility']
      },
      {
        category: 'Cloud & Infrastructure',
        companies: ['AWS', 'Microsoft Azure', 'Google Cloud']
      }
    ],
    stats: {
      averageSalary: '$105k',
      jobOpenings: '32k+',
      growthRate: '28%'
    }
  }
];

export function getRoleById(id: string): ITRole | undefined {
  return itRoles.find(role => role.id === id);
}

export function getRolesByCategory(category: string): ITRole[] {
  return itRoles.filter(role => role.category === category);
}

export function getRolesByTag(tag: Tag): ITRole[] {
  return itRoles.filter(role => role.tags.includes(tag));
}

export function searchRoles(query: string): ITRole[] {
  const lowerQuery = query.toLowerCase();
  return itRoles.filter(role => 
    role.title.toLowerCase().includes(lowerQuery) ||
    role.shortDescription.toLowerCase().includes(lowerQuery) ||
    role.category.toLowerCase().includes(lowerQuery) ||
    role.alternateNames.some(name => name.toLowerCase().includes(lowerQuery)) ||
    role.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
}