"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AdminNav } from '@/components/admin/AdminNav';
import { 
  Plus, Edit2, Trash2, Save, X, CheckCircle2, AlertTriangle, 
  RefreshCw, ChevronRight, Briefcase, Wrench, Award, Lightbulb, 
  ArrowLeft, Code, Layers, FolderPlus, Edit3, MapPin, Compass, Building
} from 'lucide-react';
import { type ITRole } from '@/data/itRoles';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type ViewMode = 'MENU' | 'ADD_ROLE' | 'ADD_CATEGORY' | 'SELECT_ROLE' | 'EDIT_ROLE';

export default function AdminDataManagementPage() {
  const router = useRouter();

  // Navigation & View Mode
  const [viewMode, setViewMode] = useState<ViewMode>('MENU');

  // Roles & Categories State from MongoDB Atlas
  const [roles, setRoles] = useState<ITRole[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // ADD / EDIT ROLE COMPLETE FORM STATE
  const [roleForm, setRoleForm] = useState({
    title: '',
    category: '',
    shortDescription: '',
    scope: '',
    industry: [] as string[],
    technicalSkills: [] as string[],
    softSkills: [] as string[],
    tools: [] as string[],
    projects: {
      beginner: [] as string[],
      intermediate: [] as string[],
      advanced: [] as string[]
    },
    certifications: [] as Array<{ name: string; type: 'FREE' | 'PAID'; provider?: string; url?: string }>,
    roadmap: [
      { stage: 'BEGINNER', title: 'Foundational Knowledge', skills: [] as string[], description: '' },
      { stage: 'INTERMEDIATE', title: 'Practical Application', skills: [] as string[], description: '' },
      { stage: 'ADVANCED', title: 'Mastery & Leadership', skills: [] as string[], description: '' }
    ]
  });

  // Autocomplete suggestion check for role title
  const [matchingRoleSuggestions, setMatchingRoleSuggestions] = useState<string[]>([]);

  // ADD NEW CATEGORY STATE
  const [newCategoryName, setNewCategoryName] = useState('');

  // SELECT EXISTING ROLE STATE
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('');
  const [selectedRoleSlug, setSelectedRoleSlug] = useState('');
  const [selectedRole, setSelectedRole] = useState<ITRole | null>(null);

  // Inline Inputs
  const [newIndustryInput, setNewIndustryInput] = useState('');
  const [newTechSkillInput, setNewTechSkillInput] = useState('');
  const [newSoftSkillInput, setNewSoftSkillInput] = useState('');
  const [newToolInput, setNewToolInput] = useState('');
  const [newBeginnerProjInput, setNewBeginnerProjInput] = useState('');
  const [newInterProjInput, setNewInterProjInput] = useState('');
  const [newAdvProjInput, setNewAdvProjInput] = useState('');
  const [newCertNameInput, setNewCertNameInput] = useState('');
  const [newCertProviderInput, setNewCertProviderInput] = useState('');
  const [newCertTypeInput, setNewCertTypeInput] = useState<'FREE' | 'PAID'>('PAID');
  const [newCertUrlInput, setNewCertUrlInput] = useState('');

  // Confirmation Modals
  const [deleteConfirmRole, setDeleteConfirmRole] = useState<boolean>(false);

  // FETCH ROLES & CATEGORIES FROM MONGODB ATLAS
  useEffect(() => {
    fetchRolesFromDb();
  }, []);

  async function fetchRolesFromDb() {
    setLoading(true);
    try {
      const res = await fetch('/api/roles', { cache: 'no-store' });
      const data = await res.json();
      if (data.roles && Array.isArray(data.roles)) {
        setRoles(data.roles);
        const cats = Array.from(new Set(data.roles.map((r: ITRole) => r.category))).filter(Boolean) as string[];
        setCategories(cats);
      }
    } catch (err) {
      console.error('Error fetching roles from MongoDB Atlas:', err);
      showToast('error', 'Failed to connect to MongoDB Atlas.');
    } finally {
      setLoading(false);
    }
  }

  function showToast(type: 'success' | 'error', message: string) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }

  function resetRoleForm() {
    setRoleForm({
      title: '',
      category: categories[0] || 'Software Development',
      shortDescription: '',
      scope: '',
      industry: [],
      technicalSkills: [],
      softSkills: [],
      tools: [],
      projects: { beginner: [], intermediate: [], advanced: [] },
      certifications: [],
      roadmap: [
        { stage: 'BEGINNER', title: 'Foundational Knowledge', skills: [], description: '' },
        { stage: 'INTERMEDIATE', title: 'Practical Application', skills: [], description: '' },
        { stage: 'ADVANCED', title: 'Mastery & Leadership', skills: [], description: '' }
      ]
    });
    setMatchingRoleSuggestions([]);
  }

  // AUTOCOMPLETE SUGGESTION CHECK FOR ROLE TITLE
  function handleRoleTitleInput(title: string) {
    setRoleForm(prev => ({ ...prev, title }));
    if (!title.trim()) {
      setMatchingRoleSuggestions([]);
      return;
    }
    const q = title.toLowerCase().trim();
    const matches = roles
      .filter(r => r.title.toLowerCase().includes(q))
      .map(r => r.title);
    setMatchingRoleSuggestions(matches);
  }

  // OPEN ADD NEW ROLE FORM
  function handleOpenAddRoleForm() {
    resetRoleForm();
    if (categories.length > 0) {
      setRoleForm(prev => ({ ...prev, category: categories[0] }));
    }
    setViewMode('ADD_ROLE');
  }

  // CREATE NEW ROLE WITH COMPLETE FORM DATA
  async function handleCreateRoleExecute() {
    if (!roleForm.title.trim() || !roleForm.category.trim() || saving) return;
    setSaving(true);

    try {
      const slug = roleForm.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const payload = {
        title: roleForm.title.trim(),
        category: roleForm.category.trim(),
        shortDescription: roleForm.shortDescription.trim() || `${roleForm.title.trim()} role in ${roleForm.category.trim()}.`,
        scope: roleForm.scope.trim(),
        industry: roleForm.industry,
        technicalSkills: roleForm.technicalSkills,
        softSkills: roleForm.softSkills,
        tools: roleForm.tools,
        projects: roleForm.projects,
        certifications: roleForm.certifications,
        roadmap: roleForm.roadmap
      };

      const res = await fetch('/api/admin/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        showToast('success', `✓ Role "${payload.title}" created successfully in MongoDB Atlas.`);
        await fetchRolesFromDb();
        // NAVIGATE DIRECTLY TO THE NEW PUBLIC ROLE PAGE
        router.push(`/roles/${slug}`);
      } else {
        showToast('error', data.error || 'Failed to create role.');
      }
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      setSaving(false);
    }
  }

  // CREATE NEW CATEGORY IN MONGODB
  async function handleCreateCategoryExecute() {
    if (!newCategoryName.trim() || saving) return;
    const catName = newCategoryName.trim();

    if (categories.some(c => c.toLowerCase() === catName.toLowerCase())) {
      showToast('error', 'Category already exists.');
      return;
    }

    setSaving(true);
    try {
      setCategories(prev => [...prev, catName]);
      showToast('success', `✓ Category "${catName}" added successfully.`);
      setNewCategoryName('');
      setViewMode('MENU');
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      setSaving(false);
    }
  }

  // FETCH COMPLETE MONGODB DOCUMENT WHEN ROLE IS SELECTED TO EDIT
  async function handleOpenSelectedRole() {
    if (!selectedRoleSlug || saving) return;
    setSaving(true);

    try {
      const res = await fetch(`/api/roles/${selectedRoleSlug}`, { cache: 'no-store' });
      const data = await res.json();

      if (data.role) {
        const fullRole: ITRole = data.role;
        setSelectedRole(fullRole);

        // Normalize certifications
        const certList = (fullRole.certifications || []).map(cert => {
          if (typeof cert === 'string') return { name: cert, type: 'PAID' as const };
          return { name: cert.name, type: (cert.type || 'PAID') as 'FREE' | 'PAID', provider: (cert as any).provider, url: (cert as any).url };
        });

        setRoleForm({
          title: fullRole.title || '',
          category: fullRole.category || '',
          shortDescription: fullRole.shortDescription || '',
          scope: fullRole.scope || '',
          industry: [...(fullRole.industry || [])],
          technicalSkills: [...(fullRole.technicalSkills || [])],
          softSkills: [...(fullRole.softSkills || [])],
          tools: [...(fullRole.tools || [])],
          projects: {
            beginner: [...(fullRole.projects?.beginner || [])],
            intermediate: [...(fullRole.projects?.intermediate || [])],
            advanced: [...(fullRole.projects?.advanced || [])]
          },
          certifications: certList,
          roadmap: fullRole.roadmap && fullRole.roadmap.length > 0 ? fullRole.roadmap : [
            { stage: 'BEGINNER', title: 'Foundational Knowledge', skills: [], description: '' },
            { stage: 'INTERMEDIATE', title: 'Practical Application', skills: [], description: '' },
            { stage: 'ADVANCED', title: 'Mastery & Leadership', skills: [], description: '' }
          ]
        });
        setViewMode('EDIT_ROLE');
      } else {
        showToast('error', 'Failed to load MongoDB role document.');
      }
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      setSaving(false);
    }
  }

  // SAVE EDITED ROLE TO MONGODB
  async function handleSaveEditedRoleInfo() {
    if (!selectedRole || saving) return;
    setSaving(true);

    try {
      const updatedPayload: Partial<ITRole> = {
        title: roleForm.title.trim(),
        category: roleForm.category.trim(),
        shortDescription: roleForm.shortDescription.trim(),
        scope: roleForm.scope.trim(),
        industry: roleForm.industry,
        technicalSkills: roleForm.technicalSkills,
        softSkills: roleForm.softSkills,
        tools: roleForm.tools,
        projects: roleForm.projects,
        certifications: roleForm.certifications,
        roadmap: roleForm.roadmap
      };

      const res = await fetch(`/api/admin/roles/${selectedRole.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedPayload)
      });
      const data = await res.json();

      if (data.success) {
        showToast('success', `✓ Changes saved successfully for "${roleForm.title}".`);
        await fetchRolesFromDb();
      } else {
        showToast('error', data.error || 'Failed to update role.');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Server error saving role.');
    } finally {
      setSaving(false);
    }
  }

  // DELETE ROLE EXECUTION
  async function handleDeleteRoleExecute() {
    if (!selectedRole || saving) return;
    setSaving(true);

    try {
      const res = await fetch(`/api/admin/roles/${selectedRole.id}`, { method: 'DELETE' });
      const data = await res.json();

      if (data.success) {
        showToast('success', `Role "${selectedRole.title}" deleted from MongoDB.`);
        setDeleteConfirmRole(false);
        setSelectedRole(null);
        await fetchRolesFromDb();
        setViewMode('MENU');
      } else {
        showToast('error', data.error || 'Failed to delete role.');
      }
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      setSaving(false);
    }
  }

  // ARRAY HELPERS FOR FORM BUILDING
  function addIndustry() {
    if (!newIndustryInput.trim()) return;
    const val = newIndustryInput.trim();
    if (!roleForm.industry.includes(val)) {
      setRoleForm(prev => ({ ...prev, industry: [...prev.industry, val] }));
    }
    setNewIndustryInput('');
  }

  function removeIndustry(item: string) {
    setRoleForm(prev => ({ ...prev, industry: prev.industry.filter(i => i !== item) }));
  }

  function addTechSkill() {
    if (!newTechSkillInput.trim()) return;
    const val = newTechSkillInput.trim();
    if (!roleForm.technicalSkills.includes(val)) {
      setRoleForm(prev => ({ ...prev, technicalSkills: [...prev.technicalSkills, val] }));
    }
    setNewTechSkillInput('');
  }

  function removeTechSkill(item: string) {
    setRoleForm(prev => ({ ...prev, technicalSkills: prev.technicalSkills.filter(s => s !== item) }));
  }

  function addSoftSkill() {
    if (!newSoftSkillInput.trim()) return;
    const val = newSoftSkillInput.trim();
    if (!roleForm.softSkills.includes(val)) {
      setRoleForm(prev => ({ ...prev, softSkills: [...prev.softSkills, val] }));
    }
    setNewSoftSkillInput('');
  }

  function removeSoftSkill(item: string) {
    setRoleForm(prev => ({ ...prev, softSkills: prev.softSkills.filter(s => s !== item) }));
  }

  function addTool() {
    if (!newToolInput.trim()) return;
    const val = newToolInput.trim();
    if (!roleForm.tools.includes(val)) {
      setRoleForm(prev => ({ ...prev, tools: [...prev.tools, val] }));
    }
    setNewToolInput('');
  }

  function removeTool(item: string) {
    setRoleForm(prev => ({ ...prev, tools: prev.tools.filter(t => t !== item) }));
  }

  function addProject(level: 'beginner' | 'intermediate' | 'advanced', val: string) {
    if (!val.trim()) return;
    setRoleForm(prev => ({
      ...prev,
      projects: {
        ...prev.projects,
        [level]: [...prev.projects[level], val.trim()]
      }
    }));
    if (level === 'beginner') setNewBeginnerProjInput('');
    if (level === 'intermediate') setNewInterProjInput('');
    if (level === 'advanced') setNewAdvProjInput('');
  }

  function removeProject(level: 'beginner' | 'intermediate' | 'advanced', item: string) {
    setRoleForm(prev => ({
      ...prev,
      projects: {
        ...prev.projects,
        [level]: prev.projects[level].filter(p => p !== item)
      }
    }));
  }

  function addCertification() {
    if (!newCertNameInput.trim()) return;
    const item = {
      name: newCertNameInput.trim(),
      type: newCertTypeInput,
      provider: newCertProviderInput.trim() || undefined,
      url: newCertUrlInput.trim() || undefined
    };
    setRoleForm(prev => ({
      ...prev,
      certifications: [...prev.certifications, item]
    }));
    setNewCertNameInput('');
    setNewCertProviderInput('');
    setNewCertUrlInput('');
  }

  function removeCertification(name: string) {
    setRoleForm(prev => ({
      ...prev,
      certifications: prev.certifications.filter(c => c.name !== name)
    }));
  }

  function updateRoadmapLevel(index: number, field: 'title' | 'description' | 'skills', value: any) {
    setRoleForm(prev => {
      const updated = [...prev.roadmap];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, roadmap: updated };
    });
  }

  const rolesInSelectedCategory = roles.filter(
    r => !selectedCategoryFilter || r.category === selectedCategoryFilter
  );

  return (
    <div className="min-h-screen bg-background text-foreground font-sans antialiased">
      {/* PUBLIC DESIGN MATCHING HEADER */}
      <AdminNav />

      {/* TOAST NOTIFICATION */}
      {toast && (
        <div className={`fixed top-20 right-6 z-50 px-4 py-3 rounded-lg shadow-lg border flex items-center gap-3 backdrop-blur ${
          toast.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-rose-50 text-rose-800 border-rose-300'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertTriangle className="w-5 h-5 text-rose-600" />}
          <span className="text-sm font-medium">{toast.message}</span>
          <button onClick={() => setToast(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* DIALOG-BASED CONTAINER */}
      <div className="container mx-auto px-4 py-12 max-w-4xl flex flex-col items-center justify-center min-h-[calc(100vh-100px)]">
        
        {/* VIEW 1: MAIN ADMIN MENU DIALOG */}
        {viewMode === 'MENU' && (
          <Card className="w-full max-w-lg shadow-xl border bg-card rounded-2xl">
            <CardHeader className="text-center pb-2">
              <Badge variant="outline" className="w-max mx-auto mb-2 border-indigo-500/30 text-indigo-700 bg-indigo-50 font-bold text-xs">
                ADMIN CONTROL CENTER
              </Badge>
              <CardTitle className="text-2xl font-extrabold tracking-tight">Admin Management</CardTitle>
              <CardDescription className="text-sm">Manage roles and career categories stored in MongoDB Atlas.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <Button
                onClick={handleOpenAddRoleForm}
                variant="outline"
                className="w-full h-14 text-base font-semibold justify-start px-6 bg-card hover:bg-indigo-50 hover:border-indigo-300 transition text-slate-800 rounded-xl border shadow-sm group"
              >
                <Plus className="mr-3 h-5 w-5 text-indigo-600 group-hover:scale-110 transition-transform" />
                <span>+ Add New Role</span>
              </Button>

              <Button
                onClick={() => setViewMode('ADD_CATEGORY')}
                variant="outline"
                className="w-full h-14 text-base font-semibold justify-start px-6 bg-card hover:bg-emerald-50 hover:border-emerald-300 transition text-slate-800 rounded-xl border shadow-sm group"
              >
                <FolderPlus className="mr-3 h-5 w-5 text-emerald-600 group-hover:scale-110 transition-transform" />
                <span>+ Add New Category</span>
              </Button>

              <Button
                onClick={() => {
                  if (categories.length > 0) setSelectedCategoryFilter(categories[0]);
                  setViewMode('SELECT_ROLE');
                }}
                variant="outline"
                className="w-full h-14 text-base font-semibold justify-start px-6 bg-card hover:bg-blue-50 hover:border-blue-300 transition text-slate-800 rounded-xl border shadow-sm group"
              >
                <Edit3 className="mr-3 h-5 w-5 text-blue-600 group-hover:scale-110 transition-transform" />
                <span>✎ Change Existing Role</span>
              </Button>
            </CardContent>
            <DialogFooter className="px-6 pb-6 pt-2 justify-center">
              <Link href="/">
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                  Close & Return to Website
                </Button>
              </Link>
            </DialogFooter>
          </Card>
        )}

        {/* VIEW 2: ADD NEW CATEGORY DIALOG */}
        {viewMode === 'ADD_CATEGORY' && (
          <Card className="w-full max-w-lg shadow-xl border bg-card rounded-2xl">
            <CardHeader className="pb-3">
              <Badge variant="outline" className="w-max mb-1 border-emerald-500/30 text-emerald-700 bg-emerald-50 font-bold text-xs">
                + ADD NEW CATEGORY
              </Badge>
              <CardTitle className="text-2xl font-bold">Add New Category</CardTitle>
              <CardDescription className="text-xs">Add a new career domain category to MongoDB Atlas.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Category Name *</label>
                <Input
                  type="text"
                  placeholder="e.g. Robotics & Automation..."
                  value={newCategoryName}
                  onChange={e => setNewCategoryName(e.target.value)}
                  className="h-11 text-sm bg-background"
                />
              </div>
            </CardContent>
            <div className="px-6 pb-6 pt-2 flex items-center justify-end gap-3 border-t">
              <Button variant="outline" onClick={() => setViewMode('MENU')}>Cancel</Button>
              <Button onClick={handleCreateCategoryExecute} disabled={saving || !newCategoryName.trim()} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5">
                {saving ? 'Adding...' : 'Add Category'}
              </Button>
            </div>
          </Card>
        )}

        {/* VIEW 3: CHANGE EXISTING ROLE SELECTOR DIALOG */}
        {viewMode === 'SELECT_ROLE' && (
          <Card className="w-full max-w-lg shadow-xl border bg-card rounded-2xl">
            <CardHeader className="pb-3">
              <Badge variant="outline" className="w-max mb-1 border-blue-500/30 text-blue-700 bg-blue-50 font-bold text-xs">
                ✎ CHANGE EXISTING ROLE
              </Badge>
              <CardTitle className="text-2xl font-bold">Change Existing Role</CardTitle>
              <CardDescription className="text-xs">Select a domain category and role to edit from MongoDB Atlas.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Step 1: Select Category / Domain *</label>
                <select
                  value={selectedCategoryFilter}
                  onChange={e => {
                    setSelectedCategoryFilter(e.target.value);
                    const inCat = roles.filter(r => r.category === e.target.value);
                    if (inCat.length > 0) setSelectedRoleSlug(inCat[0].id);
                    else setSelectedRoleSlug('');
                  }}
                  className="w-full h-11 text-sm px-3 rounded-md border border-input bg-background font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">[ Select Category ▼ ]</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Step 2: Select Role *</label>
                <select
                  value={selectedRoleSlug}
                  onChange={e => setSelectedRoleSlug(e.target.value)}
                  disabled={!selectedCategoryFilter}
                  className="w-full h-11 text-sm px-3 rounded-md border border-input bg-background font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                >
                  <option value="">[ Select Role ▼ ]</option>
                  {rolesInSelectedCategory.map(r => (
                    <option key={r.id} value={r.id}>{r.title}</option>
                  ))}
                </select>
              </div>
            </CardContent>
            <div className="px-6 pb-6 pt-2 flex items-center justify-end gap-3 border-t">
              <Button variant="outline" onClick={() => setViewMode('MENU')}>Cancel</Button>
              <Button onClick={handleOpenSelectedRole} disabled={saving || !selectedRoleSlug} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5">
                {saving ? 'Loading Document...' : 'Open Role Editor'}
              </Button>
            </div>
          </Card>
        )}

        {/* VIEW 4 & 5: COMPLETE ROLE FORM FOR CREATING OR EDITING A ROLE */}
        {(viewMode === 'ADD_ROLE' || viewMode === 'EDIT_ROLE') && (
          <div className="w-full space-y-6 py-4 max-w-4xl">
            {/* Header Controls */}
            <div className="flex items-center justify-between flex-wrap gap-4 border-b pb-4">
              <Button onClick={() => setViewMode(viewMode === 'EDIT_ROLE' ? 'SELECT_ROLE' : 'MENU')} variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" /> {viewMode === 'EDIT_ROLE' ? 'Back to Role Selection' : 'Back to Menu'}
              </Button>

              <div className="flex items-center gap-3">
                <Button 
                  onClick={viewMode === 'ADD_ROLE' ? handleCreateRoleExecute : handleSaveEditedRoleInfo} 
                  disabled={saving || !roleForm.title.trim()} 
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-md px-6"
                >
                  {saving ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  {viewMode === 'ADD_ROLE' ? 'Create Role' : 'Save Changes'}
                </Button>

                {viewMode === 'EDIT_ROLE' && (
                  <Button onClick={() => setDeleteConfirmRole(true)} variant="outline" className="text-rose-600 hover:bg-rose-50 border-rose-200">
                    <Trash2 className="mr-2 h-4 w-4" /> Delete Role
                  </Button>
                )}
              </div>
            </div>

            {/* Banner */}
            <div className="bg-gradient-to-br from-primary/10 via-background to-primary/5 rounded-2xl p-6 border space-y-2">
              <Badge variant="secondary">{roleForm.category || 'Category'}</Badge>
              <h2 className="text-3xl font-extrabold">{viewMode === 'ADD_ROLE' ? 'Create New IT Career Role' : `Edit ${roleForm.title}`}</h2>
              <p className="text-sm text-muted-foreground">Fill in complete role details. Saved directly to MongoDB Atlas.</p>
            </div>

            {/* SECTION A: BASIC ROLE INFORMATION */}
            <Card className="bg-card border rounded-2xl shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-primary" />
                  A. Basic Role Information
                </CardTitle>
                <CardDescription className="text-xs">Title, domain category, short description, and scope overview.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">Role Name *</label>
                    <Input
                      type="text"
                      placeholder="e.g. AI Product Manager"
                      value={roleForm.title}
                      onChange={e => handleRoleTitleInput(e.target.value)}
                      className="bg-background text-sm h-10"
                    />
                    {matchingRoleSuggestions.length > 0 && (
                      <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs space-y-1 mt-1">
                        <span className="font-bold text-amber-800 block">Existing Roles Found:</span>
                        <ul className="list-disc list-inside text-amber-900">
                          {matchingRoleSuggestions.map(name => (
                            <li key={name}>{name}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">Category / Domain *</label>
                    <select
                      value={roleForm.category}
                      onChange={e => setRoleForm({ ...roleForm, category: e.target.value })}
                      className="w-full h-10 text-sm px-3 rounded-md border border-input bg-background font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Short Description *</label>
                  <textarea
                    rows={2}
                    placeholder="Brief description of the role..."
                    value={roleForm.shortDescription}
                    onChange={e => setRoleForm({ ...roleForm, shortDescription: e.target.value })}
                    className="w-full bg-background border border-input rounded-md p-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Role Scope Overview</label>
                  <textarea
                    rows={3}
                    placeholder="Detailed scope overview of responsibilities..."
                    value={roleForm.scope}
                    onChange={e => setRoleForm({ ...roleForm, scope: e.target.value })}
                    className="w-full bg-background border border-input rounded-md p-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              </CardContent>
            </Card>

            {/* SECTION B: KEY INDUSTRIES */}
            <Card className="bg-card border rounded-2xl shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Building className="h-5 w-5 text-indigo-600" />
                  B. Key Industries
                </CardTitle>
                <CardDescription className="text-xs">Industries where this role is in high demand.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {(roleForm.industry || []).map(ind => (
                    <div key={ind} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs font-medium">
                      <span>{ind}</span>
                      <button onClick={() => removeIndustry(ind)} className="hover:text-rose-600 p-0.5">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-2 border-t max-w-md">
                  <Input
                    type="text"
                    placeholder="e.g. Technology Companies, FinTech, Healthcare..."
                    value={newIndustryInput}
                    onChange={e => setNewIndustryInput(e.target.value)}
                    className="text-xs h-9"
                  />
                  <Button onClick={addIndustry} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white shrink-0 text-xs">
                    + Add Industry
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* SECTION C: TECHNICAL SKILLS */}
            <Card className="bg-card border rounded-2xl shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Code className="h-5 w-5 text-blue-600" />
                  C. Technical Skills
                </CardTitle>
                <CardDescription className="text-xs">Required technical competencies.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {(roleForm.technicalSkills || []).map(skill => (
                    <div key={skill} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-50 border border-blue-200 text-blue-800 text-xs font-medium">
                      <span>{skill}</span>
                      <button onClick={() => removeTechSkill(skill)} className="hover:text-rose-600 p-0.5">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-2 border-t max-w-md">
                  <Input
                    type="text"
                    placeholder="e.g. Python, TensorFlow, SQL..."
                    value={newTechSkillInput}
                    onChange={e => setNewTechSkillInput(e.target.value)}
                    className="text-xs h-9"
                  />
                  <Button onClick={addTechSkill} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white shrink-0 text-xs">
                    + Add Technical Skill
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* SECTION D: SOFT SKILLS */}
            <Card className="bg-card border rounded-2xl shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-purple-600" />
                  D. Soft Skills
                </CardTitle>
                <CardDescription className="text-xs">Interpersonal and workplace competencies.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {(roleForm.softSkills || []).map(skill => (
                    <div key={skill} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-purple-50 border border-purple-200 text-purple-800 text-xs font-medium">
                      <span>{skill}</span>
                      <button onClick={() => removeSoftSkill(skill)} className="hover:text-rose-600 p-0.5">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-2 border-t max-w-md">
                  <Input
                    type="text"
                    placeholder="e.g. Problem Solving, Communication..."
                    value={newSoftSkillInput}
                    onChange={e => setNewSoftSkillInput(e.target.value)}
                    className="text-xs h-9"
                  />
                  <Button onClick={addSoftSkill} size="sm" className="bg-purple-600 hover:bg-purple-700 text-white shrink-0 text-xs">
                    + Add Soft Skill
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* SECTION E: TOOLS & TECHNOLOGIES */}
            <Card className="bg-card border rounded-2xl shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-indigo-600" />
                  E. Tools & Technologies
                </CardTitle>
                <CardDescription className="text-xs">Platforms, software, and tools used by this role.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {(roleForm.tools || []).map(tool => (
                    <div key={tool} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs font-medium">
                      <span>⚡ {tool}</span>
                      <button onClick={() => removeTool(tool)} className="hover:text-rose-600 p-0.5">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-2 border-t max-w-md">
                  <Input
                    type="text"
                    placeholder="e.g. Git, GitHub, Docker, Cursor..."
                    value={newToolInput}
                    onChange={e => setNewToolInput(e.target.value)}
                    className="text-xs h-9"
                  />
                  <Button onClick={addTool} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white shrink-0 text-xs">
                    + Add Tool
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* SECTION F: PROJECTS TO BUILD */}
            <Card className="bg-card border rounded-2xl shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Layers className="h-5 w-5 text-emerald-600" />
                  F. Projects to Build
                </CardTitle>
                <CardDescription className="text-xs">Beginner, Intermediate, and Advanced hands-on project ideas.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* BEGINNER */}
                <div className="space-y-2">
                  <Badge variant="outline" className="border-emerald-500/30 text-emerald-700 bg-emerald-50 font-semibold text-xs">
                    BEGINNER LEVEL
                  </Badge>
                  <div className="space-y-1.5">
                    {(roleForm.projects?.beginner || []).map((proj, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2.5 rounded-md bg-slate-50 border text-xs">
                        <span>• {proj}</span>
                        <button onClick={() => removeProject('beginner', proj)} className="p-1 text-slate-400 hover:text-rose-600">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <Input
                      type="text"
                      placeholder="e.g. Build a Personal Portfolio Website..."
                      value={newBeginnerProjInput}
                      onChange={e => setNewBeginnerProjInput(e.target.value)}
                      className="text-xs h-8"
                    />
                    <Button onClick={() => addProject('beginner', newBeginnerProjInput)} size="sm" variant="outline" className="text-xs h-8">
                      + Add Project
                    </Button>
                  </div>
                </div>

                {/* INTERMEDIATE */}
                <div className="space-y-2 pt-2 border-t">
                  <Badge variant="outline" className="border-blue-500/30 text-blue-700 bg-blue-50 font-semibold text-xs">
                    INTERMEDIATE LEVEL
                  </Badge>
                  <div className="space-y-1.5">
                    {(roleForm.projects?.intermediate || []).map((proj, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2.5 rounded-md bg-slate-50 border text-xs">
                        <span>• {proj}</span>
                        <button onClick={() => removeProject('intermediate', proj)} className="p-1 text-slate-400 hover:text-rose-600">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <Input
                      type="text"
                      placeholder="e.g. Build a Role-Specific Web Application..."
                      value={newInterProjInput}
                      onChange={e => setNewInterProjInput(e.target.value)}
                      className="text-xs h-8"
                    />
                    <Button onClick={() => addProject('intermediate', newInterProjInput)} size="sm" variant="outline" className="text-xs h-8">
                      + Add Project
                    </Button>
                  </div>
                </div>

                {/* ADVANCED */}
                <div className="space-y-2 pt-2 border-t">
                  <Badge variant="outline" className="border-purple-500/30 text-purple-700 bg-purple-50 font-semibold text-xs">
                    ADVANCED LEVEL
                  </Badge>
                  <div className="space-y-1.5">
                    {(roleForm.projects?.advanced || []).map((proj, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2.5 rounded-md bg-slate-50 border text-xs">
                        <span>• {proj}</span>
                        <button onClick={() => removeProject('advanced', proj)} className="p-1 text-slate-400 hover:text-rose-600">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <Input
                      type="text"
                      placeholder="e.g. Build a Production-Ready AI Platform..."
                      value={newAdvProjInput}
                      onChange={e => setNewAdvProjInput(e.target.value)}
                      className="text-xs h-8"
                    />
                    <Button onClick={() => addProject('advanced', newAdvProjInput)} size="sm" variant="outline" className="text-xs h-8">
                      + Add Project
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* SECTION G: RECOMMENDED CERTIFICATIONS */}
            <Card className="bg-card border rounded-2xl shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Award className="h-5 w-5 text-amber-600" />
                  G. Recommended Certifications
                </CardTitle>
                <CardDescription className="text-xs">Industry certifications with provider & FREE/PAID type.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {(roleForm.certifications || []).map((cert, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-md bg-slate-50 border text-xs">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className={cert.type === 'FREE' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}>
                          {cert.type}
                        </Badge>
                        <span className="font-semibold">{cert.name}</span>
                        {cert.provider && <span className="text-muted-foreground">({cert.provider})</span>}
                      </div>

                      <button onClick={() => removeCertification(cert.name)} className="p-1 text-slate-400 hover:text-rose-600">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t">
                  <Input
                    type="text"
                    placeholder="Certification Name..."
                    value={newCertNameInput}
                    onChange={e => setNewCertNameInput(e.target.value)}
                    className="text-xs h-9"
                  />
                  <Input
                    type="text"
                    placeholder="Provider (e.g. AWS, Google)..."
                    value={newCertProviderInput}
                    onChange={e => setNewCertProviderInput(e.target.value)}
                    className="text-xs h-9"
                  />
                  <select
                    value={newCertTypeInput}
                    onChange={e => setNewCertTypeInput(e.target.value as 'FREE' | 'PAID')}
                    className="text-xs h-9 px-3 rounded-md border border-input bg-background font-medium"
                  >
                    <option value="PAID">PAID</option>
                    <option value="FREE">FREE</option>
                  </select>
                  <Button onClick={addCertification} size="sm" className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-9">
                    + Add Certification
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* SECTION H: CAREER ROADMAP */}
            <Card className="bg-card border rounded-2xl shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Compass className="h-5 w-5 text-indigo-600" />
                  H. Career Roadmap (Beginner, Intermediate, Advanced)
                </CardTitle>
                <CardDescription className="text-xs">Configure the 3-stage learning roadmap for public role pages.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {roleForm.roadmap.map((stage, idx) => (
                  <div key={stage.stage} className="space-y-2 pt-2 border-t first:border-0 first:pt-0">
                    <Badge variant="outline" className="font-bold text-xs">
                      {stage.stage} STAGE
                    </Badge>
                    <div className="space-y-2">
                      <Input
                        type="text"
                        placeholder="Stage Title..."
                        value={stage.title}
                        onChange={e => updateRoadmapLevel(idx, 'title', e.target.value)}
                        className="text-xs h-9 font-semibold"
                      />
                      <textarea
                        rows={2}
                        placeholder="Skills, tools, & milestone project overview..."
                        value={stage.description || ''}
                        onChange={e => updateRoadmapLevel(idx, 'description', e.target.value)}
                        className="w-full bg-background border border-input rounded-md p-2 text-xs"
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Action Footer */}
            <div className="pt-4 flex items-center justify-between border-t">
              <Button variant="outline" onClick={() => setViewMode('MENU')}>
                Cancel & Close
              </Button>

              <Button 
                onClick={viewMode === 'ADD_ROLE' ? handleCreateRoleExecute : handleSaveEditedRoleInfo} 
                disabled={saving || !roleForm.title.trim()} 
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-8 h-11 shadow-lg text-sm"
              >
                {saving ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {viewMode === 'ADD_ROLE' ? 'Create Role & View Public Page' : 'Save Changes'}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* DIALOG: DELETE ROLE CONFIRMATION */}
      <Dialog open={deleteConfirmRole} onOpenChange={() => setDeleteConfirmRole(false)}>
        <DialogContent className="bg-background border shadow-lg max-w-md">
          <DialogHeader>
            <DialogTitle className="text-rose-600">Delete Role Confirmation</DialogTitle>
            <DialogDescription className="text-xs">
              Are you sure you want to delete role <strong>"{selectedRole?.title}"</strong>? This action cannot be undone and will remove the document from MongoDB Atlas.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmRole(false)}>Cancel</Button>
            <Button onClick={handleDeleteRoleExecute} disabled={saving} variant="destructive">
              {saving ? 'Deleting...' : 'Delete Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
