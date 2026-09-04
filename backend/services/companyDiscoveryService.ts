import fs from 'fs';
import path from 'path';

export interface DiscoveredCompany {
  id: string;
  name: string;
  cin?: string;
  type: 'Product' | 'Service' | 'Startup' | 'Enterprise' | 'FinTech' | 'SaaS';
  categories: string[];
  industries: string[];
  technologies: string[];
  description?: string;
  website?: string;
  email?: string;
  phone?: string;
  address: {
    full: string;
    area?: string;
    city: string;
    state: string;
    pincode?: string;
    country: string;
  };
  coordinates?: {
    lat: number;
    lng: number;
  };
  employeeCount?: string;
  foundedYear?: number;
  hiring: boolean;
  startup: boolean;
  relatedRoles?: string[];
}

export interface GetDiscoveredCompaniesOptions {
  city?: string;
  state?: string;
  type?: string;
  category?: string;
  hiring?: boolean;
  startup?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export const CURATED_IT_COMPANIES: DiscoveredCompany[] = [
  // ==================== CHENNAI HUBS (8) ====================
  {
    id: 'zoho-chennai',
    name: 'Zoho Corporation Private Limited',
    cin: 'U72900TN2010PTC078651',
    type: 'SaaS',
    categories: ['SaaS', 'Cloud Software', 'Enterprise Software'],
    industries: ['Software', 'Cloud', 'SaaS'],
    technologies: ['Java', 'C++', 'React', 'Cloud Infra', 'MySQL'],
    description: 'Global tech company building comprehensive suite of cloud software applications for businesses worldwide.',
    website: 'https://www.zoho.com',
    address: {
      full: 'Estancia IT Park, Plot No. 140 & 151, GST Road, Vallancheri',
      area: 'Guduvanchery / Estancia Tech Park',
      city: 'Chennai',
      state: 'Tamil Nadu',
      pincode: '603202',
      country: 'India'
    },
    coordinates: { lat: 12.8252, lng: 80.0550 },
    employeeCount: '10,000+',
    foundedYear: 1996,
    hiring: true,
    startup: false,
    relatedRoles: ['software-engineer', 'backend-developer', 'frontend-developer', 'cloud-architect', 'product-manager']
  },
  {
    id: 'freshworks-chennai',
    name: 'Freshworks Technologies Private Limited',
    cin: 'U72900TN2010PTC076985',
    type: 'SaaS',
    categories: ['SaaS', 'CRM', 'Customer Support', 'ITSM'],
    industries: ['SaaS', 'Software', 'Customer Experience'],
    technologies: ['Ruby on Rails', 'React', 'Node.js', 'AWS', 'MySQL'],
    description: 'Leading provider of modern cloud-based business software for customer support, CRM, and IT service management.',
    website: 'https://www.freshworks.com',
    address: {
      full: 'Global Infocity, Block B, 1st Floor, 40 MGR Salai, Perungudi',
      area: 'OMR / Perungudi',
      city: 'Chennai',
      state: 'Tamil Nadu',
      pincode: '600096',
      country: 'India'
    },
    coordinates: { lat: 12.9644, lng: 80.2486 },
    employeeCount: '5,000+',
    foundedYear: 2010,
    hiring: true,
    startup: false,
    relatedRoles: ['software-engineer', 'frontend-developer', 'devops-engineer', 'ui-ux-designer', 'product-manager']
  },
  {
    id: 'cognizant-chennai',
    name: 'Cognizant Technology Solutions India',
    cin: 'U72900TN1994PTC028263',
    type: 'Enterprise',
    categories: ['IT Services', 'Digital Transformation', 'Cloud Consulting'],
    industries: ['IT Services', 'Consulting'],
    technologies: ['Java', 'Python', 'AWS', 'Azure', 'Salesforce'],
    description: 'Major multinational information technology services and consulting corporation.',
    website: 'https://www.cognizant.com',
    address: {
      full: 'DLF IT Park, Mount Poonamallee Road, Porur',
      area: 'Porur / DLF IT Park',
      city: 'Chennai',
      state: 'Tamil Nadu',
      pincode: '600116',
      country: 'India'
    },
    coordinates: { lat: 13.0298, lng: 80.1558 },
    employeeCount: '300,000+',
    foundedYear: 1994,
    hiring: true,
    startup: false,
    relatedRoles: ['software-engineer', 'cloud-architect', 'data-analyst', 'qa-engineer']
  },
  {
    id: 'hcl-chennai',
    name: 'HCL Technologies Limited',
    cin: 'L74140DL1991PLC046369',
    type: 'Enterprise',
    categories: ['IT Services', 'Infrastructure', 'Software Engineering'],
    industries: ['IT Services', 'Software'],
    technologies: ['C++', 'Java', 'Cloud Infra', 'DevOps', 'Cybersecurity'],
    description: 'Global technology company helping enterprises reimagine their business for the digital age.',
    website: 'https://www.hcltech.com',
    address: {
      full: 'ELCOT SEZ, 602/3, Sholinganallur, OMR',
      area: 'Sholinganallur / OMR',
      city: 'Chennai',
      state: 'Tamil Nadu',
      pincode: '600119',
      country: 'India'
    },
    coordinates: { lat: 12.9034, lng: 80.2285 },
    employeeCount: '200,000+',
    foundedYear: 1991,
    hiring: true,
    startup: false,
    relatedRoles: ['software-engineer', 'network-engineer', 'devops-engineer']
  },
  {
    id: 'wipro-chennai',
    name: 'Wipro Limited Chennai',
    cin: 'L32102KA1945PLC020800',
    type: 'Enterprise',
    categories: ['IT Services', 'Cloud Consulting', 'AI'],
    industries: ['IT Services', 'Consulting'],
    technologies: ['Java', 'SAP', 'Python', 'AWS', 'Azure'],
    description: 'Leading global information technology, consulting and business process services company.',
    website: 'https://www.wipro.com',
    address: {
      full: 'CDC IT Park, 105 Anna Salai, Guindy',
      area: 'Guindy',
      city: 'Chennai',
      state: 'Tamil Nadu',
      pincode: '600032',
      country: 'India'
    },
    coordinates: { lat: 13.0067, lng: 80.2078 },
    employeeCount: '240,000+',
    foundedYear: 1945,
    hiring: true,
    startup: false,
    relatedRoles: ['software-engineer', 'cloud-architect', 'data-engineer']
  },
  {
    id: 'paypal-chennai',
    name: 'PayPal India Development Center',
    cin: 'U72900TN2006PTC060591',
    type: 'FinTech',
    categories: ['FinTech', 'Payments', 'Security', 'Cloud'],
    industries: ['FinTech', 'Payments'],
    technologies: ['Java', 'Node.js', 'React', 'C++', 'Hadoop', 'AWS'],
    description: 'Technology development center driving global digital payment processing and fraud prevention systems.',
    website: 'https://www.paypal.com',
    address: {
      full: 'Futura IT Park, 334 Old Mahabalipuram Rd, Sholinganallur',
      area: 'Sholinganallur / OMR',
      city: 'Chennai',
      state: 'Tamil Nadu',
      pincode: '600119',
      country: 'India'
    },
    coordinates: { lat: 12.9012, lng: 80.2291 },
    employeeCount: '3,000+',
    foundedYear: 2006,
    hiring: true,
    startup: false,
    relatedRoles: ['software-engineer', 'backend-developer', 'cyber-security-analyst', 'product-manager']
  },
  {
    id: 'chargebee-chennai',
    name: 'Chargebee India Technologies',
    cin: 'U72900TN2012PTC085912',
    type: 'SaaS',
    categories: ['SaaS', 'Subscription Billing', 'FinTech'],
    industries: ['SaaS', 'FinTech'],
    technologies: ['Java', 'Spring Boot', 'React', 'AWS', 'PostgreSQL'],
    description: 'Leading subscription management and recurring billing platform for SaaS businesses globally.',
    website: 'https://www.chargebee.com',
    address: {
      full: 'Ascendas IT Park, Crest Building, Taramani',
      area: 'Taramani / Ascendas IT Park',
      city: 'Chennai',
      state: 'Tamil Nadu',
      pincode: '600113',
      country: 'India'
    },
    coordinates: { lat: 12.9863, lng: 80.2452 },
    employeeCount: '1,000+',
    foundedYear: 2011,
    hiring: true,
    startup: true,
    relatedRoles: ['software-engineer', 'backend-developer', 'frontend-developer', 'product-manager']
  },
  {
    id: 'kissflow-chennai',
    name: 'Kissflow Inc. (OrangeScape)',
    cin: 'U72200TN2003PTC051214',
    type: 'SaaS',
    categories: ['Low-Code Platform', 'Workflow Automation', 'SaaS'],
    industries: ['SaaS', 'Software'],
    technologies: ['Java', 'Node.js', 'React', 'GCP', 'MongoDB'],
    description: 'Work management and digital workplace platform for enterprise teams.',
    website: 'https://kissflow.com',
    address: {
      full: 'Tidel Park, Module 0404, 4th Floor, Taramani',
      area: 'Taramani / TIDEL Park',
      city: 'Chennai',
      state: 'Tamil Nadu',
      pincode: '600113',
      country: 'India'
    },
    coordinates: { lat: 12.9897, lng: 80.2514 },
    employeeCount: '500+',
    foundedYear: 2003,
    hiring: true,
    startup: true,
    relatedRoles: ['software-engineer', 'frontend-developer', 'ui-ux-designer']
  },

  // ==================== BENGALURU HUBS (8) ====================
  {
    id: 'google-bengaluru',
    name: 'Google India Private Limited',
    cin: 'U72900KA2003PTC033028',
    type: 'Product',
    categories: ['Search', 'Cloud', 'AI / ML', 'SaaS'],
    industries: ['Search', 'Cloud', 'AI'],
    technologies: ['GCP', 'Go', 'Python', 'TensorFlow', 'Kubernetes'],
    description: 'Organizing the world’s information and making it universally accessible through GCP and AI.',
    website: 'https://google.com',
    address: {
      full: 'RMZ Infinity, Tower E, Old Madras Road',
      area: 'Old Madras Road',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560016',
      country: 'India'
    },
    coordinates: { lat: 12.9892, lng: 77.6534 },
    employeeCount: '10,000+',
    foundedYear: 2003,
    hiring: true,
    startup: false,
    relatedRoles: ['software-engineer', 'ai-engineer', 'data-scientist', 'cloud-architect']
  },
  {
    id: 'infosys-bengaluru',
    name: 'Infosys Limited',
    cin: 'L85110KA1981PLC013115',
    type: 'Enterprise',
    categories: ['IT Services', 'Cloud', 'AI', 'Enterprise Software'],
    industries: ['IT Services', 'Consulting'],
    technologies: ['Java', 'Python', 'AWS', 'Azure', 'React', 'Angular'],
    description: 'Global leader in next-generation digital services and consulting operating worldwide.',
    website: 'https://www.infosys.com',
    address: {
      full: 'Electronics City, Hosur Road',
      area: 'Electronic City',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560100',
      country: 'India'
    },
    coordinates: { lat: 12.8456, lng: 77.6653 },
    employeeCount: '300,000+',
    foundedYear: 1981,
    hiring: true,
    startup: false,
    relatedRoles: ['software-engineer', 'cloud-architect', 'data-analyst']
  },
  {
    id: 'razorpay-bengaluru',
    name: 'Razorpay Software Private Limited',
    cin: 'U72200KA2013PTC097389',
    type: 'FinTech',
    categories: ['Payments', 'FinTech', 'SaaS', 'API Platforms'],
    industries: ['FinTech', 'Payments'],
    technologies: ['Go', 'Node.js', 'React', 'AWS', 'MySQL', 'Kafka'],
    description: 'Leading financial technology company powering payments, banking, and financial services for businesses.',
    website: 'https://razorpay.com',
    address: {
      full: '1st Floor, SJR Cyber, 22 Laskar Hosur Road, Audugodi',
      area: 'Koramangala / Audugodi',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560030',
      country: 'India'
    },
    coordinates: { lat: 12.9348, lng: 77.6134 },
    employeeCount: '3,000+',
    foundedYear: 2014,
    hiring: true,
    startup: true,
    relatedRoles: ['software-engineer', 'frontend-developer', 'backend-developer', 'product-manager']
  },
  {
    id: 'flipkart-bengaluru',
    name: 'Flipkart India Private Limited',
    cin: 'U51909KA2011PTC060707',
    type: 'Product',
    categories: ['E-Commerce', 'Logistics Tech', 'Cloud Platforms'],
    industries: ['E-Commerce', 'Consumer Tech'],
    technologies: ['Java', 'Python', 'React', 'Hadoop', 'Cassandra'],
    description: 'India’s premier e-commerce marketplace platform owned by Walmart.',
    website: 'https://flipkart.com',
    address: {
      full: 'Buildings Alyssa, Begonia & Clover, Embassy TechVillage, ORR',
      area: 'Bellandur / Outer Ring Road',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560103',
      country: 'India'
    },
    coordinates: { lat: 12.9268, lng: 77.6912 },
    employeeCount: '30,000+',
    foundedYear: 2007,
    hiring: true,
    startup: false,
    relatedRoles: ['software-engineer', 'data-scientist', 'product-manager']
  },
  {
    id: 'phonepe-bengaluru',
    name: 'PhonePe Private Limited',
    cin: 'U72900KA2012PTC096123',
    type: 'FinTech',
    categories: ['Payments', 'FinTech', 'UPI', 'WealthTech'],
    industries: ['FinTech', 'Payments'],
    technologies: ['Java', 'Dropwizard', 'React Native', 'HBase', 'Kafka'],
    description: 'Leading digital payments and financial technology platform in India.',
    website: 'https://phonepe.com',
    address: {
      full: 'Salarpuria Softzone, Bellandur',
      area: 'Bellandur',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560103',
      country: 'India'
    },
    coordinates: { lat: 12.9298, lng: 77.6685 },
    employeeCount: '5,000+',
    foundedYear: 2015,
    hiring: true,
    startup: true,
    relatedRoles: ['software-engineer', 'backend-developer', 'mobile-app-developer']
  },
  {
    id: 'postman-bengaluru',
    name: 'Postman Inc.',
    cin: 'U72200KA2014PTC076891',
    type: 'SaaS',
    categories: ['Developer Tools', 'SaaS', 'API'],
    industries: ['Developer Tools', 'SaaS'],
    technologies: ['Node.js', 'React', 'TypeScript', 'Electron', 'AWS'],
    description: 'The world’s leading API platform used by over 30 million developers.',
    website: 'https://postman.com',
    address: {
      full: 'Indiranagar 100ft Road',
      area: 'Indiranagar',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560038',
      country: 'India'
    },
    coordinates: { lat: 12.9784, lng: 77.6412 },
    employeeCount: '1,000+',
    foundedYear: 2014,
    hiring: true,
    startup: true,
    relatedRoles: ['frontend-developer', 'software-engineer', 'devops-engineer']
  },
  {
    id: 'zerodha-bengaluru',
    name: 'Zerodha Broking Limited',
    cin: 'U67120KA2018PLC114170',
    type: 'FinTech',
    categories: ['Stock Broking', 'Trading Platforms', 'FinTech'],
    industries: ['FinTech', 'Trading'],
    technologies: ['Python', 'Go', 'PostgreSQL', 'Vue.js', 'Redis'],
    description: 'India’s largest technology-first retail stock brokerage platform.',
    website: 'https://zerodha.com',
    address: {
      full: '153/154, 4th Cross Dollars Colony, J.P. Nagar 4th Phase',
      area: 'JP Nagar',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560078',
      country: 'India'
    },
    coordinates: { lat: 12.9081, lng: 77.5975 },
    employeeCount: '1,000+',
    foundedYear: 2010,
    hiring: true,
    startup: true,
    relatedRoles: ['backend-developer', 'software-engineer', 'data-analyst']
  },
  {
    id: 'swiggy-bengaluru',
    name: 'Swiggy (Bundl Technologies)',
    cin: 'U74110KA2013PTC096530',
    type: 'Startup',
    categories: ['E-Commerce', 'Logistics', 'Consumer Tech'],
    industries: ['Consumer Tech', 'Logistics'],
    technologies: ['Java', 'Go', 'React Native', 'AWS', 'Spark'],
    description: 'India’s leading on-demand convenience platform connecting consumers to food delivery & grocery.',
    website: 'https://swiggy.com',
    address: {
      full: 'Embassy TechVillage, Outer Ring Road',
      area: 'Devarabeesanahalli',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560103',
      country: 'India'
    },
    coordinates: { lat: 12.9275, lng: 77.6912 },
    employeeCount: '5,000+',
    foundedYear: 2014,
    hiring: true,
    startup: true,
    relatedRoles: ['software-engineer', 'mobile-app-developer', 'data-scientist']
  },

  // ==================== COIMBATORE HUBS (3) ====================
  {
    id: 'bosch-coimbatore',
    name: 'Bosch Global Software Technologies',
    cin: 'U72200KA1997PTC022021',
    type: 'Enterprise',
    categories: ['IT Services', 'Software', 'Automotive Tech', 'AI'],
    industries: ['Automotive Tech', 'Software'],
    technologies: ['C++', 'Python', 'AUTOSAR', 'Embedded C', 'AWS'],
    description: 'Leading global supplier of technology delivering IoT, AI, and mobility software solutions.',
    website: 'https://www.bosch-software.com',
    address: {
      full: 'TIDEL Park Elcot SEZ, Aerodrome Post, Civil Aerodrome Post',
      area: 'Peelamedu / TIDEL Park',
      city: 'Coimbatore',
      state: 'Tamil Nadu',
      pincode: '641014',
      country: 'India'
    },
    coordinates: { lat: 11.0323, lng: 77.0193 },
    employeeCount: '10,000+',
    foundedYear: 1997,
    hiring: true,
    startup: false,
    relatedRoles: ['software-engineer', 'embedded-engineer', 'ai-engineer']
  },
  {
    id: 'impiger-coimbatore',
    name: 'Impiger Technologies',
    cin: 'U72900TN2004PTC054210',
    type: 'Service',
    categories: ['Software Development', 'Mobile Apps', 'Cloud Solutions'],
    industries: ['IT Services', 'Software'],
    technologies: ['React', 'Node.js', 'Flutter', 'Azure', 'Python'],
    description: 'Enterprise mobility and digital transformation consultancy providing web and cloud solutions.',
    website: 'https://www.impigertech.com',
    address: {
      full: 'Indialand Tech Park, Saravanampatti',
      area: 'Saravanampatti',
      city: 'Coimbatore',
      state: 'Tamil Nadu',
      pincode: '641035',
      country: 'India'
    },
    coordinates: { lat: 11.0812, lng: 76.9942 },
    employeeCount: '500+',
    foundedYear: 2004,
    hiring: true,
    startup: false,
    relatedRoles: ['software-engineer', 'frontend-developer', 'mobile-app-developer']
  },
  {
    id: 'skava-coimbatore',
    name: 'Skava (Infosys Company)',
    cin: 'U72200TN2008PTC068112',
    type: 'Product',
    categories: ['Microservices', 'E-Commerce', 'Cloud Platforms'],
    industries: ['E-Commerce', 'Software'],
    technologies: ['Java', 'Spring Boot', 'React', 'Kubernetes', 'GCP'],
    description: 'Next-generation cloud-native e-commerce technology platform provider owned by Infosys.',
    website: 'https://www.skava.com',
    address: {
      full: 'TIDEL Park Elcot SEZ, Keeranatham Road',
      area: 'Saravanampatti / Keeranatham',
      city: 'Coimbatore',
      state: 'Tamil Nadu',
      pincode: '641035',
      country: 'India'
    },
    coordinates: { lat: 11.0834, lng: 76.9961 },
    employeeCount: '1,000+',
    foundedYear: 2008,
    hiring: true,
    startup: false,
    relatedRoles: ['software-engineer', 'backend-developer', 'cloud-architect']
  },

  // ==================== HYDERABAD HUBS (2) ====================
  {
    id: 'microsoft-hyderabad',
    name: 'Microsoft India Development Center',
    cin: 'U72200TG1998PTC029471',
    type: 'Enterprise',
    categories: ['Cloud Computing', 'AI / ML', 'Software Engineering'],
    industries: ['Software', 'Cloud', 'AI'],
    technologies: ['C#', '.NET', 'Azure', 'TypeScript', 'Python', 'C++'],
    description: 'Major software development center driving global Microsoft Azure and AI platform engineering.',
    website: 'https://www.microsoft.com',
    address: {
      full: 'Gachibowli Main Road, ISB Road, Financial District',
      area: 'Gachibowli / Financial District',
      city: 'Hyderabad',
      state: 'Telangana',
      pincode: '500032',
      country: 'India'
    },
    coordinates: { lat: 17.4435, lng: 78.3498 },
    employeeCount: '10,000+',
    foundedYear: 1998,
    hiring: true,
    startup: false,
    relatedRoles: ['software-engineer', 'cloud-architect', 'ai-engineer', 'product-manager']
  },
  {
    id: 'amazon-hyderabad',
    name: 'Amazon Development Centre India',
    cin: 'U72200TG2004PTC044212',
    type: 'Enterprise',
    categories: ['AWS', 'Cloud', 'E-Commerce', 'AI'],
    industries: ['Cloud', 'E-Commerce'],
    technologies: ['Java', 'C++', 'AWS', 'Python', 'DynamoDB'],
    description: 'Amazon’s largest campus globally outside the United States driving AWS cloud and retail systems.',
    website: 'https://www.amazon.in',
    address: {
      full: 'Financial District, Nanakramguda, Serilingampally',
      area: 'Financial District / Nanakramguda',
      city: 'Hyderabad',
      state: 'Telangana',
      pincode: '500032',
      country: 'India'
    },
    coordinates: { lat: 17.4128, lng: 78.3412 },
    employeeCount: '15,000+',
    foundedYear: 2004,
    hiring: true,
    startup: false,
    relatedRoles: ['software-engineer', 'cloud-architect', 'data-scientist']
  },

  // ==================== MUMBAI & PUNE HUBS (2) ====================
  {
    id: 'tcs-mumbai',
    name: 'Tata Consultancy Services Limited',
    cin: 'L22210MH1995PLC084781',
    type: 'Enterprise',
    categories: ['IT Services', 'Enterprise Solutions', 'Consulting'],
    industries: ['IT Services', 'Consulting'],
    technologies: ['Java', 'Python', 'Azure', 'Oracle', 'Salesforce'],
    description: 'Global flagship IT services and consulting organization headquartered in Mumbai.',
    website: 'https://www.tcs.com',
    address: {
      full: 'TCS House, Raveline Street, Fort',
      area: 'Fort / South Mumbai',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      country: 'India'
    },
    coordinates: { lat: 18.9388, lng: 72.8347 },
    employeeCount: '600,000+',
    foundedYear: 1968,
    hiring: true,
    startup: false,
    relatedRoles: ['software-engineer', 'cloud-architect', 'data-analyst']
  },
  {
    id: 'crowdstrike-pune',
    name: 'CrowdStrike Cybersecurity India',
    cin: 'U72900PN2019PTC185412',
    type: 'Product',
    categories: ['Cybersecurity', 'Cloud Security', 'Endpoint Protection'],
    industries: ['Cybersecurity', 'Cloud'],
    technologies: ['Go', 'C++', 'Python', 'AWS', 'Kafka'],
    description: 'Global cybersecurity leader delivering cloud-native endpoint and workload protection.',
    website: 'https://crowdstrike.com',
    address: {
      full: 'Panchshil Business Park, Balewadi High Street',
      area: 'Balewadi',
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '411045',
      country: 'India'
    },
    coordinates: { lat: 18.5794, lng: 73.7845 },
    employeeCount: '2,000+',
    foundedYear: 2019,
    hiring: true,
    startup: false,
    relatedRoles: ['cyber-security-analyst', 'devops-engineer', 'backend-developer']
  },

  // ==================== NOIDA / GURGAON / NCR (2) ====================
  {
    id: 'paytm-noida',
    name: 'Paytm (One97 Communications)',
    cin: 'L72200DL2000PLC108985',
    type: 'FinTech',
    categories: ['FinTech', 'Payments', 'Digital Banking'],
    industries: ['FinTech', 'Payments'],
    technologies: ['Java', 'Node.js', 'React Native', 'MySQL', 'Kafka'],
    description: 'India’s pioneer in QR codes and mobile payments powering millions of merchants.',
    website: 'https://paytm.com',
    address: {
      full: 'One97 Park, Plot No. F-142, Sector 136',
      area: 'Sector 136',
      city: 'Noida',
      state: 'Uttar Pradesh',
      pincode: '201305',
      country: 'India'
    },
    coordinates: { lat: 28.5085, lng: 77.3892 },
    employeeCount: '10,000+',
    foundedYear: 2000,
    hiring: true,
    startup: true,
    relatedRoles: ['software-engineer', 'mobile-app-developer', 'product-manager']
  },
  {
    id: 'zomato-gurgaon',
    name: 'Zomato Limited',
    cin: 'L93030HR2010PLC087090',
    type: 'Startup',
    categories: ['E-Commerce', 'Food Tech', 'Consumer Tech'],
    industries: ['Consumer Tech', 'E-Commerce'],
    technologies: ['React', 'Node.js', 'Python', 'AWS', 'Redis'],
    description: 'Technology platform connecting customers, restaurant partners, and delivery partners across India.',
    website: 'https://zomato.com',
    address: {
      full: 'Ground Floor, 12A, 94 Meghdoot, Nehru Place',
      area: 'Gurgaon / NCR',
      city: 'Gurgaon',
      state: 'Haryana',
      pincode: '122002',
      country: 'India'
    },
    coordinates: { lat: 28.4595, lng: 77.0872 },
    employeeCount: '5,000+',
    foundedYear: 2008,
    hiring: true,
    startup: true,
    relatedRoles: ['frontend-developer', 'software-engineer', 'product-manager']
  }
];

function getBaseCompanies(): DiscoveredCompany[] {
  try {
    const jsonPath = path.join(process.cwd(), 'src', 'data', 'companies.json');
    if (fs.existsSync(jsonPath)) {
      const data = fs.readFileSync(jsonPath, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Fallback to CURATED_IT_COMPANIES:', err);
  }
  return CURATED_IT_COMPANIES;
}

export async function getDiscoveredCompanies(options: GetDiscoveredCompaniesOptions = {}): Promise<{
  success: boolean;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  companies: DiscoveredCompany[];
}> {
  const page = Math.max(1, options.page || 1);
  const limit = Math.max(1, Math.min(100, options.limit || 50));

  let filtered = [...getBaseCompanies()];

  if (options.city && options.city.toLowerCase() !== 'all') {
    filtered = filtered.filter(c => c.address?.city?.toLowerCase() === options.city!.toLowerCase());
  }

  if (options.type && options.type.toLowerCase() !== 'all') {
    filtered = filtered.filter(c => c.type?.toLowerCase() === options.type!.toLowerCase());
  }

  if (options.category && options.category.toLowerCase() !== 'all') {
    filtered = filtered.filter(c =>
      c.categories?.some(cat => cat.toLowerCase().includes(options.category!.toLowerCase())) ||
      c.industries?.some(ind => ind.toLowerCase().includes(options.category!.toLowerCase()))
    );
  }

  if (typeof options.hiring === 'boolean') {
    filtered = filtered.filter(c => c.hiring === options.hiring);
  }

  if (typeof options.startup === 'boolean') {
    filtered = filtered.filter(c => c.startup === options.startup);
  }

  if (options.search && options.search.trim()) {
    const s = options.search.trim().toLowerCase();
    filtered = filtered.filter(c =>
      c.name?.toLowerCase().includes(s) ||
      c.address?.full?.toLowerCase().includes(s) ||
      c.address?.area?.toLowerCase().includes(s) ||
      c.description?.toLowerCase().includes(s) ||
      c.technologies?.some(t => t.toLowerCase().includes(s))
    );
  }

  const total = filtered.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const paginated = filtered.slice((page - 1) * limit, page * limit);

  return {
    success: true,
    total,
    page,
    limit,
    totalPages,
    companies: paginated
  };
}

export async function getHubStats(city?: string): Promise<{
  success: boolean;
  city: string;
  totalCompanies: number;
  hiringCount: number;
  startupsCount: number;
  productCount: number;
  serviceCount: number;
}> {
  const targetCity = (city || 'India').trim();

  let filtered = [...getBaseCompanies()];
  if (city && city.toLowerCase() !== 'all' && city.toLowerCase() !== 'india') {
    filtered = filtered.filter(c => c.address?.city?.toLowerCase() === city.toLowerCase());
  }

  const totalCompanies = filtered.length;
  const hiringCount = filtered.filter(c => c.hiring).length;
  const startupsCount = filtered.filter(c => c.startup).length;
  const productCount = filtered.filter(c => c.type === 'Product' || c.type === 'SaaS' || c.type === 'FinTech').length;
  const serviceCount = filtered.filter(c => c.type === 'Service' || c.type === 'Enterprise').length;

  return {
    success: true,
    city: targetCity,
    totalCompanies,
    hiringCount,
    startupsCount,
    productCount,
    serviceCount
  };
}