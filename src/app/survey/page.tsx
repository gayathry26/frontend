'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Briefcase, Send, CheckCircle2, Sparkles, Building2, Award, Wrench, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export default function ProfessionalSurveyPage() {
  const [roleTitle, setRoleTitle] = useState('Full-Stack Developer');
  const [yearsOfExperience, setYearsOfExperience] = useState('1-3 years');
  const [industry, setIndustry] = useState('SaaS / Cloud Software');
  const [techSkillsText, setTechSkillsText] = useState('React, Node.js, TypeScript, PostgreSQL, REST APIs');
  const [softSkillsText, setSoftSkillsText] = useState('Problem Solving, Code Review, Team Collaboration');
  const [toolsText, setToolsText] = useState('VS Code, GitHub, Docker, Postman, Jira');
  const [recSkillsText, setRecSkillsText] = useState('TypeScript, Automated Testing, CI/CD');

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch('/api/survey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roleTitle,
          yearsOfExperience,
          industry,
          technicalSkills: techSkillsText.split(',').map(s => s.trim()).filter(Boolean),
          softSkills: softSkillsText.split(',').map(s => s.trim()).filter(Boolean),
          tools: toolsText.split(',').map(s => s.trim()).filter(Boolean),
          recommendedSkills: recSkillsText.split(',').map(s => s.trim()).filter(Boolean)
        })
      });
      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
      }
    } catch (err) {
      console.error('Failed to submit survey:', err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">IT Career Hub</span>
          </Link>
          <Link href="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" /> Home
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
        {submitted ? (
          <Card className="border-emerald-500/30 bg-emerald-500/5 text-center p-8 space-y-4">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
            <h2 className="text-2xl font-extrabold text-foreground">Thank You for Contributing!</h2>
            <p className="text-sm text-muted-foreground">
              Your real workplace experience has been submitted to MongoDB Atlas. Your insights directly help college students understand workplace reality versus generic roadmaps.
            </p>
            <Link href="/">
              <Button className="mt-4 bg-emerald-600 hover:bg-emerald-500 text-white">Back to Home</Button>
            </Link>
          </Card>
        ) : (
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background">
            <CardHeader>
              <Badge variant="secondary" className="w-fit bg-primary/10 text-primary mb-1">
                Verified IT Professionals
              </Badge>
              <CardTitle className="text-2xl font-bold">Share Your Professional Experience</CardTitle>
              <CardDescription>
                Help college students understand what tools, skills, and daily workflows are actually used in industry roles.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4 text-sm">
                <div>
                  <label className="font-semibold block mb-1">Your IT Role Title *</label>
                  <Input value={roleTitle} onChange={e => setRoleTitle(e.target.value)} placeholder="e.g. Full-Stack Developer, Cybersecurity Analyst" required />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="font-semibold block mb-1">Years of Experience</label>
                    <Input value={yearsOfExperience} onChange={e => setYearsOfExperience(e.target.value)} placeholder="e.g. 1-3 years, 5+ years" />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Industry / Sector</label>
                    <Input value={industry} onChange={e => setIndustry(e.target.value)} placeholder="e.g. SaaS, Fintech, E-Commerce" />
                  </div>
                </div>

                <div>
                  <label className="font-semibold block mb-1">Daily Technical Skills (comma-separated)</label>
                  <Input value={techSkillsText} onChange={e => setTechSkillsText(e.target.value)} placeholder="e.g. React, Node.js, Python, SQL" />
                </div>

                <div>
                  <label className="font-semibold block mb-1">Daily Tools & Platforms (comma-separated)</label>
                  <Input value={toolsText} onChange={e => setToolsText(e.target.value)} placeholder="e.g. VS Code, GitHub, Docker, Jira, Postman" />
                </div>

                <div>
                  <label className="font-semibold block mb-1">Top Recommended Skills for Students</label>
                  <Input value={recSkillsText} onChange={e => setRecSkillsText(e.target.value)} placeholder="e.g. TypeScript, Automated Testing, Git workflow" />
                </div>

                <Button type="submit" disabled={submitting} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold mt-2">
                  {submitting ? 'Submitting Insights...' : 'Submit Professional Survey'}
                  <Send className="h-4 w-4 ml-2" />
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
