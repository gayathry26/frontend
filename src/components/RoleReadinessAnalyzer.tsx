'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Target, Sparkles, AlertCircle, ArrowRight } from 'lucide-react';

interface RoleReadinessAnalyzerProps {
  roleTitle: string;
  technicalSkills: string[];
  softSkills: string[];
  tools: string[];
}

export function RoleReadinessAnalyzer({
  roleTitle,
  technicalSkills = [],
  softSkills = [],
  tools = []
}: RoleReadinessAnalyzerProps) {
  const allRoleSkills = [
    ...technicalSkills.map(s => ({ name: s, category: 'Technical' })),
    ...softSkills.map(s => ({ name: s, category: 'Soft' })),
    ...tools.map(t => ({ name: t, category: 'Tool' }))
  ];

  const [selectedSkills, setSelectedSkills] = useState<Set<string>>(new Set());

  const toggleSkill = (skillName: string) => {
    const updated = new Set(selectedSkills);
    if (updated.has(skillName)) {
      updated.delete(skillName);
    } else {
      updated.add(skillName);
    }
    setSelectedSkills(updated);
  };

  const totalCount = allRoleSkills.length;
  const knownCount = selectedSkills.size;
  const readinessPercent = totalCount > 0 ? Math.round((knownCount / totalCount) * 100) : 0;

  const missingTech = technicalSkills.filter(s => !selectedSkills.has(s));
  const missingSoft = softSkills.filter(s => !selectedSkills.has(s));
  const missingTools = tools.filter(t => !selectedSkills.has(t));

  return (
    <Card className="border-indigo-500/20 bg-gradient-to-br from-indigo-500/5 via-background to-background">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
            <Target className="h-5 w-5" />
            Role Readiness & Skill Gap Analyzer
          </CardTitle>
          <Badge variant="outline" className="text-xs border-indigo-500/30 text-indigo-600 font-bold">
            Interactive
          </Badge>
        </div>
        <CardDescription>
          Select the skills and tools you already know to calculate your career readiness score for {roleTitle}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Readiness Meter */}
        <div className="p-4 rounded-xl border bg-card/70 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">Readiness Score for {roleTitle}</span>
            <span className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">{readinessPercent}%</span>
          </div>
          <Progress value={readinessPercent} className="h-3" />
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
            <span>{knownCount} of {totalCount} total skills & tools mastered</span>
          </p>
        </div>

        {/* Skill Selection Grid */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Click skills you already know:
          </h4>
          <div className="flex flex-wrap gap-2">
            {allRoleSkills.map(item => {
              const isSelected = selectedSkills.has(item.name);
              return (
                <button
                  key={item.name}
                  onClick={() => toggleSkill(item.name)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-card hover:bg-muted text-foreground border-border'
                  }`}
                >
                  {isSelected && <CheckCircle2 className="h-3.5 w-3.5" />}
                  <span>{item.name}</span>
                  <span className={`text-[10px] opacity-70 px-1 rounded ${isSelected ? 'bg-indigo-700' : 'bg-muted-foreground/10'}`}>
                    {item.category}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Gap Breakdown */}
        {totalCount > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t">
            {/* Known Skills */}
            <div className="p-3.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20 space-y-2">
              <h5 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" />
                Skills You Already Know ({selectedSkills.size})
              </h5>
              {selectedSkills.size === 0 ? (
                <p className="text-xs text-muted-foreground italic">None selected yet. Click your skills above!</p>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {Array.from(selectedSkills).map(s => (
                    <Badge key={s} variant="secondary" className="text-[11px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                      ✓ {s}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Skills to Learn */}
            <div className="p-3.5 rounded-lg bg-amber-500/5 border border-amber-500/20 space-y-2">
              <h5 className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4" />
                Skills & Tools to Learn ({missingTech.length + missingSoft.length + missingTools.length})
              </h5>
              <div className="space-y-1.5 text-xs text-muted-foreground">
                {missingTech.length > 0 && (
                  <p><strong className="text-foreground">Technical:</strong> {missingTech.join(', ')}</p>
                )}
                {missingSoft.length > 0 && (
                  <p><strong className="text-foreground">Soft:</strong> {missingSoft.join(', ')}</p>
                )}
                {missingTools.length > 0 && (
                  <p><strong className="text-foreground">Tools:</strong> {missingTools.join(', ')}</p>
                )}
                {missingTech.length === 0 && missingSoft.length === 0 && missingTools.length === 0 && (
                  <p className="text-xs text-emerald-600 font-semibold">🎉 Outstanding! You match 100% of the requirements!</p>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
