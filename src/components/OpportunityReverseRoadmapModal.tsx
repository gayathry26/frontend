'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { X, CheckCircle2, AlertCircle, ArrowRight, BookOpen, ExternalLink, Sparkles } from 'lucide-react';
import { EventDocument } from '@/backend/types/event';

interface ModalProps {
  event: EventDocument;
  onClose: () => void;
}

export function OpportunityReverseRoadmapModal({ event, onClose }: ModalProps) {
  // Mock student skills set
  const [studentSkills, setStudentSkills] = useState<Set<string>>(new Set(['JavaScript', 'React', 'Git', 'Python']));

  const eventSkills = event.careerRoleMatches?.[0]?.requiredSkills || ['JavaScript', 'APIs', 'Git', 'Problem Solving'];
  const known = eventSkills.filter(s => studentSkills.has(s));
  const missing = eventSkills.filter(s => !studentSkills.has(s));

  const applyScore = eventSkills.length > 0 ? Math.round((known.length / eventSkills.length) * 100) : 75;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border rounded-2xl max-w-xl w-full p-6 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="space-y-1">
          <Badge variant="outline" className="text-xs border-primary/30 text-primary font-bold">
            PREPARE FOR THIS OPPORTUNITY
          </Badge>
          <h3 className="text-xl font-extrabold text-foreground">{event.title}</h3>
          <p className="text-xs text-muted-foreground">{event.organization?.name} • {event.location?.city}, {event.location?.state}</p>
        </div>

        {/* "CAN I APPLY?" SCORE GAUGE */}
        <div className="p-4 rounded-xl border bg-gradient-to-br from-indigo-500/10 to-card space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-foreground">"Can I Apply?" Readiness Estimate</span>
            <span className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">{applyScore}%</span>
          </div>
          <Progress value={applyScore} className="h-3" />
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
            <span>You match {known.length} of {eventSkills.length} relevant skill requirements for this opportunity.</span>
          </p>
        </div>

        {/* REVERSE ROADMAP STEPS */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Preparation Roadmap Before Applying:
          </h4>

          <div className="space-y-3">
            {/* Step 1: Known Skills */}
            <div className="p-3.5 rounded-xl border bg-emerald-500/5 border-emerald-500/20 space-y-1.5">
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" />
                Step 1: Matched Core Skills ({known.length})
              </span>
              <div className="flex flex-wrap gap-1">
                {known.map(s => (
                  <Badge key={s} variant="secondary" className="text-[11px] bg-emerald-500/10 text-emerald-700">✓ {s}</Badge>
                ))}
              </div>
            </div>

            {/* Step 2: Missing Skills & Learning */}
            <div className="p-3.5 rounded-xl border bg-amber-500/5 border-amber-500/20 space-y-1.5">
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4" />
                Step 2: Quick Learning Focus ({missing.length})
              </span>
              {missing.length > 0 ? (
                <div className="text-xs text-muted-foreground space-y-1">
                  <p><strong className="text-foreground">Missing:</strong> {missing.join(', ')}</p>
                  <p className="text-[11px] italic text-amber-600">Review docs & build a 1-day MVP project to cover these gaps.</p>
                </div>
              ) : (
                <p className="text-xs text-emerald-600 font-bold">🎉 Fully prepared! Submit your application today.</p>
              )}
            </div>

            {/* Step 3: Application */}
            <div className="p-3.5 rounded-xl border bg-blue-500/5 border-blue-500/20 space-y-2">
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                <BookOpen className="h-4 w-4" />
                Step 3: Official Registration
              </span>
              <p className="text-xs text-muted-foreground">
                Deadline: <strong className="text-foreground">{event.dateInfo?.registrationDeadline || 'Closing Soon'}</strong>
              </p>
              {event.registrationURL ? (
                <a
                  href={event.registrationURL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition shadow-sm"
                >
                  Register Directly on Official Site <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : (
                <span className="text-xs text-amber-600 font-semibold italic">
                  Registration link unavailable
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
