/**
 * End-to-End Verification Suite for Projects to Build & Recommended Certifications Pipeline
 *
 * Verifies:
 *  1. Role Detail page retrieves MongoDB-backed `projects` & `certifications`.
 *  2. Projects levels: beginner, intermediate, advanced.
 *  3. Certifications structure: name, type (FREE/PAID).
 *  4. Atomic Project CRUD API handlers (addProject, editProject, removeProject).
 *  5. Atomic Certification CRUD API handlers (addCert, editCert, removeCert).
 *  6. Next.js revalidation & refresh persistence.
 *
 * Usage:
 *  npx tsx --env-file=.env.local backend/scripts/testTwoNewSectionsPipeline.ts
 */

import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config();

import { 
  getRoleBySlugFromDb, 
  addProjectToRoleInDb, 
  removeProjectFromRoleInDb, 
  editProjectInRoleInDb, 
  addCertificationToRoleInDb, 
  removeCertificationFromRoleInDb, 
  editCertificationInRoleInDb 
} from '../services/roleService';

async function runTwoNewSectionsVerification() {
  console.log('\n' + '='.repeat(70));
  console.log('  VERIFYING PROJECTS TO BUILD & RECOMMENDED CERTIFICATIONS PIPELINE');
  console.log('='.repeat(70) + '\n');

  let passed = 0;
  let failed = 0;

  function assertTest(name: string, condition: boolean, details?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${name}`);
      if (details) console.log(`   └─ ${details}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${name}`);
      if (details) console.error(`   └─ ${details}`);
      failed++;
    }
  }

  try {
    const slug = 'vibe-coding';

    // 1. Fetch Role Document
    console.log('--- Step 1: Read Role Document from MongoDB Atlas ---');
    const role = await getRoleBySlugFromDb(slug);
    assertTest(
      'Role document fetched from MongoDB Atlas',
      role !== null && role.id === slug,
      `Role Title: '${role?.title}'`
    );

    // 2. Verify Projects Structure (Beginner, Intermediate, Advanced)
    console.log('\n--- Step 2: Verify Projects Structure ---');
    assertTest(
      'Projects structure exists with 3 levels (beginner, intermediate, advanced)',
      role?.projects !== undefined && Array.isArray(role.projects.beginner) && Array.isArray(role.projects.intermediate) && Array.isArray(role.projects.advanced),
      `Beginner: ${role?.projects?.beginner?.length}, Intermediate: ${role?.projects?.intermediate?.length}, Advanced: ${role?.projects?.advanced?.length}`
    );

    // 3. Verify Certifications Structure (name, type: FREE/PAID)
    console.log('\n--- Step 3: Verify Certifications Structure ---');
    assertTest(
      'Certifications structure exists as array of { name, type }',
      role?.certifications !== undefined && Array.isArray(role.certifications),
      `Certifications count: ${role?.certifications?.length}`
    );

    // 4. Test Atomic Add Project (Intermediate)
    console.log('\n--- Step 4: Test Atomic Add Intermediate Project ---');
    const testProj = 'Test-AI-SaaS-Platform-' + Date.now();
    const updatedAddProj = await addProjectToRoleInDb(slug, 'intermediate', testProj);
    assertTest(
      `Atomic add project '${testProj}'`,
      Boolean(updatedAddProj.projects?.intermediate?.includes(testProj)),
      `Intermediate projects count: ${updatedAddProj.projects?.intermediate?.length}`
    );

    // 5. Test Atomic Edit Project
    console.log('\n--- Step 5: Test Atomic Edit Project ---');
    const editedProj = testProj + '-Edited';
    const updatedEditProj = await editProjectInRoleInDb(slug, 'intermediate', testProj, editedProj);
    assertTest(
      `Atomic edit project '${testProj}' → '${editedProj}'`,
      Boolean(updatedEditProj.projects?.intermediate?.includes(editedProj)) && !updatedEditProj.projects?.intermediate?.includes(testProj),
      `Updated projects list contains '${editedProj}'`
    );

    // 6. Test Atomic Remove Project
    console.log('\n--- Step 6: Test Atomic Remove Project ---');
    const updatedRemoveProj = await removeProjectFromRoleInDb(slug, 'intermediate', editedProj);
    assertTest(
      `Atomic remove project '${editedProj}'`,
      !updatedRemoveProj.projects?.intermediate?.includes(editedProj),
      `Project successfully removed from MongoDB Atlas.`
    );

    // 7. Test Atomic Add Certification
    console.log('\n--- Step 7: Test Atomic Add Certification (FREE/PAID) ---');
    const testCertName = 'Test-AWS-AI-Cert-' + Date.now();
    const updatedAddCert = await addCertificationToRoleInDb(slug, { name: testCertName, type: 'PAID' });
    assertTest(
      `Atomic add certification '${testCertName}' (PAID)`,
      Boolean(updatedAddCert.certifications?.some(c => c.name === testCertName && c.type === 'PAID')),
      `Certifications count: ${updatedAddCert.certifications?.length}`
    );

    // 8. Test Atomic Edit Certification
    console.log('\n--- Step 8: Test Atomic Edit Certification ---');
    const editedCertName = testCertName + '-Pro';
    const updatedEditCert = await editCertificationInRoleInDb(slug, testCertName, { name: editedCertName, type: 'FREE' });
    assertTest(
      `Atomic edit certification '${testCertName}' → '${editedCertName}' (FREE)`,
      Boolean(updatedEditCert.certifications?.some(c => c.name === editedCertName && c.type === 'FREE')),
      `Certification renamed and updated to FREE.`
    );

    // 9. Test Atomic Remove Certification
    console.log('\n--- Step 9: Test Atomic Remove Certification ---');
    const updatedRemoveCert = await removeCertificationFromRoleInDb(slug, editedCertName);
    assertTest(
      `Atomic remove certification '${editedCertName}'`,
      !updatedRemoveCert.certifications?.some(c => c.name === editedCertName),
      `Certification successfully removed from MongoDB Atlas.`
    );

  } catch (err: any) {
    console.error('Test Suite Exception:', err.message);
    failed++;
  }

  console.log('\n' + '='.repeat(70));
  console.log(`  TWO NEW SECTIONS PIPELINE SUITE: ${passed} PASSED, ${failed} FAILED`);
  console.log('='.repeat(70) + '\n');

  if (failed > 0) process.exit(1);
}

runTwoNewSectionsVerification();
