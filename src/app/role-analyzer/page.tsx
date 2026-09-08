'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Search, Sparkles, CheckCircle2, RefreshCw, ArrowRight, BrainCircuit,
  Briefcase, Cpu, Layers, Target, ChevronDown, ChevronUp, Zap, Award,
  Check, X, BookOpen, BarChart3, HelpCircle, ArrowLeft, ShieldCheck,
  FolderGit2, Trash2, Save, Rocket
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { SKILLS_CATALOG, SKILL_CATEGORIES, SkillItem } from '@/backend/data/skillsCatalog';
import { RoleMatchResult } from '@/backend/services/roleAnalyzerService';

const ANALYSIS_STEPS = [
  'Mapping technologies & skill clusters...',
  'Analyzing technology combinations & synergies...',
  'Comparing against 16+ enterprise IT role requirements...',
  'Calculating weighted role compatibility scores...',
  'Generating personalized career roadmap & skill gap insights...',
];

export default function RoleAnalyzerPage() {
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<string>('ALL');

  // Analysis State
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [stepIndex, setStepIndex] = useState<number>(0);
  const [hasAnalyzed, setHasAnalyzed] = useState<boolean>(false);
  const [results, setResults] = useState<RoleMatchResult[]>([]);
  const [topRole, setTopRole] = useState<RoleMatchResult | null>(null);
  const [careerPath, setCareerPath] = useState<any>(null);
  const [projectEvidenceSkills, setProjectEvidenceSkills] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // UI Interactive States
  const [expandedRoleId, setExpandedRoleId] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState<boolean>(false);
  const [savedSuccessMsg, setSavedSuccessMsg] = useState<string>('');

  // Load saved profile on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('_role_analyzer_saved_profile');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.skills) && parsed.skills.length > 0) {
          setSelectedSkills(parsed.skills);
        }
      }
    } catch {}

    // Check project evidence
    fetch('/api/role-analyzer/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skills: ['React', 'Node.js', 'REST APIs'] }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.projectEvidenceSkills) {
          setProjectEvidenceSkills(data.projectEvidenceSkills);
        }
      })
      .catch(() => {});
  }, []);

  // Filter skills based on search and category
  const filteredSkills = useMemo(() => {
    return SKILLS_CATALOG.filter((skill) => {
      const matchesSearch = skill.name.toLowerCase().includes(searchQuery.toLowerCase().trim());
      const matchesCategory = activeCategory === 'ALL' || skill.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, activeCategory]);

  const toggleSkill = (skillName: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skillName) ? prev.filter((s) => s !== skillName) : [...prev, skillName]
    );
  };

  const handleClearAll = () => {
    setSelectedSkills([]);
    setHasAnalyzed(false);
    setResults([]);
    setTopRole(null);
    setErrorMsg('');
  };

  // Run AI Role Analyzer Engine
  const handleAnalyzeSkills = async () => {
    if (selectedSkills.length < 3) {
      setErrorMsg('Please select at least 3 skills for a meaningful analysis.');
      return;
    }

    setErrorMsg('');
    setAnalyzing(true);
    setStepIndex(0);

    // Step animation loop
    const interval = setInterval(() => {
      setStepIndex((prev) => {
        if (prev < ANALYSIS_STEPS.length - 1) return prev + 1;
        clearInterval(interval);
        return prev;
      });
    }, 400);

    try {
      const res = await fetch('/api/role-analyzer/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skills: selectedSkills }),
      });

      const data = await res.json();
      if (data.success && Array.isArray(data.matches)) {
        setTimeout(() => {
          setResults(data.matches);
          setTopRole(data.topRole);
          setCareerPath(data.careerPath);
          setHasAnalyzed(true);
          setAnalyzing(false);
        }, 1800);
      } else {
        setErrorMsg(data.error || 'Role analysis failed.');
        setAnalyzing(false);
      }
    } catch (err) {
      setErrorMsg('Network error during analysis. Please try again.');
      setAnalyzing(false);
    }
  };

  // Save profile to LocalStorage
  const handleSaveProfile = () => {
    try {
      localStorage.setItem(
        '_role_analyzer_saved_profile',
        JSON.stringify({
          skills: selectedSkills,
          topRole: topRole?.roleName,
          score: topRole?.score,
          timestamp: new Date().toISOString(),
        })
      );
      setSavedSuccessMsg('Skill profile saved to your local session!');
      setTimeout(() => setSavedSuccessMsg(''), 4000);
    } catch {}
  };

  const top4Matches = results.slice(0, 4);
  const secondaryMatches = results.slice(4, 8);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Navbar */}
      <header className="border-b bg-card/70 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3.5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-extrabold text-lg shadow-md">
              IT
            </div>
            <span className="text-lg font-bold tracking-tight">IT Career Hub</span>
          </Link>
          <nav className="hidden md:flex items-center gap-2">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="text-xs font-semibold">My Dashboard</Button>
            </Link>
            <Link href="/opportunities">
              <Button variant="ghost" size="sm" className="text-xs font-semibold">Opportunities</Button>
            </Link>
            <Link href="/project-interview">
              <Button variant="ghost" size="sm" className="text-xs font-semibold">Project Interview</Button>
            </Link>
            <Link href="/role-analyzer">
              <Button variant="default" size="sm" className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md">
                <BrainCircuit className="h-3.5 w-3.5 mr-1.5" /> ROLE ANALYZER
              </Button>
            </Link>
            <Link href="/compare">
              <Button variant="ghost" size="sm" className="text-xs font-semibold">Compare Roles</Button>
            </Link>
            <Link href="/companies">
              <Button variant="ghost" size="sm" className="text-xs font-semibold">Companies</Button>
            </Link>
            <Link href="/admin/data-management">
              <Button variant="outline" size="sm" className="text-xs font-semibold">Admin</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 flex-1 max-w-6xl space-y-10">

        {/* HERO SECTION */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <Badge variant="outline" className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 font-bold px-3 py-1">
            <Sparkles className="h-3.5 w-3.5 mr-1.5" /> DISCOVERY-FIRST AI ROLE MATCHING
          </Badge>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
            Which IT Role Fits You?
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
            Select the technologies, tools, and skills you already know. AI will analyze your technology combinations and discover the best-fit IT careers for your skill profile.
          </p>
        </div>

        {/* SECTION 1: SKILL SELECTION */}
        <Card className="border-2 border-primary/20 shadow-xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-primary/5 via-purple-500/5 to-blue-500/5 border-b pb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl font-extrabold flex items-center gap-2">
                  <Cpu className="h-5 w-5 text-primary" /> SELECT WHAT YOU KNOW
                </CardTitle>
                <CardDescription className="text-xs mt-1">
                  Choose the technologies, tools and skills you are comfortable working with.
                </CardDescription>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="🔍 Search skills (e.g. React, MongoDB)..."
                  className="pl-9 text-xs bg-background"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2.5 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Category Filter Tabs */}
            <div className="flex items-center gap-1.5 flex-wrap pt-4">
              <Button
                variant={activeCategory === 'ALL' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveCategory('ALL')}
                className="text-[11px] h-7 px-3 font-semibold"
              >
                All Skills ({SKILLS_CATALOG.length})
              </Button>
              {SKILL_CATEGORIES.map((cat) => (
                <Button
                  key={cat}
                  variant={activeCategory === cat ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveCategory(cat)}
                  className="text-[11px] h-7 px-2.5 font-semibold"
                >
                  {cat}
                </Button>
              ))}
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            {/* Skill Chips Grid */}
            <div className="flex flex-wrap gap-2 max-h-[380px] overflow-y-auto p-2 border rounded-xl bg-muted/20">
              {filteredSkills.map((skill) => {
                const isSelected = selectedSkills.includes(skill.name);
                return (
                  <button
                    key={skill.id}
                    onClick={() => toggleSkill(skill.name)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border shadow-sm ${
                      isSelected
                        ? 'bg-primary text-primary-foreground border-primary shadow-md scale-105'
                        : 'bg-card hover:bg-muted text-foreground border-border hover:border-primary/40'
                    }`}
                  >
                    {isSelected ? (
                      <Check className="h-3.5 w-3.5 text-primary-foreground font-bold" />
                    ) : (
                      <span className="text-muted-foreground text-[10px]">•</span>
                    )}
                    <span>{skill.name}</span>
                    {skill.popular && !isSelected && (
                      <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono uppercase">Pop</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* SECTION 2: SELECTED SKILLS PANEL */}
            <div className="p-5 rounded-2xl bg-card border shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-purple-600" />
                  <h3 className="font-extrabold text-sm uppercase tracking-tight">YOUR SKILL PROFILE</h3>
                  <Badge variant="secondary" className="bg-purple-500/10 text-purple-600 font-extrabold text-xs">
                    {selectedSkills.length} selected
                  </Badge>
                </div>

                <div className="flex items-center gap-2">
                  {selectedSkills.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={handleClearAll} className="text-xs text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Clear All
                    </Button>
                  )}
                  {hasAnalyzed && (
                    <Button variant="outline" size="sm" onClick={handleSaveProfile} className="text-xs font-bold text-emerald-600">
                      <Save className="h-3.5 w-3.5 mr-1" /> Save Profile
                    </Button>
                  )}
                </div>
              </div>

              {/* Selected Badges List */}
              {selectedSkills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {selectedSkills.map((sk) => {
                    const isFromProject = projectEvidenceSkills.includes(sk);
                    return (
                      <Badge key={sk} variant="secondary" className="px-3 py-1 text-xs font-semibold flex items-center gap-1.5 bg-primary/10 text-primary border border-primary/20">
                        <span>{sk}</span>
                        {isFromProject && (
                          <span className="text-[9px] bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-1 rounded font-mono" title="Project Evidence Detected">
                            Project
                          </span>
                        )}
                        <button onClick={() => toggleSkill(sk)} className="hover:text-destructive ml-1">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-muted-foreground space-y-1">
                  <p className="font-bold text-foreground">YOUR ROLE MATCH IS WAITING</p>
                  <p>Select at least 3 skills above to discover your strongest IT role matches.</p>
                </div>
              )}

              {savedSuccessMsg && (
                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" /> {savedSuccessMsg}
                </div>
              )}

              {errorMsg && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold">
                  {errorMsg}
                </div>
              )}

              {/* ANALYZE BUTTON */}
              <div className="pt-2 flex justify-end">
                <Button
                  onClick={handleAnalyzeSkills}
                  disabled={selectedSkills.length < 3 || analyzing}
                  className="font-extrabold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg text-sm px-6 py-5 rounded-xl"
                >
                  {analyzing ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> ANALYZING YOUR SKILLS...
                    </>
                  ) : (
                    <>
                      <BrainCircuit className="h-5 w-5 mr-2" /> ANALIZE MY ROLE <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SECTION 3: AI ANALYSIS ANIMATION OVERLAY */}
        {analyzing && (
          <Card className="border-2 border-purple-500/30 shadow-2xl p-8 max-w-2xl mx-auto text-center space-y-6 bg-gradient-to-b from-purple-500/5 to-background">
            <div className="relative inline-flex items-center justify-center">
              <div className="h-20 w-20 rounded-full bg-purple-500/10 border-2 border-purple-500/30 flex items-center justify-center animate-pulse">
                <BrainCircuit className="h-10 w-10 text-purple-600 animate-spin" style={{ animationDuration: '3s' }} />
              </div>
            </div>

            <div className="space-y-2">
              <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/20 font-extrabold px-3 py-1">
                AI SKILL COMBINATION ANALYSIS ENGINE
              </Badge>
              <h2 className="text-xl font-bold tracking-tight uppercase">ANALYZING YOUR SKILL PROFILE...</h2>
            </div>

            <div className="space-y-3 text-left max-w-md mx-auto p-4 rounded-xl border bg-card">
              {ANALYSIS_STEPS.map((step, idx) => {
                const isDone = idx < stepIndex;
                const isCurrent = idx === stepIndex;
                return (
                  <div key={idx} className="flex items-center justify-between text-xs py-1">
                    <div className="flex items-center gap-2.5">
                      {isDone ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      ) : isCurrent ? (
                        <RefreshCw className="h-4 w-4 text-purple-600 animate-spin shrink-0" />
                      ) : (
                        <div className="h-4 w-4 rounded-full border border-muted-foreground/30 shrink-0" />
                      )}
                      <span className={isDone ? 'font-semibold text-foreground' : isCurrent ? 'font-bold text-purple-600' : 'text-muted-foreground'}>
                        {step}
                      </span>
                    </div>
                    {isDone && <span className="text-[10px] text-emerald-500 font-bold">Done ✓</span>}
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* SECTION 4: RESULTS DASHBOARD */}
        {hasAnalyzed && !analyzing && topRole && (
          <div className="space-y-8 animate-in fade-in duration-500">

            {/* HEADER BANNER */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
              <div>
                <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold px-3 py-1 mb-1">
                  ✓ YOUR CAREER FIT IS READY
                </Badge>
                <h2 className="text-2xl font-extrabold">YOUR BEST-FIT IT ROLES</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Based on your {selectedSkills.length} selected technologies and skill combinations</p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant={showComparison ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setShowComparison(!showComparison)}
                  className="text-xs font-extrabold"
                >
                  <BarChart3 className="h-4 w-4 mr-1.5" /> {showComparison ? 'Hide Comparison' : 'COMPARE TOP ROLES'}
                </Button>
              </div>
            </div>

            {/* TOP 4 ROLE MATCH CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {top4Matches.map((roleMatch, idx) => {
                const isTop1 = idx === 0;
                const isExpanded = expandedRoleId === roleMatch.roleId;

                return (
                  <Card
                    key={roleMatch.roleId}
                    className={`border-2 shadow-lg transition-all ${
                      isTop1 ? 'border-purple-500/40 bg-gradient-to-b from-purple-500/5 to-card' : 'border-border bg-card'
                    }`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          {isTop1 && (
                            <Badge className="bg-purple-600 text-white font-extrabold text-[10px] uppercase mb-1.5">
                              👑 #1 BEST MATCH
                            </Badge>
                          )}
                          <CardTitle className="text-lg font-extrabold">{roleMatch.roleName}</CardTitle>
                          <CardDescription className="text-xs line-clamp-2 mt-0.5">{roleMatch.description}</CardDescription>
                        </div>

                        {/* Match Score Badge */}
                        <div className="text-right shrink-0">
                          <div className="text-2xl font-black text-purple-600 dark:text-purple-400">
                            {roleMatch.score}%
                          </div>
                          <span className="text-[10px] font-bold text-muted-foreground uppercase">MATCH</span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-3 space-y-1">
                        <Progress value={roleMatch.score} className="h-2.5 bg-muted" />
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4 text-xs">
                      {/* Why You Fit Explanation */}
                      <div className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/20 space-y-1">
                        <span className="font-extrabold text-purple-600 dark:text-purple-400 uppercase text-[10px] flex items-center gap-1">
                          <Zap className="h-3 w-3" /> Why You Fit:
                        </span>
                        <p className="text-foreground leading-relaxed">
                          {roleMatch.aiExplanation || roleMatch.whyFits?.skillCombinationReason}
                        </p>
                      </div>

                      {/* Matched Skills */}
                      <div>
                        <span className="font-bold text-muted-foreground uppercase text-[10px] block mb-1">Matched Skills ({roleMatch.matchedSkills.length})</span>
                        <div className="flex flex-wrap gap-1">
                          {roleMatch.matchedSkills.map((sk) => (
                            <Badge key={sk} variant="secondary" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[10px]">
                              ✓ {sk}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Missing / Weaker Skills */}
                      {roleMatch.missingSkills.length > 0 && (
                        <div>
                          <span className="font-bold text-muted-foreground uppercase text-[10px] block mb-1">Skills to Strengthen</span>
                          <div className="flex flex-wrap gap-1">
                            {roleMatch.missingSkills.slice(0, 3).map((sk) => (
                              <Badge key={sk} variant="outline" className="text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px]">
                                ○ {sk}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Expandable Match Breakdown Trigger */}
                      <div className="pt-2 flex justify-between items-center border-t">
                        <button
                          onClick={() => setExpandedRoleId(isExpanded ? null : roleMatch.roleId)}
                          className="text-primary font-bold hover:underline flex items-center gap-1 text-xs"
                        >
                          {isExpanded ? 'Hide Match Breakdown' : 'View Match Breakdown'}
                          {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </button>

                        <Link href="/compare">
                          <Button variant="ghost" size="sm" className="h-7 text-[11px] font-bold">
                            View Role <ArrowRight className="h-3 w-3 ml-1" />
                          </Button>
                        </Link>
                      </div>

                      {/* EXPANDABLE MATCH BREAKDOWN DETAILS */}
                      {isExpanded && (
                        <div className="p-4 rounded-xl bg-muted/40 border space-y-3 animate-in slide-in-from-top-2 duration-300">
                          <h4 className="font-extrabold uppercase text-[11px] text-foreground">CATEGORY COMPATIBILITY BREAKDOWN</h4>

                          <div className="space-y-2">
                            <div>
                              <div className="flex justify-between text-[11px] mb-1">
                                <span>Frontend Development</span>
                                <span className="font-bold">{roleMatch.breakdown.frontend}%</span>
                              </div>
                              <Progress value={roleMatch.breakdown.frontend} className="h-1.5" />
                            </div>

                            <div>
                              <div className="flex justify-between text-[11px] mb-1">
                                <span>Backend Development</span>
                                <span className="font-bold">{roleMatch.breakdown.backend}%</span>
                              </div>
                              <Progress value={roleMatch.breakdown.backend} className="h-1.5" />
                            </div>

                            <div>
                              <div className="flex justify-between text-[11px] mb-1">
                                <span>Database Engineering</span>
                                <span className="font-bold">{roleMatch.breakdown.database}%</span>
                              </div>
                              <Progress value={roleMatch.breakdown.database} className="h-1.5" />
                            </div>

                            <div>
                              <div className="flex justify-between text-[11px] mb-1">
                                <span>API Design & Services</span>
                                <span className="font-bold">{roleMatch.breakdown.apiDevelopment}%</span>
                              </div>
                              <Progress value={roleMatch.breakdown.apiDevelopment} className="h-1.5" />
                            </div>

                            <div>
                              <div className="flex justify-between text-[11px] mb-1">
                                <span>DevOps & Infrastructure</span>
                                <span className="font-bold">{roleMatch.breakdown.devOps}%</span>
                              </div>
                              <Progress value={roleMatch.breakdown.devOps} className="h-1.5" />
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* SECTION 5: TOP ROLES COMPARISON MATRIX */}
            {showComparison && (
              <Card className="border-2 border-primary/30 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-lg font-extrabold flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" /> TOP ROLES COMPARISON MATRIX
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Side-by-side technical comparison showing why certain roles rank higher based on your selected skills.
                  </CardDescription>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="p-3 font-bold">SKILL / CATEGORY</th>
                        {top4Matches.slice(0, 3).map((r) => (
                          <th key={r.roleId} className="p-3 font-extrabold text-primary">
                            {r.roleName}
                            <span className="block text-[10px] font-normal text-muted-foreground">{r.score}% Match</span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSkills.map((sk) => (
                        <tr key={sk} className="border-b hover:bg-muted/20">
                          <td className="p-3 font-semibold">{sk}</td>
                          {top4Matches.slice(0, 3).map((r) => {
                            const isMatched = r.matchedSkills.includes(sk);
                            return (
                              <td key={r.roleId} className="p-3">
                                {isMatched ? (
                                  <span className="text-emerald-500 font-bold flex items-center gap-1">
                                    <Check className="h-4 w-4" /> Covered
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground text-[11px]">—</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}

            {/* SECTION 6: YOU MAY ALSO LIKE */}
            {secondaryMatches.length > 0 && (
              <Card className="border shadow-md">
                <CardHeader>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Layers className="h-5 w-5 text-indigo-500" /> OTHER ROLES WORTH EXPLORING
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Secondary IT career options that share related technology skills
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {secondaryMatches.map((role) => (
                    <div key={role.roleId} className="p-3.5 rounded-xl border bg-card space-y-2 shadow-sm hover:border-primary/40 transition-all">
                      <div className="flex justify-between items-center">
                        <span className="font-extrabold text-xs">{role.roleName}</span>
                        <Badge variant="secondary" className="text-[10px] font-bold">
                          {role.score}%
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-2">{role.description}</p>
                      <div className="pt-1 flex justify-end">
                        <Link href="/compare">
                          <span className="text-[10px] font-bold text-primary hover:underline flex items-center">
                            Explore <ArrowRight className="h-3 w-3 ml-0.5" />
                          </span>
                        </Link>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* SECTION 7: PERSONALIZED CAREER PATH */}
            {careerPath && (
              <Card className="border-2 border-emerald-500/30 bg-gradient-to-r from-emerald-500/5 via-teal-500/5 to-card shadow-xl">
                <CardHeader>
                  <Badge variant="secondary" className="w-fit bg-emerald-500/10 text-emerald-600 font-extrabold text-xs mb-1">
                    🚀 PERSONALIZED ACTION PLAN
                  </Badge>
                  <CardTitle className="text-xl font-extrabold flex items-center gap-2">
                    YOUR POSSIBLE CAREER PATH FOR {careerPath.topRoleName.toUpperCase()}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Recommended step-by-step path to transition from your current skills to landing a job.
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-6 space-y-6">
                  {/* Flowchart Diagram */}
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-center">
                    <div className="p-3.5 rounded-xl bg-card border shadow-sm space-y-1">
                      <span className="text-[10px] font-extrabold text-muted-foreground uppercase block">1. Current Skills</span>
                      <div className="flex flex-wrap justify-center gap-1">
                        {careerPath.currentSkills.slice(0, 3).map((sk: string) => (
                          <Badge key={sk} variant="outline" className="text-[10px]">{sk}</Badge>
                        ))}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/30 shadow-sm space-y-1">
                      <span className="text-[10px] font-extrabold text-purple-600 uppercase block">2. Best Match</span>
                      <span className="font-extrabold text-xs text-foreground block">{careerPath.topRoleName} ({careerPath.matchScore}%)</span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 shadow-sm space-y-1">
                      <span className="text-[10px] font-extrabold text-amber-600 uppercase block">3. Strengthen</span>
                      <div className="flex flex-wrap justify-center gap-1">
                        {careerPath.skillsToStrengthen.map((sk: string) => (
                          <Badge key={sk} variant="secondary" className="text-[10px] bg-amber-500/20 text-amber-700">{sk}</Badge>
                        ))}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/30 shadow-sm space-y-1">
                      <span className="text-[10px] font-extrabold text-blue-600 uppercase block">4. Project Defense</span>
                      <span className="text-[11px] font-bold text-foreground block">Build & Ingest README</span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 shadow-sm space-y-1">
                      <span className="text-[10px] font-extrabold text-emerald-600 uppercase block">5. Job Search</span>
                      <span className="text-[11px] font-bold text-foreground block">Apply Opportunities</span>
                    </div>
                  </div>

                  {/* Interconnected CTA Buttons */}
                  <div className="pt-4 border-t flex flex-wrap items-center justify-between gap-4">
                    <div className="text-xs text-muted-foreground">
                      <span>Ready to test your readiness for <strong>{careerPath.topRoleName}</strong>?</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <Link href="/project-interview">
                        <Button variant="outline" size="sm" className="text-xs font-bold">
                          <FolderGit2 className="h-4 w-4 mr-1.5" /> Project Interview Prep
                        </Button>
                      </Link>
                      <Link href="/opportunities">
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold">
                          <Rocket className="h-4 w-4 mr-1.5" /> Explore {careerPath.topRoleName} Jobs
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>

      <footer className="border-t py-6 bg-card text-center text-xs text-muted-foreground mt-auto">
        <div className="container mx-auto px-4">
          <p>© 2026 IT Career Hub • Discovery-First AI Role Analyzer Engine</p>
        </div>
      </footer>
    </div>
  );
}
