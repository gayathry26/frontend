'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { HelpCircle, ChevronDown, ChevronUp, CheckCircle, Award } from 'lucide-react';

interface InterviewQuestion {
  question: string;
  answer: string;
  category: string;
  difficulty: string;
}

interface RoleInterviewPrepProps {
  roleTitle: string;
  interviewQuestions?: InterviewQuestion[];
}

export function RoleInterviewPrep({
  roleTitle,
  interviewQuestions = []
}: RoleInterviewPrepProps) {
  const defaultQuestions: InterviewQuestion[] = [
    {
      question: `What are the core technical responsibilities of a ${roleTitle}?`,
      answer: `A ${roleTitle} is responsible for designing, building, and optimizing key systems using modern tools, frameworks, and architectural best practices.`,
      category: 'Technical',
      difficulty: 'Beginner'
    },
    {
      question: `How do you troubleshoot performance bottlenecks or system errors in ${roleTitle} workflows?`,
      answer: `Use systematic debugging, inspect log tracebacks, monitor resource utilization, and perform root-cause analysis before applying targeted optimization patches.`,
      category: 'Scenario',
      difficulty: 'Intermediate'
    },
    {
      question: `What industry tools or environments are essential for a ${roleTitle} daily workflow?`,
      answer: `Version control (Git/GitHub), containerization, automated testing frameworks, and role-specific IDE extensions.`,
      category: 'Technical',
      difficulty: 'Beginner'
    }
  ];

  const questionsToDisplay = interviewQuestions.length > 0 ? interviewQuestions : defaultQuestions;
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleQuestion = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-primary" />
          Interview Preparation & Q&A
        </CardTitle>
        <CardDescription>
          Frequently asked technical, scenario, and coding interview questions for {roleTitle}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {questionsToDisplay.map((q, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div key={idx} className="border rounded-xl bg-card/60 overflow-hidden transition">
              <button
                onClick={() => toggleQuestion(idx)}
                className="w-full p-4 text-left flex items-center justify-between gap-3 hover:bg-muted/50 transition"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] uppercase font-bold text-primary">
                      {q.category}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px]">
                      {q.difficulty}
                    </Badge>
                  </div>
                  <h4 className="font-semibold text-sm text-foreground">{q.question}</h4>
                </div>
                {isOpen ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />}
              </button>

              {isOpen && (
                <div className="p-4 bg-muted/30 border-t text-sm leading-relaxed text-muted-foreground space-y-2">
                  <strong className="text-foreground text-xs uppercase tracking-wider block">Recommended Answer Breakdown:</strong>
                  <p>{q.answer}</p>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
