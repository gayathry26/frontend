// Stub for missing seedTechMap – merged shim to fix build
// Original import in src/app/api/companies/[id]/route.ts expected SEED_GEO_COMPANIES
// Provide compatibility export from curated companies
export { CURATED_IT_COMPANIES as SEED_GEO_COMPANIES } from '../services/companyDiscoveryService';
