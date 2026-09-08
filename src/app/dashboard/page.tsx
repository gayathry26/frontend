'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Briefcase, Target, Sparkles, CheckCircle2, AlertCircle, Bookmark, Calendar, Award, Code, HelpCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { type ITRole } from '@/data/itRoles';

export default function StudentDashboardPage() {
  const [roles, setRoles] = useState<ITRole[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('full-stack-developer');
  const [collegeYear, setCollegeYear] = useState<string>('3rd Year');
  const [selectedSkills, setSelectedSkills] = useState<Set<string>>(new Set(['JavaScript', 'React', 'Git', 'HTML', 'CSS']));
  const [nextActions, setNextActions] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/roles', { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        if (data.roles && Array.isArray(data.roles)) {
          setRoles(data.roles);
        }
      })
      .catch(err => console.error('Error fetching roles for dashboard:', err));
  }, []);

  useEffect(() => {
    fetch('/api/student/decision-engine', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        collegeYear,
        targetRoleId: selectedRoleId,
        currentSkills: Array.from(selectedSkills)
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data?.nextActions) {
          setNextActions(data.data.nextActions);
        }
      })
      .catch(err => console.error('Error loading decision engine actions:', err));
  }, [selectedRoleId, selectedSkills, collegeYear]);

  const activeRole = roles.find(r => r.id === selectedRoleId) || roles[0];

  const techSkills = activeRole?.technicalSkills || ['JavaScript', 'React', 'Node.js', 'Python', 'SQL', 'Git'];
  const softSkills = activeRole?.softSkills || ['Problem Solving', 'Communication'];
  const tools = activeRole?.tools || ['VS Code', 'GitHub', 'Docker', 'Postman', 'Jira'];

  const allReqs = [...techSkills, ...softSkills, ...tools];
  const knownCount = allReqs.filter(s => selectedSkills.has(s)).length;
  const readinessScore = allReqs.length > 0 ? Math.round((knownCount / allReqs.length) * 100) : 0;

  const toggleSkill = (skill: string) => {
    const next = new Set(selectedSkills);
    if (next.has(skill)) next.delete(skill);
    else next.add(skill);
    setSelectedSkills(next);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">IT Career Hub</span>
          </Link>
          <nav className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button variant="default" className="bg-blue-600 hover:bg-blue-700 text-white font-medium" size="sm">My Dashboard</Button>
            </Link>
            <Link href="/opportunities">
              <Button variant="outline" size="sm">Opportunities</Button>
            </Link>
            <Link href="/project-interview">
              <Button variant="outline" size="sm">Project Interview</Button>
            </Link>
            <Link href="/role-analyzer">
              <Button variant="default" size="sm" className="bg-purple-600 hover:bg-purple-700 text-white font-medium">Role Analyzer</Button>
            </Link>
            <Link href="/compare">
              <Button variant="outline" size="sm">Compare Roles</Button>
            </Link>
            <Link href="/companies">
              <Button variant="outline" size="sm">Companies</Button>
            </Link>
            <Link href="/admin/data-management">
              <Button variant="outline" size="sm">Admin</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Banner */}
        <div className="bg-gradient-to-r from-primary/15 via-primary/5 to-background border rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <Badge variant="secondary" className="bg-primary/10 text-primary">Student Portal</Badge>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">My Career Dashboard</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Track your career readiness, manage target role skills, and access personalized opportunities & interview prep.
            </p>
          </div>

          <Card className="w-full md:w-72 bg-card/80 shrink-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase text-muted-foreground">Select Target Role</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose Target Role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map(r => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>

        {/* Readiness Meter Card */}
        {activeRole && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-2 border-indigo-500/30 bg-gradient-to-br from-indigo-500/5 to-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                    <Target className="h-5 w-5" />
                    Target Role Readiness: {activeRole.title}
                  </CardTitle>
                  <span className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">{readinessScore}%</span>
                </div>
                <CardDescription>
                  Your current match score based on mastered technical skills, soft skills, and tools.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Progress value={readinessScore} className="h-3" />
                <p className="text-xs text-muted-foreground">
                  You have completed {knownCount} out of {allReqs.length} required competencies for {activeRole.title}.
                </p>

                <div className="pt-2">
                  <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2">Check off mastered skills:</h4>
                  <div className="flex flex-wrap gap-2">
                    {allReqs.map(s => {
                      const isKnown = selectedSkills.has(s);
                      return (
                        <button
                          key={s}
                          onClick={() => toggleSkill(s)}
                          className={`text-xs px-2.5 py-1 rounded-lg font-medium border transition ${
                            isKnown ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-muted/40 text-muted-foreground border-border hover:bg-muted'
                          }`}
                        >
                          {isKnown ? '✓ ' : '+ '}{s}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Decision Engine Card: YOUR NEXT BEST 3 ACTIONS */}
            <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-card flex flex-col justify-between">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base text-amber-600 dark:text-amber-400">
                    <Sparkles className="h-4 w-4" />
                    YOUR NEXT BEST 3 ACTIONS
                  </CardTitle>
                  <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-600 font-bold">
                    Career Intelligence
                  </Badge>
                </div>
                <CardDescription className="text-xs">
                  AI-driven next steps based on target role, current skills, and opportunity deadlines.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                {nextActions.length > 0 ? (
                  nextActions.map((act, idx) => (
                    <div key={act.id} className="p-3 rounded-xl border bg-card/80 space-y-1 hover:border-amber-500/40 transition">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center text-[10px]">
                            {idx + 1}
                          </span>
                          {act.title}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-2">{act.description}</p>
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold block pt-0.5">
                        ↳ {act.reason}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground italic">Analyzing profile and generating next best actions...</p>
                )}
                <Link href={`/roles/${activeRole.id}`}>
                  <Button size="sm" className="w-full mt-2 text-xs bg-amber-600 hover:bg-amber-500 text-white">
                    Execute Next Best Actions <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Personalized Opportunities & Resources */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Saved & Recommended Events */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Bookmark className="h-4 w-4 text-blue-500" />
                Recommended Hackathons & Contests
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="p-3 rounded-lg border flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-foreground">National Student Hackathons 2026</h4>
                  <p className="text-muted-foreground">Hackathons, CTFs & Coding Contests for {activeRole?.title}</p>
                </div>
                <Link href="/opportunities">
                  <Button size="sm" variant="outline" className="text-xs">Explore Hub →</Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Interview Prep Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <HelpCircle className="h-4 w-4 text-purple-500" />
                Interview Prep & Practice
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="p-3 rounded-lg border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold">Role Interview Q&A</span>
                  <Badge variant="secondary" className="text-[10px]">Ready</Badge>
                </div>
                <p className="text-muted-foreground">Practice technical, scenario, and coding questions tailored for {activeRole?.title}.</p>
                <Link href={`/roles/${activeRole?.id}`}>
                  <Button size="sm" variant="ghost" className="text-xs text-purple-600 p-0 h-auto">Start Practice Questions →</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
