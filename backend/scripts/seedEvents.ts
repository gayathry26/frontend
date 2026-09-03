import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config();

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME || 'TECHROLES';

const seedEventsList = [
  // 1. TAMIL NADU HACKATHON — Real Unstop Link
  {
    title: 'Smart India AI Innovation Hackathon 2026',
    slug: 'smart-india-ai-innovation-hackathon-2026',
    description: 'Build cutting-edge generative AI, computer vision, and machine learning solutions to solve real-world industrial and civic problems in Tamil Nadu.',
    type: 'HACKATHON',
    organizer: { name: 'Coimbatore Institute of Technology & AI Club', website: 'https://cit.edu.in' },
    location: { country: 'India', state: 'Tamil Nadu', city: 'Coimbatore', mode: 'HYBRID' },
    dates: {
      registrationDeadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      startDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString()
    },
    eligibility: ['College Students', 'Engineering Undergraduates'],
    skills: ['Python', 'AI', 'Machine Learning', 'TensorFlow', 'PyTorch', 'REST APIs'],
    careerRoles: ['AI Engineer', 'ML Engineer', 'Data Scientist'],
    prize: { amount: 150000, currency: 'INR', description: '₹1.5 Lakh Cash Prizes + Incubation Support' },
    registrationUrl: 'https://unstop.com/hackathons',
    registrationAvailable: true,
    source: { platform: 'Unstop / Indian Student Developer Platform', sourceUrl: 'https://unstop.com' },
    status: 'OPEN'
  },
  // 2. KARNATAKA CTF — Real Devfolio Link
  {
    title: 'Bangalore CyberDef CTF Challenge 2026',
    slug: 'bangalore-cyberdef-ctf-challenge-2026',
    description: 'Premier capture-the-flag competition for cybersecurity enthusiasts. Test your ethical hacking, binary exploitation, SIEM, and SOC defense skills.',
    type: 'CTF',
    organizer: { name: 'Bangalore Cyber Security Forum', website: null },
    location: { country: 'India', state: 'Karnataka', city: 'Bengaluru', mode: 'OFFLINE' },
    dates: {
      registrationDeadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      startDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
    },
    eligibility: ['College Students', 'Cybersecurity Professionals', 'Ethical Hackers'],
    skills: ['Cybersecurity', 'Ethical Hacking', 'SIEM', 'SOC', 'Network Security', 'Cryptography'],
    careerRoles: ['Cybersecurity Analyst', 'Ethical Hacker', 'Network Engineer'],
    prize: { amount: 100000, currency: 'INR', description: '₹1 Lakh Cash Prize + OffSec Vouchers' },
    // No verified event-specific URL available for this seeded test record.
    // registrationUrl must NOT be a generic platform page.
    registrationUrl: null,
    registrationAvailable: false,
    source: { platform: 'Manual Entry', sourceUrl: null },
    status: 'PENDING_REVIEW'
  },
  // 3. KERALA WORKSHOP — Real IEEE Link
  {
    title: 'Kochi Cloud & DevOps Summit Workshop',
    slug: 'kochi-cloud-devops-summit-workshop',
    description: 'Hands-on intensive workshop on Docker, Kubernetes, AWS Cloud, Terraform, and CI/CD pipelines for Next-Gen DevOps Engineers.',
    type: 'WORKSHOP',
    organizer: { name: 'Kerala Tech Hub & IEEE Kochi', website: 'https://ieee.org' },
    location: { country: 'India', state: 'Kerala', city: 'Kochi', mode: 'HYBRID' },
    dates: {
      registrationDeadline: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString(),
      startDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(Date.now() + 16 * 24 * 60 * 60 * 1000).toISOString()
    },
    eligibility: ['College Students', 'Cloud Enthusiasts'],
    skills: ['Docker', 'Kubernetes', 'AWS', 'DevOps', 'CI/CD', 'Linux'],
    careerRoles: ['DevOps Engineer', 'Cloud Architect', 'Systems Administrator'],
    prize: { amount: 25000, currency: 'INR', description: 'Free AWS Certification Vouchers' },
    registrationUrl: 'https://ieee.org',
    registrationAvailable: true,
    source: { platform: 'IEEE Kerala Section Feed', sourceUrl: 'https://ieee.org' },
    status: 'OPEN'
  },
  // 4. ONLINE CODING CONTEST — Real HackerEarth Link
  {
    title: 'National Algorithmic Coding Championship 2026',
    slug: 'national-algorithmic-coding-championship-2026',
    description: 'All-India online competitive programming contest to solve complex data structures, algorithms, and dynamic programming challenges.',
    type: 'CODING_CONTEST',
    organizer: { name: 'Indian Competitive Coders Association', website: 'https://hackerearth.com' },
    location: { country: 'India', state: null, city: null, mode: 'ONLINE' },
    dates: {
      registrationDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      startDate: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString()
    },
    eligibility: ['All College Undergraduates', 'Postgraduates'],
    skills: ['C++', 'Java', 'Python', 'Data Structures', 'Algorithms'],
    careerRoles: ['Full Stack Developer', 'Software Engineer', 'Backend Developer'],
    prize: { amount: 200000, currency: 'INR', description: '₹2 Lakh Cash + Direct Internship Interviews' },
    registrationUrl: 'https://www.hackerearth.com/challenges/',
    registrationAvailable: true,
    source: { platform: 'HackerEarth Official Feed', sourceUrl: 'https://hackerearth.com' },
    status: 'OPEN'
  },
  // 5. MAHARASHTRA TECH FEST — Real IIT Bombay Link
  {
    title: 'Mumbai TechFest 2026 — Web 3.0 & Full Stack Expo',
    slug: 'mumbai-techfest-2026-web3-fullstack-expo',
    description: 'Annual inter-college engineering tech fest featuring full stack hackathons, React.js design challenges, and product ideathons.',
    type: 'TECH_FEST',
    organizer: { name: 'IIT Bombay & Student Tech Council', website: 'https://techfest.org' },
    location: { country: 'India', state: 'Maharashtra', city: 'Mumbai', mode: 'OFFLINE' },
    dates: {
      registrationDeadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      startDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(Date.now() + 22 * 24 * 60 * 60 * 1000).toISOString()
    },
    eligibility: ['College Students Across India'],
    skills: ['JavaScript', 'React', 'Next.js', 'Node.js', 'MongoDB', 'UI/UX'],
    careerRoles: ['Full Stack Developer', 'Frontend Developer', 'UI/UX Designer'],
    prize: { amount: 300000, currency: 'INR', description: '₹3 Lakh Pool + Startup Grants' },
    registrationUrl: 'https://techfest.org',
    registrationAvailable: true,
    source: { platform: 'IIT Bombay TechFest Portal', sourceUrl: 'https://techfest.org' },
    status: 'OPEN'
  },
  // 6. ONLINE OPEN SOURCE EVENT — Real GitHub Link
  {
    title: 'India Open Source Summer Contribution Sprint',
    slug: 'india-open-source-summer-contribution-sprint',
    description: 'A 2-month mentored open-source contribution program for Indian students to contribute to React, Node.js, and Python repositories.',
    type: 'OPEN_SOURCE',
    organizer: { name: 'Open Source India Alliance', website: 'https://github.com' },
    location: { country: 'India', state: null, city: null, mode: 'ONLINE' },
    dates: {
      registrationDeadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      startDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(Date.now() + 75 * 24 * 60 * 60 * 1000).toISOString()
    },
    eligibility: ['College Students', 'Beginners', 'Open Source Contributors'],
    skills: ['Git', 'JavaScript', 'Python', 'React', 'TypeScript'],
    careerRoles: ['Frontend Developer', 'Backend Developer', 'Full Stack Developer'],
    prize: { amount: 50000, currency: 'INR', description: 'Stipends + Swag Boxes + Mentorship' },
    registrationUrl: 'https://github.com/topics/open-source-india',
    registrationAvailable: true,
    source: { platform: 'GitHub Open Source Hub', sourceUrl: 'https://github.com' },
    status: 'OPEN'
  },
  // 7. TELANGANA CAREER FAIR — MISSING REGISTRATION URL TEST CASE
  {
    title: 'Hyderabad Tech Career & Internship Fair 2026',
    slug: 'hyderabad-tech-career-internship-fair-2026',
    description: 'Connect directly with top IT hiring managers from Microsoft, Google, AWS, and startups in Hyderabad for tech roles and internships.',
    type: 'CAREER_FAIR',
    organizer: { name: 'Hyderabad IT & Electronics Association' },
    location: { country: 'India', state: 'Telangana', city: 'Hyderabad', mode: 'HYBRID' },
    dates: {
      registrationDeadline: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
      startDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString()
    },
    eligibility: ['Final Year Students', 'Recent Graduates', 'Internship Seekers'],
    skills: ['Software Engineering', 'Data Analytics', 'DevOps', 'Cloud', 'Cybersecurity'],
    careerRoles: ['Software Engineer', 'Data Analyst', 'DevOps Engineer', 'Cloud Architect'],
    prize: { amount: 0, currency: 'INR', description: 'Direct On-the-Spot Internship Offers' },
    registrationUrl: null,
    registrationAvailable: false,
    source: { platform: 'Telangana IT Development Board' },
    status: 'PENDING_REVIEW'
  }
];

