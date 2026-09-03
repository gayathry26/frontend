import { NextResponse } from 'next/server';
import { getRoleBySlugFromDb, upsertRoleInDb, deleteRoleInDb, getAllRolesFromDb } from '@/backend/services/roleService';
import { logAdminAction } from '@/backend/services/auditService';
import { ITRole } from '@/backend/types/role';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { actionPayload, adminId = 'admin' } = body;

    if (!actionPayload || !actionPayload.action) {
      return NextResponse.json({ error: 'Invalid action payload' }, { status: 400 });
    }

    const {
      action,
      roleId,
      targetField,
      addTechnicalSkills,
      removeTechnicalSkills,
      addSoftSkills,
      removeSoftSkills,
      updateFields,
      newRoleData,
      bulkTargetCategory
    } = actionPayload;

    let resultRole: ITRole | null = null;
    let successMessage = '';

    // 1. UPDATE SKILLS & FIELDS
    if ((action === 'UPDATE_SKILLS' || action === 'UPDATE_FIELD') && roleId) {
      const existingRole = await getRoleBySlugFromDb(roleId);
      if (!existingRole) {
        return NextResponse.json({ error: `Role '${roleId}' not found in database.` }, { status: 404 });
      }

      let newTech = [...(existingRole.technicalSkills || [])];
      let newSoft = [...(existingRole.softSkills || [])];
      const addedList: string[] = [];
      const removedList: string[] = [];

      if (addTechnicalSkills && Array.isArray(addTechnicalSkills)) {
        addTechnicalSkills.forEach(s => {
          const exists = newTech.some(ex => ex.toLowerCase() === s.toLowerCase());
          if (!exists) {
            newTech.push(s);
            addedList.push(`Technical Skill: ${s}`);
          }
        });
      }

      if (addSoftSkills && Array.isArray(addSoftSkills)) {
        addSoftSkills.forEach(s => {
          const exists = newSoft.some(ex => ex.toLowerCase() === s.toLowerCase());
          if (!exists) {
            newSoft.push(s);
            addedList.push(`Soft Skill: ${s}`);
          }
        });
      }

      if (removeTechnicalSkills && Array.isArray(removeTechnicalSkills)) {
        removeTechnicalSkills.forEach(s => {
          newTech = newTech.filter(ex => ex.toLowerCase() !== s.toLowerCase());
          removedList.push(`Technical Skill: ${s}`);
        });
      }

      if (removeSoftSkills && Array.isArray(removeSoftSkills)) {
        removeSoftSkills.forEach(s => {
          newSoft = newSoft.filter(ex => ex.toLowerCase() !== s.toLowerCase());
          removedList.push(`Soft Skill: ${s}`);
        });
      }

      const mergedRole: ITRole = {
        ...existingRole,
        technicalSkills: Array.from(new Set(newTech)),
        softSkills: Array.from(new Set(newSoft)),
        shortDescription: updateFields?.shortDescription || existingRole.shortDescription,
        jobMarketProjection: updateFields?.jobMarketProjection || existingRole.jobMarketProjection,
        stats: updateFields?.salaryRange ? {
          averageSalary: updateFields.salaryRange,
          jobOpenings: existingRole.stats?.jobOpenings || '50k+',
          growthRate: existingRole.stats?.growthRate || '20%'
        } : existingRole.stats
      };

      // Execute MongoDB update
      await upsertRoleInDb(mergedRole, adminId);

      // Verify MongoDB Atlas state
      resultRole = await getRoleBySlugFromDb(roleId);
      if (!resultRole) {
        return NextResponse.json({ error: 'Database update verification failed.' }, { status: 500 });
      }

      const changeDetails: string[] = [];
      if (addedList.length > 0) changeDetails.push(`Added:\n+ ${addedList.join('\n+ ')}`);
      if (removedList.length > 0) changeDetails.push(`Removed:\n- ${removedList.join('\n- ')}`);

      const updatedOverview = targetField === 'softSkills'
        ? `**Current Soft Skills**:\n${(resultRole.softSkills || []).join(', ')}`
        : `**Current Technical Skills**:\n${(resultRole.technicalSkills || []).join(', ')}`;

      successMessage = `Update confirmed.\n\n**${resultRole.title}** has been updated successfully in MongoDB Atlas.\n\n${changeDetails.join('\n\n')}\n\n${updatedOverview}\n\n**Last Updated**: ${resultRole.updatedAt}`;

      await logAdminAction({
        adminId,
        action: 'UPDATE_ROLE',
        roleId,
        before: existingRole,
        after: resultRole,
        status: 'success',
        details: `Added: [${addedList.join(', ')}], Removed: [${removedList.join(', ')}]`
      });

    // 2. CREATE NEW ROLE
    } else if (action === 'CREATE_ROLE' && newRoleData) {
      await upsertRoleInDb(newRoleData as ITRole, adminId);
      resultRole = await getRoleBySlugFromDb(newRoleData.id);

      successMessage = `Role created successfully in MongoDB Atlas!\n\n**${resultRole?.title}** (${resultRole?.category}).\n\n**Last Updated**: ${resultRole?.updatedAt}`;

      await logAdminAction({
        adminId,
        action: 'CREATE_ROLE',
        roleId: newRoleData.id,
        after: resultRole,
        status: 'success'
      });

    // 3. DELETE ROLE
    } else if (action === 'DELETE_ROLE' && roleId) {
      const existingRole = await getRoleBySlugFromDb(roleId);
      const deleted = await deleteRoleInDb(roleId);

      if (!deleted) {
        return NextResponse.json({ error: 'Failed to delete role' }, { status: 400 });
      }

      successMessage = `Successfully deleted **${existingRole?.title || roleId}** from MongoDB Atlas!`;

      await logAdminAction({
        adminId,
        action: 'DELETE_ROLE',
        roleId,
        before: existingRole,
        status: 'success'
      });

    // 4. BULK UPDATE
    } else if (action === 'BULK_UPDATE' && bulkTargetCategory && addTechnicalSkills) {
      const allRoles = await getAllRolesFromDb();
      const targetRoles = allRoles.filter(r => r.category.toLowerCase().includes(bulkTargetCategory.toLowerCase()));

      for (const r of targetRoles) {
        const currentTech = r.technicalSkills || [];
        const newTech = Array.from(new Set([...currentTech, ...addTechnicalSkills]));
        await upsertRoleInDb({ ...r, technicalSkills: newTech }, adminId);
      }

      successMessage = `Successfully bulk-updated **${targetRoles.length} roles** in category '${bulkTargetCategory}' in MongoDB Atlas!`;

      await logAdminAction({
        adminId,
        action: 'BULK_UPDATE',
        status: 'success'
      });
    } else {
      return NextResponse.json({ error: 'Action parameters missing' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: successMessage,
      updatedRole: resultRole
    });

  } catch (err: any) {
    console.error('[AdminAIConfirm] Confirmation failed:', err);

    let clientError = err.message || 'Confirmation execution failed';
    if (clientError.includes('tlsv1 alert') || clientError.includes('MongoServerSelectionError') || clientError.includes('SSL routines')) {
      clientError = 'Unable to connect to MongoDB Atlas. Please check your IP Access List (0.0.0.0/0) and database credentials in MongoDB Atlas.';
    }

    return NextResponse.json({
      success: false,
      error: clientError
    }, { status: 500 });
  }
}
