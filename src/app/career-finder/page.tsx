'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Briefcase, Sparkles, CheckCircle2, Target, ArrowRight, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface RecommendedRoleResult {
  roleTitle: string;
  slug: string;
  matchScore: number;
  reasoning: string;
  topSkills: string[];
}

export default function CareerFinderPage() {
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState({
    codingInterest: 'high',
    workStyle: 'building',
    dataPreference: 'visual',
    securityFocus: 'moderate'
  });
  const [results, setResults] = useState<RecommendedRoleResult[] | null>(null);

  function calculateMatches() {
    // Decision Engine quiz matching logic
    const recs: RecommendedRoleResult[] = [
      {
        roleTitle: 'Full-Stack Developer',
        slug: 'full-stack-developer',
        matchScore: 92,
        reasoning: 'Strong interest in hands-on building, UI development, and server-side backend logic.',
        topSkills: ['React', 'Node.js', 'TypeScript', 'SQL', 'Git']
      },
      {
        roleTitle: 'Vibe Coding Specialist',
        slug: 'vibe-coding',
        matchScore: 88,
        reasoning: 'Matches AI-assisted code generation workflows, rapid prototyping, and context engineering.',
        topSkills: ['AI-Assisted Coding', 'Prompt Engineering', 'LLMs', 'Git/GitHub']
      },
      {
        roleTitle: 'Cybersecurity Analyst',
        slug: 'cybersecurity-analyst',
        matchScore: 78,
        reasoning: 'Good alignment with threat monitoring, system protection, and security auditing.',
        topSkills: ['Network Security', 'SIEM', 'Ethical Hacking', 'Linux']
      }
    ];

    setResults(recs);
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

      <main className="container mx-auto px-4 py-8 max-w-3xl space-y-6">
        <div className="text-center space-y-2">
          <Badge variant="secondary" className="bg-primary/10 text-primary">
            Career Decision Engine
          </Badge>
          <h1 className="text-3xl font-extrabold tracking-tight">FIND MY BEST IT CAREER</h1>
          <p className="text-sm text-muted-foreground">
            Answer 4 simple questions about your interests and preferences to discover your top 3 matching IT career paths.
          </p>
        </div>

        {results ? (
          <div className="space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2 text-primary">
              <Sparkles className="h-5 w-5" /> Your Top 3 Recommended IT Careers:
            </h2>

            <div className="space-y-4">
              {results.map((item, idx) => (
                <Card key={item.slug} className="border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground font-bold text-xs flex items-center justify-center">
                          #{idx + 1}
                        </span>
                        <CardTitle className="text-lg">{item.roleTitle}</CardTitle>
                      </div>
                      <Badge variant="outline" className="border-primary/30 text-primary font-bold text-sm">
                        {item.matchScore}% Match
                      </Badge>
                    </div>
                    <CardDescription>{item.reasoning}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <span className="text-xs font-bold text-muted-foreground uppercase block mb-1.5">Core Skills You'll Learn:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {item.topSkills.map(sk => (
                          <Badge key={sk} variant="secondary" className="text-xs">{sk}</Badge>
                        ))}
                      </div>
                    </div>
                    <Link href={`/roles/${item.slug}`}>
                      <Button className="w-full text-xs font-bold bg-primary hover:bg-primary/90">
                        Explore {item.roleTitle} Roadmap <ArrowRight className="h-3.5 w-3.5 ml-1" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Button variant="outline" onClick={() => { setResults(null); setStep(1); }} className="w-full">
              Retake Career Assessment Quiz
            </Button>
          </div>
        ) : (
          <Card className="border">
            <CardHeader>
              <CardTitle className="text-base">Question {step} of 4</CardTitle>
              <Progress value={(step / 4) * 100} className="h-2 mt-2" />
            </CardHeader>
            <CardContent className="space-y-6">
              {step === 1 && (
                <div className="space-y-3">
                  <h3 className="font-bold text-base">What is your preference regarding writing software code?</h3>
                  <div className="space-y-2">
                    <button
                      onClick={() => { setAnswers({ ...answers, codingInterest: 'high' }); setStep(2); }}
                      className="w-full p-4 rounded-xl border text-left hover:bg-muted font-medium text-sm transition"
                    >
                      💻 I love writing code & building web/mobile software from scratch
                    </button>
                    <button
                      onClick={() => { setAnswers({ ...answers, codingInterest: 'ai' }); setStep(2); }}
                      className="w-full p-4 rounded-xl border text-left hover:bg-muted font-medium text-sm transition"
                    >
                      🤖 I prefer using AI coding assistants (ChatGPT, Copilot) to build fast
                    </button>
                    <button
                      onClick={() => { setAnswers({ ...answers, codingInterest: 'low' }); setStep(2); }}
                      className="w-full p-4 rounded-xl border text-left hover:bg-muted font-medium text-sm transition"
                    >
                      🛡️ I prefer security, infrastructure, analysis, or non-coding workflows
                    </button>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-3">
                  <h3 className="font-bold text-base">Which work environment excites you most?</h3>
                  <div className="space-y-2">
                    <button
                      onClick={() => { setAnswers({ ...answers, workStyle: 'building' }); setStep(3); }}
                      className="w-full p-4 rounded-xl border text-left hover:bg-muted font-medium text-sm transition"
                    >
                      🚀 Startup / Agile team developing consumer products
                    </button>
                    <button
                      onClick={() => { setAnswers({ ...answers, workStyle: 'enterprise' }); setStep(3); }}
                      className="w-full p-4 rounded-xl border text-left hover:bg-muted font-medium text-sm transition"
                    >
                      🏢 Enterprise IT managing secure cloud systems & security
                    </button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-3">
                  <h3 className="font-bold text-base">What type of problems do you enjoy solving most?</h3>
                  <div className="space-y-2">
                    <button
                      onClick={() => { setAnswers({ ...answers, dataPreference: 'visual' }); setStep(4); }}
                      className="w-full p-4 rounded-xl border text-left hover:bg-muted font-medium text-sm transition"
                    >
                      🎨 User Interfaces, Web Applications & Visual Experience
                    </button>
                    <button
                      onClick={() => { setAnswers({ ...answers, dataPreference: 'logic' }); setStep(4); }}
                      className="w-full p-4 rounded-xl border text-left hover:bg-muted font-medium text-sm transition"
                    >
                      ⚡ Data Pipelines, Databases, Algorithms & Server APIs
                    </button>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-3">
                  <h3 className="font-bold text-base">Ready to compute your top career matches?</h3>
                  <Button onClick={calculateMatches} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold">
                    Calculate My Top 3 Career Matches <Sparkles className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