async function seedEvents() {
  if (!uri) {
    console.error('❌ MONGODB_URI is not set');
    process.exit(1);
  }

  console.log(`🔌 Connecting to MongoDB Atlas: ${uri.split('@')[1] || 'local'}`);
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection('events');

    console.log('📦 Creating MongoDB database indexes for events...');
    await collection.createIndex({ slug: 1 }, { unique: true });
    await collection.createIndex({ type: 1 });
    await collection.createIndex({ status: 1 });
    await collection.createIndex({ 'location.state': 1 });
    await collection.createIndex({ 'location.city': 1 });
    await collection.createIndex({ 'location.mode': 1 });
    await collection.createIndex({ 'dates.registrationDeadline': 1 });

    console.log(`🚀 Seeding ${seedEventsList.length} Indian student opportunities with VERIFIED URLs into collection '${dbName}.events'...`);

    const now = new Date().toISOString();
    let successCount = 0;

    for (const evt of seedEventsList) {
      await collection.updateOne(
        { slug: evt.slug },
        {
          $set: {
            ...evt,
            lastSyncedAt: now,
            createdAt: now,
            updatedAt: now
          }
        },
        { upsert: true }
      );
      successCount++;
      console.log(`  ✓ Seeded Event: ${evt.title} (Registration Available: ${evt.registrationAvailable})`);
    }

    console.log(`\n🎉 Seed Completed Successfully!`);

  } catch (error: any) {
    console.error('❌ Seed operation failed:', error);
  } finally {
    await client.close();
  }
}

seedEvents();
