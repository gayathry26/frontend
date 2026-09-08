export interface RoleDefinition {
  id: string;
  roleName: string;
  description: string;
  requiredSkills: string[];
  preferredSkills: string[];
  skillWeights: Record<string, number>;
  relatedSkills: string[];
  synergyCombinations?: {
    skills: string[];
    bonusScore: number;
    description: string;
  }[];
}

export const ROLES_CATALOG: RoleDefinition[] = [
  {
    id: 'mern_stack_developer',
    roleName: 'MERN Stack Developer',
    description: 'Specializes in full-stack web application development using MongoDB, Express.js, React, and Node.js.',
    requiredSkills: ['React', 'Node.js', 'Express.js', 'MongoDB', 'JavaScript'],
    preferredSkills: ['REST APIs', 'Git', 'TypeScript', 'Tailwind CSS', 'Docker'],
    skillWeights: {
      'React': 22,
      'Node.js': 22,
      'MongoDB': 20,
      'Express.js': 18,
      'REST APIs': 10,
      'JavaScript': 8,
    },
    relatedSkills: ['Next.js', 'Redux', 'JWT', 'TypeScript'],
    synergyCombinations: [
      {
        skills: ['React', 'Node.js', 'MongoDB', 'REST APIs'],
        bonusScore: 15,
        description: 'Complete MERN end-to-end full-stack technology stack.',
      }
    ]
  },
  {
    id: 'full_stack_developer',
    roleName: 'Full Stack Developer',
    description: 'Engineers both client-facing frontend interfaces and scalable server-side backend architectures.',
    requiredSkills: ['React', 'Node.js', 'REST APIs', 'SQL', 'MongoDB'],
    preferredSkills: ['TypeScript', 'Git', 'Docker', 'Next.js', 'Tailwind CSS'],
    skillWeights: {
      'React': 18,
      'Node.js': 18,
      'REST APIs': 16,
      'JavaScript': 12,
      'TypeScript': 12,
      'MongoDB': 12,
      'Git': 12,
    },
    relatedSkills: ['Express.js', 'PostgreSQL', 'Docker', 'GraphQL'],
    synergyCombinations: [
      {
        skills: ['React', 'Node.js', 'REST APIs', 'Git'],
        bonusScore: 12,
        description: 'Strong full-stack frontend + backend + API integration baseline.',
      }
    ]
  },
  {
    id: 'frontend_developer',
    roleName: 'Frontend Developer',
    description: 'Builds responsive, interactive web applications and user interfaces focusing on user experience and browser performance.',
    requiredSkills: ['React', 'HTML', 'CSS', 'JavaScript', 'TypeScript'],
    preferredSkills: ['Next.js', 'Tailwind CSS', 'Redux', 'Git', 'Figma / UI Design'],
    skillWeights: {
      'React': 25,
      'JavaScript': 20,
      'HTML': 15,
      'CSS': 15,
      'TypeScript': 15,
      'Tailwind CSS': 10,
    },
    relatedSkills: ['Next.js', 'Vue.js', 'Angular', 'Redux'],
  },
  {
    id: 'backend_developer',
    roleName: 'Backend Developer',
    description: 'Architects microservices, RESTful APIs, business logic, and database schemas for high-traffic server systems.',
    requiredSkills: ['Node.js', 'Express.js', 'Python', 'PostgreSQL', 'MongoDB', 'REST APIs'],
    preferredSkills: ['Docker', 'Redis', 'TypeScript', 'Git', 'Linux'],
    skillWeights: {
      'Node.js': 22,
      'REST APIs': 20,
      'Express.js': 18,
      'PostgreSQL': 15,
      'MongoDB': 15,
      'Docker': 10,
    },
    relatedSkills: ['FastAPI', 'Django', 'Spring Boot', 'Redis'],
  },
  {
    id: 'software_engineer',
    roleName: 'Software Engineer',
    description: 'Designs core software architectures, algorithmic solutions, and robust systems using object-oriented principles.',
    requiredSkills: ['Java', 'C++', 'Python', 'TypeScript', 'Git', 'Problem Solving'],
    preferredSkills: ['Docker', 'REST APIs', 'SQL', 'Linux'],
    skillWeights: {
      'Problem Solving': 25,
      'Java': 20,
      'Python': 15,
      'C++': 15,
      'Git': 15,
      'REST APIs': 10,
    },
    relatedSkills: ['TypeScript', 'Docker', 'Linux', 'Data Structures'],
  },
  {
    id: 'data_analyst',
    roleName: 'Data Analyst',
    description: 'Transforms raw corporate data into actionable business intelligence, dashboards, and automated statistical reports.',
    requiredSkills: ['Python', 'SQL', 'Pandas', 'Power BI'],
    preferredSkills: ['NumPy', 'Tableau', 'Git', 'Problem Solving'],
    skillWeights: {
      'SQL': 30,
      'Python': 25,
      'Pandas': 20,
      'Power BI': 15,
      'NumPy': 10,
    },
    relatedSkills: ['Tableau', 'Scikit-learn', 'Excel'],
    synergyCombinations: [
      {
        skills: ['Python', 'Pandas', 'SQL', 'Power BI'],
        bonusScore: 15,
        description: 'Complete data processing, querying, and reporting pipeline.',
      }
    ]
  },
  {
    id: 'data_scientist',
    roleName: 'Data Scientist',
    description: 'Leverages statistical modeling, machine learning algorithms, and predictive analytics to solve complex data problems.',
    requiredSkills: ['Python', 'Pandas', 'NumPy', 'Scikit-learn', 'SQL'],
    preferredSkills: ['TensorFlow', 'PyTorch', 'Git', 'Linux'],
    skillWeights: {
      'Python': 25,
      'Pandas': 20,
      'NumPy': 20,
      'Scikit-learn': 20,
      'SQL': 15,
    },
    relatedSkills: ['TensorFlow', 'PyTorch', 'Power BI'],
    synergyCombinations: [
      {
        skills: ['Python', 'NumPy', 'Pandas', 'Scikit-learn'],
        bonusScore: 15,
        description: 'Core scientific Python Machine Learning toolkit.',
      }
    ]
  },
  {
    id: 'machine_learning_engineer',
    roleName: 'Machine Learning Engineer',
    description: 'Deploys, optimizes, and scales deep learning models and ML pipelines into production environments.',
    requiredSkills: ['Python', 'PyTorch', 'TensorFlow', 'Scikit-learn', 'Docker'],
    preferredSkills: ['FastAPI', 'Git', 'AWS', 'Linux'],
    skillWeights: {
      'Python': 22,
      'PyTorch': 22,
      'TensorFlow': 20,
      'Scikit-learn': 18,
      'Docker': 18,
    },
    relatedSkills: ['FastAPI', 'Kubernetes', 'Pandas'],
  },
  {
    id: 'ai_engineer',
    roleName: 'AI Engineer',
    description: 'Integrates Large Language Models (LLMs), RAG vector pipelines, and generative AI features into modern applications.',
    requiredSkills: ['Python', 'FastAPI', 'PyTorch', 'TypeScript', 'REST APIs'],
    preferredSkills: ['Docker', 'Next.js', 'Redis', 'Git'],
    skillWeights: {
      'Python': 25,
      'PyTorch': 20,
      'FastAPI': 20,
      'REST APIs': 18,
      'TypeScript': 17,
    },
    relatedSkills: ['TensorFlow', 'Vector DB', 'LangChain'],
  },
  {
    id: 'devops_engineer',
    roleName: 'DevOps Engineer',
    description: 'Automates CI/CD deployment pipelines, infrastructure provision, container orchestration, and cloud reliability.',
    requiredSkills: ['Docker', 'Kubernetes', 'AWS', 'Linux', 'GitHub Actions'],
    preferredSkills: ['Terraform', 'Python', 'Azure', 'Git'],
    skillWeights: {
      'Docker': 22,
      'Kubernetes': 22,
      'AWS': 20,
      'Linux': 20,
      'GitHub Actions': 16,
    },
    relatedSkills: ['Terraform', 'Go (Golang)', 'Python', 'Azure'],
    synergyCombinations: [
      {
        skills: ['Docker', 'Kubernetes', 'AWS', 'Linux'],
        bonusScore: 18,
        description: 'Standard enterprise cloud-native DevOps container stack.',
      }
    ]
  },
  {
    id: 'cloud_engineer',
    roleName: 'Cloud Engineer',
    description: 'Architects and manages secure multi-region cloud infrastructure, virtual networks, and serverless compute.',
    requiredSkills: ['AWS', 'Azure', 'Docker', 'Linux', 'Terraform'],
    preferredSkills: ['Kubernetes', 'Python', 'GitHub Actions', 'Git'],
    skillWeights: {
      'AWS': 25,
      'Azure': 20,
      'Docker': 20,
      'Linux': 20,
      'Terraform': 15,
    },
    relatedSkills: ['Google Cloud (GCP)', 'Kubernetes', 'Python'],
  },
  {
    id: 'data_engineer',
    roleName: 'Data Engineer',
    description: 'Builds fault-tolerant data pipelines, ETL workflows, and big data warehousing systems for streaming analytics.',
    requiredSkills: ['Python', 'SQL', 'PostgreSQL', 'Docker', 'AWS'],
    preferredSkills: ['Redis', 'Linux', 'Git', 'Pandas'],
    skillWeights: {
      'SQL': 25,
      'Python': 25,
      'PostgreSQL': 20,
      'Docker': 15,
      'AWS': 15,
    },
    relatedSkills: ['Redis', 'Kubernetes', 'Spark'],
  },
  {
    id: 'cybersecurity_analyst',
    roleName: 'Cybersecurity Analyst',
    description: 'Protects enterprise networks, monitors security threats, enforces encryption, and performs vulnerability audits.',
    requiredSkills: ['Linux', 'Python', 'Git', 'Problem Solving'],
    preferredSkills: ['AWS', 'Docker', 'REST APIs', 'SQL'],
    skillWeights: {
      'Linux': 30,
      'Problem Solving': 25,
      'Python': 25,
      'Git': 20,
    },
    relatedSkills: ['Networking', 'Penetration Testing', 'C++'],
  },
  {
    id: 'qa_engineer',
    roleName: 'QA & Automation Engineer',
    description: 'Develops automated testing frameworks, end-to-end regression suites, and continuous quality assurance pipelines.',
    requiredSkills: ['JavaScript', 'TypeScript', 'Automated Testing / Jest / Cypress', 'Python', 'Git'],
    preferredSkills: ['REST APIs', 'Docker', 'GitHub Actions'],
    skillWeights: {
      'Automated Testing / Jest / Cypress': 35,
      'JavaScript': 20,
      'TypeScript': 18,
      'Git': 15,
      'Python': 12,
    },
    relatedSkills: ['REST APIs', 'Playwright', 'Selenium'],
  },
  {
    id: 'mobile_developer',
    roleName: 'Mobile App Developer',
    description: 'Develops cross-platform or native mobile applications for iOS and Android devices with smooth UI interactions.',
    requiredSkills: ['React', 'JavaScript', 'TypeScript', 'REST APIs'],
    preferredSkills: ['Firebase', 'Git', 'Redux', 'Figma / UI Design'],
    skillWeights: {
      'React': 30,
      'JavaScript': 25,
      'TypeScript': 20,
      'REST APIs': 15,
      'Firebase': 10,
    },
    relatedSkills: ['React Native', 'Flutter', 'Swift', 'Kotlin'],
  },
  {
    id: 'ui_ux_developer',
    roleName: 'UI/UX Developer',
    description: 'Bridges design and frontend engineering, crafting intuitive user interfaces, accessibility features, and visual systems.',
    requiredSkills: ['Figma / UI Design', 'HTML', 'CSS', 'Tailwind CSS', 'React'],
    preferredSkills: ['JavaScript', 'TypeScript', 'Next.js'],
    skillWeights: {
      'Figma / UI Design': 35,
      'CSS': 20,
      'HTML': 15,
      'Tailwind CSS': 15,
      'React': 15,
    },
    relatedSkills: ['Responsive Design', 'Design Systems', 'Next.js'],
  },
];
