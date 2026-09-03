"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Map, ChevronDown, ChevronUp, Milestone, Award, Code, FolderGit2 } from 'lucide-react';

interface RoadmapItem {
  stage: string;
  title?: string;
  skills?: string[];
  description?: string;
}

interface RoleCareerRoadmapProps {
  roleTitle: string;
  technicalSkills?: string[];
  tools?: string[];
  projects?: {
    beginner?: string[];
    intermediate?: string[];
    advanced?: string[];
  };
  roadmap?: RoadmapItem[];
}

type LevelKey = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

export function RoleCareerRoadmap({
  roleTitle,
  technicalSkills = [],
  tools = [],
  projects = { beginner: [], intermediate: [], advanced: [] },
  roadmap = []
}: RoleCareerRoadmapProps) {
  // Initial State: No level expanded by default (compact view)
  const [activeLevel, setActiveLevel] = useState<LevelKey | null>(null);

  const levels: Array<{ key: LevelKey; label: string; badgeColor: string; activeColor: string }> = [
    {
      key: 'BEGINNER',
      label: 'BEGINNER',
      badgeColor: 'border-emerald-500/30 text-emerald-700 bg-emerald-50 hover:bg-emerald-100',
      activeColor: 'ring-2 ring-emerald-500 bg-emerald-50 border-emerald-500 text-emerald-900 shadow-sm'
    },
    {
      key: 'INTERMEDIATE',
      label: 'INTERMEDIATE',
      badgeColor: 'border-blue-500/30 text-blue-700 bg-blue-50 hover:bg-blue-100',
      activeColor: 'ring-2 ring-blue-500 bg-blue-50 border-blue-500 text-blue-900 shadow-sm'
    },
    {
      key: 'ADVANCED',
      label: 'ADVANCED',
      badgeColor: 'border-purple-500/30 text-purple-700 bg-purple-50 hover:bg-purple-100',
      activeColor: 'ring-2 ring-purple-500 bg-purple-50 border-purple-500 text-purple-900 shadow-sm'
    }
  ];

  function toggleLevel(key: LevelKey) {
    if (activeLevel === key) {
      setActiveLevel(null); // Collapse if currently selected
    } else {
      setActiveLevel(key); // Open selected level & collapse previous
    }
  }

  // Get data for selected level
  function getLevelData(key: LevelKey) {
    const mongoItem = roadmap.find(r => r.stage?.toUpperCase() === key);

    let stageTitle = mongoItem?.title;
    let stageSkills: string[] = mongoItem?.skills || [];
    let stageMilestone = mongoItem?.description;

    // Fallback to role's technicalSkills, tools, and projects for that level if not explicitly defined in roadmap item
    if (key === 'BEGINNER') {
      if (!stageTitle) stageTitle = 'Foundational Knowledge';
      if (stageSkills.length === 0) {
        stageSkills = [...technicalSkills.slice(0, 3), ...tools.slice(0, 2)];
      }
      if (!stageMilestone) stageMilestone = projects?.beginner?.[0] || undefined;
    } else if (key === 'INTERMEDIATE') {
      if (!stageTitle) stageTitle = 'Practical Application';
      if (stageSkills.length === 0) {
        stageSkills = [...technicalSkills.slice(3, 6), ...tools.slice(2, 4)];
      }
      if (!stageMilestone) stageMilestone = projects?.intermediate?.[0] || undefined;
    } else if (key === 'ADVANCED') {
      if (!stageTitle) stageTitle = 'Mastery & Architecture';
      if (stageSkills.length === 0) {
        stageSkills = [...technicalSkills.slice(6), ...tools.slice(4)];
      }
      if (!stageMilestone) stageMilestone = projects?.advanced?.[0] || undefined;
    }

    const levelProjects = key === 'BEGINNER' 
      ? (projects?.beginner || []) 
      : key === 'INTERMEDIATE' 
      ? (projects?.intermediate || []) 
      : (projects?.advanced || []);

    return {
      stageTitle,
      stageSkills: stageSkills.filter(Boolean),
      stageMilestone,
      levelProjects
    };
  }

  return (
    <Card className="bg-card border shadow-sm rounded-xl">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl font-bold flex items-center gap-2">
          <Map className="h-5 w-5 text-primary" />
          Career Roadmap & Projects for {roleTitle}
        </CardTitle>
        <CardDescription className="text-xs">
          A structured path to learn the required skills and build practical projects.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* COMPACT SELECTABLE BOXES (3 LEVEL TABS) */}
        <div className="grid grid-cols-3 gap-3">
          {levels.map(level => {
            const isSelected = activeLevel === level.key;
            return (
              <button
                key={level.key}
                type="button"
                onClick={() => toggleLevel(level.key)}
                className={`p-3 rounded-lg border text-center font-bold text-xs transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer ${
                  isSelected ? level.activeColor : level.badgeColor
                }`}
                aria-expanded={isSelected}
                aria-label={`Toggle ${level.label} roadmap level`}
              >
                <span>{level.label}</span>
                {isSelected ? (
                  <ChevronUp className="h-3.5 w-3.5 shrink-0 opacity-80" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
                )}
              </button>
            );
          })}
        </div>

        {/* EXPANDED CONTENT CONTAINER */}
        {activeLevel && (
          <div className="pt-2 animate-in fade-in slide-in-from-top-1 duration-200">
            {(() => {
              const data = getLevelData(activeLevel);
              const hasRoadmapData = data.stageSkills.length > 0 || data.stageMilestone;

              return (
                <div className="p-5 rounded-xl border bg-slate-50/70 border-slate-200 space-y-5 text-xs">
                  {/* SUBSECTION A: CAREER ROADMAP */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b pb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-bold text-[10px] uppercase">
                          {activeLevel} STAGE
                        </Badge>
                        <h4 className="font-bold text-sm text-foreground">A. CAREER ROADMAP</h4>
                      </div>
                      <span className="text-xs text-muted-foreground font-semibold">{data.stageTitle}</span>
                    </div>

                    {!hasRoadmapData ? (
                      <p className="text-muted-foreground italic text-xs py-1">
                        No roadmap information available for this level yet.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {/* Skills & Tools to Master */}
                        <div className="space-y-1.5">
                          <strong className="text-foreground font-semibold flex items-center gap-1.5 text-xs">
                            <Award className="h-3.5 w-3.5 text-indigo-600" />
                            Skills & Tools to Master:
                          </strong>
                          {data.stageSkills.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5 pl-5">
                              {data.stageSkills.map((sk, sIdx) => (
                                <Badge key={sIdx} variant="secondary" className="text-[11px] bg-white border">
                                  {sk}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <p className="text-muted-foreground italic pl-5">No specific skills listed for this level.</p>
                          )}
                        </div>

                        {/* Key Milestone Project */}
                        {data.stageMilestone && (
                          <div className="space-y-1 pt-1 border-t border-slate-200/60">
                            <strong className="text-foreground font-semibold flex items-center gap-1.5 text-xs">
                              <Milestone className="h-3.5 w-3.5 text-emerald-600" />
                              Key Milestone Project:
                            </strong>
                            <p className="text-foreground pl-5 font-medium">{data.stageMilestone}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* SUBSECTION B: PROJECTS TO BUILD */}
                  <div className="space-y-3 pt-3 border-t border-slate-200">
                    <div className="flex items-center gap-2 border-b pb-2">
                      <FolderGit2 className="h-4 w-4 text-emerald-600" />
                      <h4 className="font-bold text-sm text-foreground">B. PROJECTS TO BUILD</h4>
                    </div>

                    {data.levelProjects.length === 0 ? (
                      <p className="text-muted-foreground italic text-xs py-1 pl-1">
                        No projects added yet.
                      </p>
                    ) : (
                      <ul className="space-y-2 pl-2">
                        {data.levelProjects.map((proj, idx) => (
                          <li key={idx} className="flex items-start gap-2.5 text-sm bg-white p-3 rounded-lg border shadow-2xs">
                            <span className="text-emerald-600 font-bold mt-0.5">•</span>
                            <span className="text-foreground font-medium text-xs leading-relaxed">{proj}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
